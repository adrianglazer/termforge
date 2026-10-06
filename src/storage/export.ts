import type { PaneNode, Server, Snippet, Workspace } from '@/types/domain';
import { validatePaneTree, validateServer } from '@/validation/domain';
import { validateJumpGraph } from '@/servers/jumpGraph';
import { AppError } from '@/application/errors';

export type PortableExport = {
  version: 1;
  servers: Array<Omit<Server, 'credentialRef' | 'keyId' | 'startupCommand' | 'environment'>>;
  snippets: Snippet[];
  workspaces: Workspace[];
  themes: string[];
  settings: { theme: string; autoLockMinutes: number };
};

const invalid = (): never => {
  throw new AppError('INVALID_CONFIG', 'Configuration format is invalid.');
};
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
};
const text = (value: unknown, limit = 4096): string => {
  if (typeof value !== 'string' || value.length > limit || value.includes('\0')) return invalid();
  return value;
};
const id = (value: unknown): string => {
  const result = text(value, 256);
  return result.trim() ? result : invalid();
};
const array = (value: unknown): unknown[] => {
  if (!Array.isArray(value) || value.length > 1000) return invalid();
  return value;
};
const number = (value: unknown, min: number, max: number): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max)
    return invalid();
  return value;
};
const boolean = (value: unknown): boolean => (typeof value === 'boolean' ? value : invalid());
const unique = <T extends { id: string }>(values: T[]): T[] => {
  if (new Set(values.map((value) => value.id)).size !== values.length) return invalid();
  return values;
};

// Rebuild every nested value. A TypeScript type or object-rest expression is not
// an export allowlist when repository/import data has unexpected runtime fields.
function pane(value: unknown, serverIds: Set<string>, depth = 1): PaneNode {
  if (depth > 8) return invalid();
  const node = record(value);
  const nodeId = id(node.id);
  if (node.kind === 'leaf') {
    const serverId = node.serverId === undefined ? undefined : id(node.serverId);
    if (serverId && !serverIds.has(serverId)) return invalid();
    return {
      kind: 'leaf',
      id: nodeId,
      ...(serverId ? { serverId } : {}),
      ...(node.title === undefined ? {} : { title: text(node.title) }),
    };
  }
  if (
    node.kind !== 'split' ||
    (node.axis !== 'row' && node.axis !== 'column') ||
    !Array.isArray(node.children) ||
    node.children.length !== 2 ||
    typeof node.ratio !== 'number'
  )
    return invalid();
  return {
    kind: 'split',
    id: nodeId,
    axis: node.axis,
    ratio: node.ratio,
    children: [
      pane(node.children[0], serverIds, depth + 1),
      pane(node.children[1], serverIds, depth + 1),
    ],
  };
}

function portable(value: unknown): PortableExport {
  const data = record(value);
  if (data.version !== 1) return invalid();
  const servers = unique(
    array(data.servers).map((value) => {
      const server = record(value);
      if (server.credentialRef !== undefined)
        throw new AppError('INVALID_CONFIG', 'Credentials cannot be part of server state.');
      if (server.authMethod !== 'password' && server.authMethod !== 'key') return invalid();
      return validateServer({
        id: id(server.id),
        name: text(server.name),
        host: text(server.host),
        port: number(server.port, 1, 65535),
        username: text(server.username),
        authMethod: server.authMethod,
        ...(server.jumpServerId === undefined ? {} : { jumpServerId: id(server.jumpServerId) }),
        timeoutSeconds: number(server.timeoutSeconds, 1, 300),
        keepaliveSeconds: number(server.keepaliveSeconds, 0, 3600),
        reconnect: boolean(server.reconnect),
        terminalType: text(server.terminalType, 256),
        createdAt: text(server.createdAt),
        updatedAt: text(server.updatedAt),
      });
    }),
  );
  const serverIds = new Set(servers.map((server) => server.id));
  if (servers.some((server) => server.jumpServerId && !serverIds.has(server.jumpServerId)))
    return invalid();
  validateJumpGraph(servers);
  const snippets = unique(
    array(data.snippets).map((value) => {
      const item = record(value);
      return {
        id: id(item.id),
        name: text(item.name),
        commandTemplate: text(item.commandTemplate, 65536),
        description: text(item.description),
        category: text(item.category),
        favorite: boolean(item.favorite),
        variables: array(item.variables).map((value) => text(value, 256)),
        createdAt: text(item.createdAt),
        updatedAt: text(item.updatedAt),
      };
    }),
  );
  const workspaces = unique(
    array(data.workspaces).map((value) => {
      const item = record(value);
      const layout = validatePaneTree(pane(item.layout, serverIds));
      const leaves = new Set<string>();
      const visit = (node: PaneNode): void => {
        if (node.kind === 'leaf') leaves.add(node.id);
        else node.children.forEach(visit);
      };
      visit(layout);
      const tabOrder = array(item.tabOrder).map(id);
      if (new Set(tabOrder).size !== tabOrder.length || tabOrder.some((id) => !leaves.has(id)))
        return invalid();
      return {
        id: id(item.id),
        name: text(item.name),
        layout,
        tabOrder,
        createdAt: text(item.createdAt),
        updatedAt: text(item.updatedAt),
      };
    }),
  );
  const settings = record(data.settings);
  return {
    version: 1,
    servers,
    snippets,
    workspaces,
    themes: array(data.themes).map((value) => text(value, 256)),
    settings: {
      theme: text(settings.theme, 256),
      autoLockMinutes: number(settings.autoLockMinutes, 1, 30),
    },
  };
}

export function createExport(data: {
  servers: Server[];
  snippets: Snippet[];
  workspaces: Workspace[];
  themes: string[];
  settings: { theme: string; autoLockMinutes: number };
}): PortableExport {
  // Credential fields from internal records are intentionally discarded here;
  // imported credentialRef fields are rejected by parseImport instead.
  return portable({
    ...data,
    version: 1,
    servers: data.servers.map((server) => ({ ...server, credentialRef: undefined })),
  });
}

export function parseImport(value: unknown): PortableExport {
  if (!value || typeof value !== 'object')
    throw new AppError('INVALID_CONFIG', 'Configuration is not an object.');
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch {
    return invalid();
  }
  if (new TextEncoder().encode(raw).byteLength > 1_000_000)
    throw new AppError('RESOURCE_LIMIT', 'Configuration is too large.');
  // Detach the untrusted object graph and reject cyclic/non-JSON values above.
  return portable(JSON.parse(raw));
}
