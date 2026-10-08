import { describe, expect, it } from 'vitest';

import type { RemoteEntry } from '@/native/termforgeNative';
import { AppError } from '@/application/errors';
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
  deferredDownloads = new Map<string, () => void>();

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
  async downloadFile(_session: string, operationId: string, path: string) {
    this.calls.push(`download:${operationId}:${path}`);
    await new Promise<void>((resolve) => {
      this.deferredDownload = resolve;
      this.deferredDownloads.set(operationId, resolve);
    });
    return { url: 'file:///tmp/file', bytes: '42', sha256: 'hash-download' };
  }
  async uploadFile(_session: string, operationId: string, _local: string, path: string) {
    this.calls.push(`upload:${operationId}:${path}`);
    return { bytes: '7', sha256: 'hash-upload' };
  }
  async cancelTransfer(sessionId: string, operationId: string) {
    this.calls.push(`cancel:${sessionId}:${operationId}`);
  }
  async readText(_session: string, path: string) {
    this.calls.push(`read:${path}`);
    return { text: 'one two one', fingerprint: 'before-save' };
  }
  async writeText(_session: string, path: string, text: string, fingerprint: string) {
    this.calls.push(`write:${path}:${text}:${fingerprint}`);
    if (this.failWrite)
      throw new AppError('CONFLICT', 'The remote file changed. Reload it before saving.');
    return { fingerprint: 'after-save' };
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
    await expect(controller.browse('session', '/error')).rejects.toThrow(
      'The operation could not be completed.',
    );
  });

  it('performs validated directory and file actions', async () => {
    const native = new ControlledSftpAdapter();
    const controller = new SftpController(native, () => 'transfer-1');
    await controller.createDirectory('session', '/home', ' new-dir ');
    await controller.rename('session', '/home', 'alpha.txt', 'renamed.txt');
    await controller.remove('session', '/home', entries[0]!);
    await controller.remove('session', '/home', entries[1]!);
    await controller.rename('session', '/home', ' spaced.txt ', 'kept.txt');
    await expect(controller.createDirectory('session', '/home', 'bad/name')).rejects.toThrow(
      'without a slash',
    );
    await expect(controller.createDirectory('session', '/home', '..')).rejects.toThrow(
      'without a slash',
    );
    await expect(controller.createDirectory('session', '/home', 'bad\0name')).rejects.toThrow(
      'without a slash',
    );
    await expect(
      controller.rename('session', '/home', '../alpha.txt', 'renamed.txt'),
    ).rejects.toThrow('without a slash');
    await expect(
      controller.remove('session', '/home', { ...entries[0]!, name: '../secret' }),
    ).rejects.toThrow('without a slash');
    expect(native.calls).toEqual([
      'mkdir:/home/new-dir',
      'rename:/home/alpha.txt:/home/renamed.txt',
      'remove:/home/z-last.log',
      'rmdir:/home/configs',
      'rename:/home/ spaced.txt :/home/kept.txt',
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
    await expect(controller.cancel('download-1')).resolves.toMatchObject({ state: 'cancelled' });
    expect(native.calls).toContain('cancel:session:download-1');
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

  it('cancels only the selected transfer when two run in one session', async () => {
    const native = new ControlledSftpAdapter();
    const ids = ['download-a', 'download-b'];
    const controller = new SftpController(native, () => ids.shift()!);
    const first = controller.download('session', '/home/a');
    const second = controller.download('session', '/home/b');

    await controller.cancel('download-a');
    native.deferredDownloads.get('download-a')!();
    native.deferredDownloads.get('download-b')!();

    await expect(first).resolves.toMatchObject({ id: 'download-a', state: 'cancelled' });
    await expect(second).resolves.toMatchObject({ id: 'download-b', state: 'completed' });
    expect(native.calls).toContain('cancel:session:download-a');
    expect(native.calls).not.toContain('cancel:session:download-b');
  });

  it('treats native upload cancellation as cancelled without a retry error', async () => {
    const native = new ControlledSftpAdapter();
    native.uploadFile = async () => {
      throw new AppError('CANCELLED', 'User cancelled');
    };
    const controller = new SftpController(native, () => 'upload-cancelled');
    const result = await controller.upload('session', 'local', '/home/file');
    expect(result.state).toBe('cancelled');
    expect(result.error).toBeUndefined();
    expect(controller.progress(result.id, '10', '20')).toMatchObject({ state: 'cancelled' });
  });

  it('preserves actual transfer failures for the retry message', async () => {
    const native = new ControlledSftpAdapter();
    native.uploadFile = async () => {
      throw new AppError('TIMEOUT', 'Timeout');
    };
    const controller = new SftpController(native, () => 'upload-failed');
    expect(await controller.upload('session', 'local', '/home/file')).toMatchObject({
      state: 'failed',
      error: 'The operation timed out.',
    });
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
    expect(await controller.saveEditor('session', edited)).toMatchObject({
      dirty: false,
      fingerprint: 'after-save',
    });

    native.failWrite = true;
    await expect(controller.saveEditor('session', edited)).rejects.toThrow('remote file changed');
    expect(native.calls).toContain('write:/home/alpha.txt:three two three!:before-save');
  });
});
