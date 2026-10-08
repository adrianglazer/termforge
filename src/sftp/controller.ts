import type { RemoteEntry } from '@/native/termforgeNative';
import { safeError } from '@/application/errors';
import type { TransferRecord } from '@/sftp/transfers';

export type SftpAdapter = {
  listDirectory(sessionId: string, path: string): Promise<RemoteEntry[]>;
  renameRemote(sessionId: string, source: string, destination: string): Promise<void>;
  removeRemote(sessionId: string, path: string): Promise<void>;
  removeRemoteDirectory(sessionId: string, path: string): Promise<void>;
  createRemoteDirectory(sessionId: string, path: string): Promise<void>;
  downloadFile(
    sessionId: string,
    operationId: string,
    path: string,
  ): Promise<{ url: string; bytes: string; sha256: string }>;
  uploadFile(
    sessionId: string,
    operationId: string,
    localURL: string,
    path: string,
    overwrite: boolean,
  ): Promise<{ bytes: string; sha256: string }>;
  cancelTransfer(sessionId: string, operationId: string): Promise<void>;
  readText(sessionId: string, path: string): Promise<{ text: string; fingerprint: string }>;
  writeText(
    sessionId: string,
    path: string,
    text: string,
    fingerprint: string,
  ): Promise<{ fingerprint: string }>;
};

export type EditorDocument = {
  path: string;
  text: string;
  fingerprint: string;
  dirty: boolean;
};

export const joinRemotePath = (directory: string, name: string): string =>
  `${directory.replace(/\/$/, '')}/${name}`.replace(/^\/+/, '/');

export const visibleEntries = (
  entries: RemoteEntry[],
  search: string,
  sort: 'name' | 'size',
): RemoteEntry[] =>
  entries
    .filter((entry) => entry.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((left, right) => {
      if (left.isDirectory !== right.isDirectory) return left.isDirectory ? -1 : 1;
      return sort === 'size'
        ? Number(right.size ?? 0) - Number(left.size ?? 0)
        : left.name.localeCompare(right.name);
    });

export const replaceAll = (
  document: EditorDocument,
  find: string,
  replacement: string,
): EditorDocument =>
  !find
    ? document
    : { ...document, text: document.text.split(find).join(replacement), dirty: true };

export class SftpController {
  private transfers = new Map<string, TransferRecord>();
  private cancelled = new Set<string>();

  constructor(
    private readonly native: SftpAdapter,
    private readonly makeId: () => string,
  ) {}

  async browse(sessionId: string, path: string): Promise<RemoteEntry[]> {
    try {
      return await this.native.listDirectory(sessionId, path);
    } catch (error) {
      throw safeError(error);
    }
  }

  async rename(
    sessionId: string,
    directory: string,
    source: string,
    destination: string,
  ): Promise<void> {
    const sourceName = requireExistingSegment(source, 'source name');
    const next = requireSegment(destination, 'replacement name');
    try {
      await this.native.renameRemote(
        sessionId,
        joinRemotePath(directory, sourceName),
        joinRemotePath(directory, next),
      );
    } catch (error) {
      throw safeError(error);
    }
  }

  async remove(sessionId: string, directory: string, entry: RemoteEntry): Promise<void> {
    const path = joinRemotePath(directory, requireExistingSegment(entry.name, 'entry name'));
    try {
      if (entry.isDirectory) await this.native.removeRemoteDirectory(sessionId, path);
      else await this.native.removeRemote(sessionId, path);
    } catch (error) {
      throw safeError(error);
    }
  }

  async createDirectory(sessionId: string, directory: string, name: string): Promise<void> {
    const directoryName = requireSegment(name, 'directory name');
    try {
      await this.native.createRemoteDirectory(sessionId, joinRemotePath(directory, directoryName));
    } catch (error) {
      throw safeError(error);
    }
  }

  async openEditor(sessionId: string, path: string): Promise<EditorDocument> {
    try {
      const loaded = await this.native.readText(sessionId, path);
      return { path, text: loaded.text, fingerprint: loaded.fingerprint, dirty: false };
    } catch (error) {
      throw safeError(error);
    }
  }

  edit(document: EditorDocument, text: string): EditorDocument {
    return { ...document, text, dirty: text !== document.text || document.dirty };
  }

  async saveEditor(sessionId: string, document: EditorDocument): Promise<EditorDocument> {
    try {
      const saved = await this.native.writeText(
        sessionId,
        document.path,
        document.text,
        document.fingerprint,
      );
      return { ...document, fingerprint: saved.fingerprint, dirty: false };
    } catch (error) {
      throw safeError(error);
    }
  }

  discardEditor(): undefined {
    return undefined;
  }

  async download(sessionId: string, path: string): Promise<TransferRecord> {
    return this.runTransfer(sessionId, 'download', path, (operationId) =>
      this.native.downloadFile(sessionId, operationId, path),
    );
  }

  async upload(sessionId: string, localURL: string, path: string): Promise<TransferRecord> {
    return this.runTransfer(sessionId, 'upload', path, (operationId) =>
      this.native.uploadFile(sessionId, operationId, localURL, path, false),
    );
  }

  async cancel(id: string): Promise<TransferRecord | undefined> {
    const current = this.transfers.get(id);
    if (!current || current.state !== 'running') return current;
    this.cancelled.add(id);
    const cancelled = { ...current, state: 'cancelled' as const };
    this.transfers.set(id, cancelled);
    await this.native.cancelTransfer(current.sessionId, id);
    return cancelled;
  }

  progress(id: string, bytes: string, total: string): TransferRecord | undefined {
    const current = this.transfers.get(id);
    if (!current || current.state !== 'running') return current;
    const updated = { ...current, bytes, total };
    this.transfers.set(id, updated);
    return updated;
  }

  retry(
    record: TransferRecord,
    operation: () => Promise<{ bytes: string; sha256: string }>,
  ): Promise<TransferRecord> {
    return this.runTransfer(record.sessionId, record.direction, record.remotePath, operation);
  }

  snapshot(id: string): TransferRecord | undefined {
    return this.transfers.get(id);
  }

  private async runTransfer(
    sessionId: string,
    direction: TransferRecord['direction'],
    remotePath: string,
    operation: (
      operationId: string,
    ) => Promise<
      { bytes: string; sha256: string } | { url: string; bytes: string; sha256: string }
    >,
  ): Promise<TransferRecord> {
    const id = this.makeId();
    const running: TransferRecord = {
      id,
      sessionId,
      direction,
      remotePath,
      state: 'running',
      bytes: '0',
      total: '0',
    };
    this.transfers.set(id, running);
    try {
      const result = await operation(id);
      const final = this.cancelled.has(id)
        ? { ...running, state: 'cancelled' as const }
        : {
            ...running,
            state: 'completed' as const,
            bytes: result.bytes,
            total: result.bytes,
            sha256: result.sha256,
            ...('url' in result ? { localURL: result.url } : {}),
          };
      this.transfers.set(id, final);
      this.cancelled.delete(id);
      return final;
    } catch (error) {
      const failure = safeError(error);
      const final =
        this.cancelled.has(id) || failure.code === 'CANCELLED'
          ? { ...running, state: 'cancelled' as const }
          : {
              ...running,
              state: 'failed' as const,
              error: failure.safeMessage,
            };
      this.transfers.set(id, final);
      this.cancelled.delete(id);
      return final;
    }
  }
}

const requireSegment = (value: string, label: string): string => {
  const trimmed = value.trim();
  return requireExistingSegment(trimmed, label);
};

const requireExistingSegment = (value: string, label: string): string => {
  if (!value || value.includes('/') || value.includes('\0') || value === '.' || value === '..')
    throw new Error(`Enter one ${label} without a slash.`);
  return value;
};
