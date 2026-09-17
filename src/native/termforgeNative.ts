import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import type { EventSubscription } from 'expo-modules-core';
import type { ViewProps } from 'react-native';

export type HostKey = { algorithm: string; key: string; fingerprint: string };
export type SessionState = {
  sessionId: string;
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
  remotePath: string;
  bytes: string;
  total: string;
};

type NativeApi = {
  inspectHostKey(host: string, port: number): Promise<HostKey>;
  createSession(): Promise<string>;
  connectPassword(
    id: string,
    host: string,
    port: number,
    username: string,
    password: string,
    hostKey: string,
    columns: number,
    rows: number,
  ): Promise<void>;
  disconnect(id: string): Promise<void>;
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
  saveFileToFiles(url: string): Promise<void>;
  searchTerminal(
    id: string,
    term: string,
    direction: 'next' | 'previous',
    caseSensitive: boolean,
  ): Promise<{ index: number; total: number }>;
  clearScrollback(id: string): Promise<void>;
  importEd25519Key(
    openSSH: string,
    passphrase: string,
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
  connectKey(
    id: string,
    host: string,
    port: number,
    username: string,
    reference: string,
    reason: string,
    hostKey: string,
    columns: number,
    rows: number,
  ): Promise<void>;
  connectPasswordViaJump(
    id: string,
    host: string,
    port: number,
    username: string,
    password: string,
    hostKey: string,
    jumpHost: string,
    jumpPort: number,
    jumpUsername: string,
    jumpPassword: string,
    jumpHostKey: string,
    columns: number,
    rows: number,
  ): Promise<void>;
  listDirectory(id: string, path: string): Promise<RemoteEntry[]>;
  renameRemote(id: string, sourcePath: string, destinationPath: string): Promise<void>;
  removeRemote(id: string, path: string): Promise<void>;
  createRemoteDirectory(id: string, path: string): Promise<void>;
  removeRemoteDirectory(id: string, path: string): Promise<void>;
  downloadFile(
    id: string,
    remotePath: string,
  ): Promise<{ url: string; bytes: string; sha256: string }>;
  readText(id: string, remotePath: string): Promise<{ text: string; fingerprint: string }>;
  writeText(
    id: string,
    remotePath: string,
    text: string,
    expectedFingerprint: string,
  ): Promise<void>;
  uploadFile(
    id: string,
    localURL: string,
    remotePath: string,
    overwrite: boolean,
  ): Promise<{ bytes: string; sha256: string }>;
  cancelTransfers(id: string): Promise<void>;
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
