export type Id = string;
export type AuthMethod = 'key' | 'password' | 'keyboard-interactive';
export type PaneNode = PaneLeaf | PaneSplit;
export type PaneLeaf = {
  kind: 'leaf';
  id: Id;
  serverId?: Id;
  title?: string;
  terminalOverrides?: Record<string, string>;
};
export type PaneSplit = {
  kind: 'split';
  id: Id;
  axis: 'row' | 'column';
  ratio: number;
  children: [PaneNode, PaneNode];
};
export type Server = {
  id: Id;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: AuthMethod;
  keyId?: Id;
  credentialRef?: never;
  jumpServerId?: Id;
  timeoutSeconds: number;
  keepaliveSeconds: number;
  reconnect: boolean;
  terminalType: string;
  startupCommand?: string;
  environment?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};
export type KeyMetadata = {
  id: Id;
  name: string;
  algorithm: string;
  publicKey: string;
  fingerprint: string;
  credentialRef: string;
  protectionPolicy: 'user-presence' | 'biometry-current-set';
  createdAt: string;
  updatedAt: string;
};
export type Workspace = {
  id: Id;
  name: string;
  layout: PaneNode;
  tabOrder: Id[];
  createdAt: string;
  updatedAt: string;
};
export type Snippet = {
  id: Id;
  name: string;
  commandTemplate: string;
  description: string;
  category: string;
  favorite: boolean;
  variables: string[];
  createdAt: string;
  updatedAt: string;
};
export type KnownHost = {
  id: Id;
  host: string;
  port: number;
  algorithm: string;
  publicKey: string;
  fingerprint: string;
  approvedAt: string;
};
export type ConnectionHistory = {
  id: Id;
  serverId: Id;
  startedAt: string;
  endedAt?: string;
  outcome: 'success' | 'failed' | 'cancelled';
};
export type Settings = {
  id: 'default';
  theme: string;
  autoLockMinutes: number;
  terminalFontSize: number;
  scrollbackLines: number;
  accessoryPreset: 'compact' | 'extended';
  version: number;
  updatedAt: string;
};
