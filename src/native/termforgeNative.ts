import { requireNativeModule, requireNativeView as requireNativeViewManager } from 'expo';
import type { ViewProps } from 'react-native';
import type { AccessSnapshot } from '@/domain/access';

type EventSubscription = { remove(): void };

export type HostKey = { algorithm: string; key: string; fingerprint: string; challengeId?: string };
export type SessionState = {
  sessionId: string;
  generation: number;
  sequence: number;
  state: 'created' | 'connecting' | 'reconnecting' | 'connected' | 'ready' | 'closed' | 'failed';
  message?: string;
  code?: string;
  attempt?: number;
};
export type RemoteEntry = {
  name: string;
  longName: string;
  size: string | null;
  permissions: string | null;
  isDirectory: boolean;
};
export type TransferProgress = {
  sessionId: string;
  operationId: string;
  generation: number;
  sequence: number;
  remotePath: string;
  bytes: string;
  total: string;
};

export type SecurityState = { locked: boolean; revision: number };

type NativeApi = {
  accessState(): Promise<AccessSnapshot>;
  refreshAccess(): Promise<AccessSnapshot>;
  purchaseAccess(kind: 'trial' | 'lifetime'): Promise<AccessSnapshot>;
  restorePurchases(): Promise<AccessSnapshot>;
  addListener(event: 'onAccessState', listener: (event: AccessSnapshot) => void): EventSubscription;
  credentialStates(references: string[]): Promise<Record<string, string>>;
  orphanedKeys(references: string[]): Promise<string[]>;
  reassociateKey(reference: string): Promise<void>;
  securityState(): Promise<SecurityState>;
  setAutoLockMinutes(minutes: number): Promise<void>;
  addListener(
    event: 'onSecurityState',
    listener: (event: SecurityState) => void,
  ): EventSubscription;
  prepareMetadataStorage(): Promise<string>;
  pickLocalFile(kind: 'key' | 'upload'): Promise<{ handle: string; name: string; bytes: string }>;
  discardLocalFile(handle: string): Promise<void>;
  inspectHostKeyThroughJump(
    host: string,
    port: number,
    jumpHost: string,
    jumpPort: number,
    username: string,
    challengeId: string,
  ): Promise<[HostKey, HostKey]>;
  inspectHostKey(host: string, port: number): Promise<HostKey>;
  createSession(): Promise<string>;
  connectPassword(id: string, options: string): Promise<void>;
  disconnect(id: string): Promise<void>;
  setKeyboardVisible(id: string, visible: boolean): Promise<void>;
  sendKey(
    id: string,
    key:
      | 'escape'
      | 'tab'
      | 'ctrlC'
      | 'ctrlD'
      | 'up'
      | 'down'
      | 'left'
      | 'right'
      | 'f1'
      | 'f2'
      | 'f3'
      | 'f4'
      | 'f5'
      | 'f6'
      | 'f7'
      | 'f8'
      | 'f9'
      | 'f10'
      | 'f11'
      | 'f12',
  ): Promise<void>;
  sendText(id: string, text: string): Promise<void>;
  pasteClipboard(id: string): Promise<void>;
  copyText(text: string): Promise<void>;
  shareClipboard(): Promise<void>;
  saveFileToFiles(handle: string): Promise<void>;
  saveTextDraftToFiles(text: string): Promise<void>;
  searchTerminal(
    id: string,
    term: string,
    direction: 'next' | 'previous',
    caseSensitive: boolean,
  ): Promise<{ index: number; total: number }>;
  clearScrollback(id: string): Promise<void>;
  importEd25519Key(
    handle: string,
    protection: 'userPresence' | 'biometryCurrentSet',
  ): Promise<{
    reference: string;
    algorithm: 'ed25519';
    publicKey: string;
    fingerprint: string;
    protection: string;
  }>;
  generateEd25519Key(protection: 'userPresence' | 'biometryCurrentSet'): Promise<{
    reference: string;
    algorithm: 'ed25519';
    publicKey: string;
    fingerprint: string;
    protection: string;
  }>;
  deleteKey(reference: string): Promise<void>;
  connectKey(id: string, options: string): Promise<void>;
  connectPasswordViaJump(id: string, options: string): Promise<void>;
  listDirectory(id: string, path: string): Promise<RemoteEntry[]>;
  renameRemote(id: string, sourcePath: string, destinationPath: string): Promise<void>;
  removeRemote(id: string, path: string): Promise<void>;
  createRemoteDirectory(id: string, path: string): Promise<void>;
  removeRemoteDirectory(id: string, path: string): Promise<void>;
  downloadFile(
    id: string,
    operationId: string,
    remotePath: string,
  ): Promise<{ url: string; bytes: string; sha256: string }>;
  readText(id: string, remotePath: string): Promise<{ text: string; fingerprint: string }>;
  writeText(
    id: string,
    remotePath: string,
    text: string,
    expectedFingerprint: string,
  ): Promise<{ fingerprint: string }>;
  uploadFile(
    id: string,
    operationId: string,
    localHandle: string,
    remotePath: string,
    overwrite: boolean,
  ): Promise<{ bytes: string; sha256: string }>;
  cancelTransfer(id: string, operationId: string): Promise<void>;
  startRemoteForward(
    id: string,
    remotePort: number,
    localHost: string,
    localPort: number,
  ): Promise<string>;
  startLocalForward(
    id: string,
    localPort: number,
    remoteHost: string,
    remotePort: number,
  ): Promise<string>;
  stopForward(id: string, forwardId: string): Promise<void>;
  addListener(event: 'onSessionState', listener: (event: SessionState) => void): EventSubscription;
  addListener(
    event: 'onTransferProgress',
    listener: (event: TransferProgress) => void,
  ): EventSubscription;
};

export const TermforgeNative = requireNativeModule<NativeApi>('TermforgeNative');
export const NativeTerminalView = requireNativeViewManager<
  ViewProps & {
    sessionId?: string;
    fontSize: number;
    scrollback: number;
    foregroundColor: string;
    backgroundColor: string;
  }
>('TermforgeNative');
