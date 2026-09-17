import { describe, expect, it } from 'vitest';

import {
  SessionController,
  type NativeSessionEvent,
  type SessionAdapter,
} from '@/sessions/controller';
import { SftpController, type SftpAdapter } from '@/sftp/controller';
import { retainTerminalOutput, validateTerminalInput } from '@/terminal/bounds';

class Adapter implements SessionAdapter {
  private listener: ((event: NativeSessionEvent) => void) | undefined;
  created = 0;
  async createSession() {
    return `s-${++this.created}`;
  }
  async disconnect() {}
  subscribeSessionState(listener: (event: NativeSessionEvent) => void) {
    this.listener = listener;
    return { remove: () => (this.listener = undefined) };
  }
  emit(event: NativeSessionEvent) {
    this.listener?.(event);
  }
}

describe('stress and boundary behavior', () => {
  it('preserves Unicode and terminal escape sequences within byte limits', () => {
    const payload = 'żźłó 😀\u001b[31mred\u001b[0m\n';
    expect(() => validateTerminalInput(payload.repeat(500))).not.toThrow();
    expect(() => validateTerminalInput('😀'.repeat(4097))).toThrow('16 KiB');
    expect(retainTerminalOutput(`prefix-${payload.repeat(20_000)}`, 4096)).toContain(
      '\u001b[31mred',
    );
  });

  it('bounds long output deterministically without retaining the prefix', () => {
    const longLine = `start-${'x'.repeat(100_000)}-end`;
    const retained = retainTerminalOutput(longLine, 2048);
    expect(new TextEncoder().encode(retained).byteLength).toBeLessThanOrEqual(2048);
    expect(retained).toContain('-end');
    expect(retained).not.toContain('start-');
  });

  it('keeps four sessions isolated under combined ready/reconnect/output workload', async () => {
    const adapter = new Adapter();
    const sessions = new SessionController(adapter);
    const ids = await Promise.all(
      ['a', 'b', 'c', 'd'].map((pane) => sessions.create(pane, `server-${pane}`)),
    );
    for (const id of ids) {
      adapter.emit({ sessionId: id!, state: 'connecting' });
      adapter.emit({ sessionId: id!, state: 'connected' });
      adapter.emit({ sessionId: id!, state: 'ready' });
    }
    adapter.emit({ sessionId: ids[2]!, state: 'reconnecting', attempt: 2 });
    expect(sessions.snapshot()).toHaveLength(4);
    expect(sessions.forPane('c')).toMatchObject({ state: 'reconnecting', reconnectAttempt: 2 });
    expect(sessions.forPane('a')).toMatchObject({ state: 'ready' });
    expect(sessions.forPane('d')).toMatchObject({ state: 'ready' });
    sessions.dispose();
  });

  it('keeps concurrent transfers isolated by operation and integrity result', async () => {
    const native: SftpAdapter = {
      listDirectory: async () => [],
      renameRemote: async () => undefined,
      removeRemote: async () => undefined,
      removeRemoteDirectory: async () => undefined,
      createRemoteDirectory: async () => undefined,
      downloadFile: async (_session, path) => ({
        url: `file://${path}`,
        bytes: '11',
        sha256: 'download-hash',
      }),
      uploadFile: async (_session, _local, path) => ({
        bytes: path.endsWith('a') ? '7' : '9',
        sha256: `hash-${path}`,
      }),
      readText: async () => ({ text: '', fingerprint: '' }),
      writeText: async () => undefined,
    };
    const ids = ['transfer-a', 'transfer-b'];
    const controller = new SftpController(native, () => ids.shift()!);
    const [first, second] = await Promise.all([
      controller.upload('session-a', 'file:///a', '/remote/a'),
      controller.upload('session-b', 'file:///b', '/remote/b'),
    ]);
    expect(first).toMatchObject({
      id: 'transfer-a',
      remotePath: '/remote/a',
      bytes: '7',
      state: 'completed',
    });
    expect(second).toMatchObject({
      id: 'transfer-b',
      remotePath: '/remote/b',
      bytes: '9',
      state: 'completed',
    });
  });
});
