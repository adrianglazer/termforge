import { describe, expect, it } from 'vitest';

import {
  reconnectDelaySeconds,
  SessionController,
  type NativeSessionEvent,
  type SessionAdapter,
} from '@/sessions/controller';

class ControlledSessionAdapter implements SessionAdapter {
  readonly disconnected: string[] = [];
  readonly created: string[] = [];
  private listener: ((event: NativeSessionEvent) => void) | undefined;

  async createSession(): Promise<string> {
    const id = `session-${this.created.length + 1}`;
    this.created.push(id);
    return id;
  }

  async disconnect(sessionId: string): Promise<void> {
    this.disconnected.push(sessionId);
  }

  subscribeSessionState(listener: (event: NativeSessionEvent) => void) {
    this.listener = listener;
    return { remove: () => (this.listener = undefined) };
  }

  emit(event: NativeSessionEvent): void {
    this.listener?.(event);
  }
}

describe('controlled session controller', () => {
  it('keeps four independent pane sessions isolated', async () => {
    const adapter = new ControlledSessionAdapter();
    const sessions = new SessionController(adapter, () => '2026-09-17T00:00:00.000Z');
    const ids = await Promise.all(
      ['one', 'two', 'three', 'four'].map((paneId) => sessions.create(paneId, `server-${paneId}`)),
    );

    adapter.emit({ sessionId: ids[1]!, state: 'connecting' });
    adapter.emit({ sessionId: ids[1]!, state: 'connected' });
    adapter.emit({ sessionId: ids[1]!, state: 'ready' });

    expect(sessions.snapshot()).toHaveLength(4);
    expect(sessions.forPane('two')).toMatchObject({ sessionId: ids[1], state: 'ready' });
    expect(sessions.forPane('one')).toMatchObject({ sessionId: ids[0], state: 'created' });
    expect(sessions.forPane('three')).toMatchObject({ sessionId: ids[2], state: 'created' });
    expect(sessions.forPane('four')).toMatchObject({ sessionId: ids[3], state: 'created' });
    sessions.dispose();
  });

  it('reports native reconnect backoff and ignores stale event ordering', async () => {
    const adapter = new ControlledSessionAdapter();
    const sessions = new SessionController(adapter);
    const id = await sessions.create('pane', 'server');

    adapter.emit({ sessionId: id, state: 'connecting' });
    adapter.emit({ sessionId: id, state: 'reconnecting', attempt: 3 });
    expect(sessions.forPane('pane')).toMatchObject({ state: 'reconnecting', reconnectAttempt: 3 });
    expect(reconnectDelaySeconds(1)).toBe(1);
    expect(reconnectDelaySeconds(3)).toBe(4);
    expect(reconnectDelaySeconds(5)).toBe(16);

    adapter.emit({ sessionId: id, state: 'connected' });
    adapter.emit({ sessionId: id, state: 'ready' });
    adapter.emit({ sessionId: id, state: 'connecting' });
    expect(sessions.forPane('pane')).toMatchObject({ state: 'ready' });

    adapter.emit({ sessionId: id, state: 'failed', code: 'TIMEOUT' });
    adapter.emit({ sessionId: id, state: 'ready' });
    expect(sessions.snapshot()).toEqual([]);
    sessions.dispose();
  });

  it('cancels managed sessions and treats inactive differently from background', async () => {
    const adapter = new ControlledSessionAdapter();
    const sessions = new SessionController(adapter);
    const ids = await Promise.all([
      sessions.create('pane-one', 'server-one'),
      sessions.create('pane-two', 'server-two'),
    ]);

    await sessions.handleAppState('inactive');
    expect(adapter.disconnected).toEqual([]);
    expect(sessions.snapshot()).toHaveLength(2);

    await sessions.close(ids[0]!);
    adapter.emit({ sessionId: ids[0]!, state: 'ready' });
    expect(sessions.forPane('pane-one')).toBeUndefined();

    await sessions.handleAppState('background');
    expect(adapter.disconnected).toEqual(ids);
    expect(sessions.snapshot()).toEqual([]);
    sessions.dispose();
  });

  it('starts restored workspace layouts disconnected', async () => {
    const adapter = new ControlledSessionAdapter();
    const previousLaunch = new SessionController(adapter);
    await previousLaunch.create('persisted-pane', 'server');
    previousLaunch.dispose();

    const restoredLaunch = new SessionController(adapter);
    expect(restoredLaunch.snapshot()).toEqual([]);
    expect(adapter.created).toEqual(['session-1']);
    restoredLaunch.dispose();
  });
});
