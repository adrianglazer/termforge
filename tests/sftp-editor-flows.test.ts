import { describe, expect, it } from 'vitest';

import type { RemoteEntry } from '@/native/termforgeNative';
import { replaceAll, SftpController, type SftpAdapter, visibleEntries } from '@/sftp/controller';

const entries: RemoteEntry[] = [
  { name: 'z-last.log', longName: '', size: '9', permissions: '-rw-r--r--', isDirectory: false },
  { name: 'configs', longName: '', size: null, permissions: 'drwxr-xr-x', isDirectory: true },
  { name: 'alpha.txt', longName: '', size: '42', permissions: '-rw-r--r--', isDirectory: false },
];

class ControlledSftpAdapter implements SftpAdapter {
  readonly calls: string[] = [];
  failWrite = false;
  deferredDownload: (() => void) | undefined;

  async listDirectory(_session: string, path: string) {
    this.calls.push(`list:${path}`);
    if (path === '/error') throw new Error('permission denied');
    return entries;
  }
  async renameRemote(_session: string, source: string, destination: string) {
    this.calls.push(`rename:${source}:${destination}`);
  }
  async removeRemote(_session: string, path: string) {
    this.calls.push(`remove:${path}`);
  }
  async removeRemoteDirectory(_session: string, path: string) {
    this.calls.push(`rmdir:${path}`);
  }
  async createRemoteDirectory(_session: string, path: string) {
    this.calls.push(`mkdir:${path}`);
  }
  async downloadFile(_session: string, path: string) {
    this.calls.push(`download:${path}`);
    await new Promise<void>((resolve) => (this.deferredDownload = resolve));
    return { url: 'file:///tmp/file', bytes: '42', sha256: 'hash-download' };
  }
  async uploadFile(_session: string, _local: string, path: string) {
    this.calls.push(`upload:${path}`);
    return { bytes: '7', sha256: 'hash-upload' };
  }
  async readText(_session: string, path: string) {
    this.calls.push(`read:${path}`);
    return { text: 'one two one', fingerprint: 'before-save' };
  }
  async writeText(_session: string, path: string, text: string, fingerprint: string) {
    this.calls.push(`write:${path}:${text}:${fingerprint}`);
    if (this.failWrite) throw new Error('REMOTE_CHANGED');
  }
}

describe('SFTP and editor flows', () => {
  it('browses, filters, sorts, and reports browse errors', async () => {
    const native = new ControlledSftpAdapter();
    const controller = new SftpController(native, () => 'transfer-1');
    expect(await controller.browse('session', '/home')).toEqual(entries);
    expect(visibleEntries(entries, 'a', 'name').map((entry) => entry.name)).toEqual([
      'alpha.txt',
      'z-last.log',
    ]);
    expect(visibleEntries(entries, '', 'size').map((entry) => entry.name)).toEqual([
      'configs',
      'alpha.txt',
      'z-last.log',
    ]);
    await expect(controller.browse('session', '/error')).rejects.toThrow('permission denied');
  });

  it('performs validated directory and file actions', async () => {
    const native = new ControlledSftpAdapter();
    const controller = new SftpController(native, () => 'transfer-1');
    await controller.createDirectory('session', '/home', ' new-dir ');
    await controller.rename('session', '/home', 'alpha.txt', 'renamed.txt');
    await controller.remove('session', '/home', entries[0]!);
    await controller.remove('session', '/home', entries[1]!);
    await expect(controller.createDirectory('session', '/home', 'bad/name')).rejects.toThrow(
      'without a slash',
    );
    expect(native.calls).toEqual([
      'mkdir:/home/new-dir',
      'rename:/home/alpha.txt:/home/renamed.txt',
      'remove:/home/z-last.log',
      'rmdir:/home/configs',
    ]);
  });

  it('tracks integrity results, cancellation, retry, and interrupted transfer results', async () => {
    const native = new ControlledSftpAdapter();
    const ids = ['download-1', 'upload-2', 'retry-3'];
    const controller = new SftpController(native, () => ids.shift()!);
    const pending = controller.download('session', '/home/alpha.txt');
    expect(controller.snapshot('download-1')).toMatchObject({ state: 'running', bytes: '0' });
    expect(controller.progress('download-1', '21', '42')).toMatchObject({
      bytes: '21',
      total: '42',
    });
    expect(controller.cancel('download-1')).toMatchObject({ state: 'cancelled' });
    native.deferredDownload!();
    expect(await pending).toMatchObject({ state: 'cancelled' });

    const uploaded = await controller.upload('session', 'file:///local', '/home/upload.txt');
    expect(uploaded).toMatchObject({ state: 'completed', bytes: '7', total: '7' });
    const retried = await controller.retry(uploaded, async () => ({
      bytes: '8',
      sha256: 'hash-retry',
    }));
    expect(retried).toMatchObject({ state: 'completed', bytes: '8' });
  });

  it('supports dirty editing, find/replace, discard, and write-back conflict protection', async () => {
    const native = new ControlledSftpAdapter();
    const controller = new SftpController(native, () => 'transfer-1');
    const opened = await controller.openEditor('session', '/home/alpha.txt');
    const edited = replaceAll(controller.edit(opened, 'one two one!'), 'one', 'three');
    expect(edited).toMatchObject({
      text: 'three two three!',
      dirty: true,
      fingerprint: 'before-save',
    });
    expect(controller.discardEditor()).toBeUndefined();
    expect(await controller.saveEditor('session', edited)).toMatchObject({ dirty: false });

    native.failWrite = true;
    await expect(controller.saveEditor('session', edited)).rejects.toThrow('REMOTE_CHANGED');
    expect(native.calls).toContain('write:/home/alpha.txt:three two three!:before-save');
  });
});
