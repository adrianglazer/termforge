import type { PaneNode, Server } from '@/types/domain';
import { AppError } from '@/application/errors';
const fail = (message: string): never => {
  throw new AppError('INVALID_CONFIG', message);
};
export function validateServer(input: Server): Server {
  if (!input.name.trim() || !input.username.trim() || !input.host.trim())
    fail('Server name, host, and username are required.');
  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535)
    fail('Port must be between 1 and 65535.');
  if (input.credentialRef !== undefined) fail('Credentials cannot be part of server state.');
  return {
    ...input,
    host: input.host.trim().toLowerCase(),
    name: input.name.trim(),
    username: input.username.trim(),
  };
}
export function validatePaneTree(node: PaneNode, depth = 1, seen = new Set<string>()): PaneNode {
  if (depth > 8) fail('Pane layout is too deep.');
  if (seen.has(node.id)) fail('Pane IDs must be unique.');
  seen.add(node.id);
  if (node.kind === 'leaf') return node;
  if (!Number.isFinite(node.ratio) || node.ratio < 0.1 || node.ratio > 0.9)
    fail('Pane ratio must be between 0.1 and 0.9.');
  validatePaneTree(node.children[0], depth + 1, seen);
  validatePaneTree(node.children[1], depth + 1, seen);
  if (countLeaves(node) > 8) fail('A workspace supports at most 8 panes.');
  return node;
}
export const countLeaves = (node: PaneNode): number =>
  node.kind === 'leaf' ? 1 : countLeaves(node.children[0]) + countLeaves(node.children[1]);
