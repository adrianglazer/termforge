import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import type { EventSubscription } from 'expo-modules-core';
import type { ViewProps } from 'react-native';

export type HostKey = { algorithm: string; key: string; fingerprint: string };
export type SessionState = {
  sessionId: string;
  state: 'created' | 'connecting' | 'connected' | 'ready' | 'closed' | 'failed';
  message?: string;
};
export type RemoteEntry = {
  name: string;
  longName: string;
  size: string | null;
  permissions: string | null;
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
  listDirectory(id: string, path: string): Promise<RemoteEntry[]>;
  downloadFile(id: string, remotePath: string): Promise<{ url: string; bytes: string }>;
  uploadFile(
    id: string,
    localURL: string,
    remotePath: string,
    overwrite: boolean,
  ): Promise<{ bytes: string }>;
  addListener(event: 'onSessionState', listener: (event: SessionState) => void): EventSubscription;
};

export const TermforgeNative = requireNativeModule<NativeApi>('TermforgeNative');
export const NativeTerminalView = requireNativeViewManager<ViewProps & { sessionId?: string }>(
  'TermforgeNative',
);
