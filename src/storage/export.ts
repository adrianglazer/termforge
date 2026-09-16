import type { Server, Snippet, Workspace } from '@/types/domain';
import { validatePaneTree, validateServer } from '@/validation/domain';
import { AppError } from '@/application/errors';
export type PortableExport = {
  version: 1;
  servers: Array<Omit<Server, 'credentialRef' | 'keyId' | 'startupCommand' | 'environment'>>;
  snippets: Snippet[];
  workspaces: Workspace[];
  themes: string[];
  settings: { theme: string; autoLockMinutes: number };
};
export function createExport(data: {
  servers: Server[];
  snippets: Snippet[];
  workspaces: Workspace[];
  themes: string[];
  settings: { theme: string; autoLockMinutes: number };
}): PortableExport {
  return {
    version: 1,
    servers: data.servers.map(
      ({
        keyId: _key,
        credentialRef: _credential,
        startupCommand: _command,
        environment: _environment,
        ...server
      }) => server,
    ),
    snippets: data.snippets,
    workspaces: data.workspaces,
    themes: data.themes,
    settings: data.settings,
  };
}
export function parseImport(value: unknown): PortableExport {
  if (!value || typeof value !== 'object')
    throw new AppError('INVALID_CONFIG', 'Configuration is not an object.');
  const data = value as Partial<PortableExport>;
  if (
    data.version !== 1 ||
    !Array.isArray(data.servers) ||
    !Array.isArray(data.snippets) ||
    !Array.isArray(data.workspaces) ||
    !Array.isArray(data.themes) ||
    !data.settings
  )
    throw new AppError('INVALID_CONFIG', 'Configuration format is invalid.');
  const raw = JSON.stringify(data);
  if (raw.length > 1_000_000) throw new AppError('RESOURCE_LIMIT', 'Configuration is too large.');
  data.servers.forEach((server) => validateServer(server as Server));
  data.workspaces.forEach((workspace) => validatePaneTree(workspace.layout));
  return data as PortableExport;
}
