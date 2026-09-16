import { describe, expect, it } from 'vitest';
import { validatePaneTree, validateServer } from '@/validation/domain';
import { closePane, splitPane } from '@/workspaces/paneTree';
import { createExport, parseImport } from '@/storage/export';
import type { Server } from '@/types/domain';
const server: Server = {
  id: 's1',
  name: ' Demo ',
  host: ' EXAMPLE.COM ',
  port: 22,
  username: ' me ',
  authMethod: 'key',
  keyId: 'key1',
  timeoutSeconds: 10,
  keepaliveSeconds: 30,
  reconnect: false,
  terminalType: 'xterm-256color',
  startupCommand: 'env',
  environment: { A: 'B' },
  createdAt: 'now',
  updatedAt: 'now',
};
describe('validation', () => {
  it('normalizes a server and rejects invalid ports', () => {
    expect(validateServer(server).host).toBe('example.com');
    expect(() => validateServer({ ...server, port: 0 })).toThrow('Port');
  });
  it('rejects duplicate pane IDs', () =>
    expect(() =>
      validatePaneTree({
        kind: 'split',
        id: 'x',
        axis: 'row',
        ratio: 0.5,
        children: [
          { kind: 'leaf', id: 'x' },
          { kind: 'leaf', id: 'b' },
        ],
      }),
    ).toThrow('unique'));
});
describe('pane tree', () => {
  it('splits and collapses a leaf', () => {
    const root = { kind: 'leaf' as const, id: 'one' };
    const split = splitPane(root, 'one', 'row', { kind: 'leaf', id: 'two' }, 'split');
    expect(split.kind).toBe('split');
    expect(closePane(split, 'two')).toEqual(root);
  });
});
describe('portable exports', () => {
  it('excludes credential refs and risky automatic execution fields', () => {
    const output = createExport({
      servers: [server],
      snippets: [],
      workspaces: [],
      themes: [],
      settings: { theme: 'dark', autoLockMinutes: 5 },
    });
    const text = JSON.stringify(output);
    expect(text).not.toContain('key1');
    expect(text).not.toContain('startupCommand');
    expect(text).not.toContain('environment');
    expect(parseImport(output).version).toBe(1);
  });
});
