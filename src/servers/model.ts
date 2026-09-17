import type { AuthMethod, Server } from '@/types/domain';
import { validateServer } from '@/validation/domain';

export type ServerDraft = {
  name: string;
  host: string;
  port: string;
  username: string;
  authMethod: AuthMethod;
  keyId?: string;
  jumpServerId?: string;
  timeoutSeconds: string;
  keepaliveSeconds: string;
  reconnect: boolean;
  terminalType: string;
  startupCommand: string;
};

export const emptyServerDraft = (): ServerDraft => ({
  name: '',
  host: '',
  port: '22',
  username: '',
  authMethod: 'password',
  timeoutSeconds: '15',
  keepaliveSeconds: '30',
  reconnect: true,
  terminalType: 'xterm-256color',
  startupCommand: '',
});

export const draftFromServer = (server: Server): ServerDraft => ({
  name: server.name,
  host: server.host,
  port: String(server.port),
  username: server.username,
  authMethod: server.authMethod,
  ...(server.keyId ? { keyId: server.keyId } : {}),
  ...(server.jumpServerId ? { jumpServerId: server.jumpServerId } : {}),
  timeoutSeconds: String(server.timeoutSeconds),
  keepaliveSeconds: String(server.keepaliveSeconds),
  reconnect: server.reconnect,
  terminalType: server.terminalType,
  startupCommand: server.startupCommand ?? '',
});

export function serverFromDraft(draft: ServerDraft, existing?: Server): Server {
  const now = new Date().toISOString();
  return validateServer({
    id: existing?.id ?? `server-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: draft.name,
    host: draft.host,
    port: Number(draft.port),
    username: draft.username,
    authMethod: draft.authMethod,
    ...(draft.keyId ? { keyId: draft.keyId } : {}),
    ...(draft.jumpServerId ? { jumpServerId: draft.jumpServerId } : {}),
    ...(existing?.jumpServerId ? { jumpServerId: existing.jumpServerId } : {}),
    timeoutSeconds: Number(draft.timeoutSeconds),
    keepaliveSeconds: Number(draft.keepaliveSeconds),
    reconnect: draft.reconnect,
    terminalType: draft.terminalType,
    ...(draft.startupCommand.trim() ? { startupCommand: draft.startupCommand.trim() } : {}),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}
