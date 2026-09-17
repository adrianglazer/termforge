import { describe, expect, it } from 'vitest';
import { validatePaneTree, validateServer } from '@/validation/domain';
import { closePane, splitPane } from '@/workspaces/paneTree';
import { createExport, parseImport } from '@/storage/export';
import { emptyServerDraft, serverFromDraft } from '@/servers/model';
import { normalizeHost } from '@/known-hosts/repository';
import { validateJumpGraph } from '@/servers/jumpGraph';
import { nextTransferState } from '@/sftp/transfers';
import { renderSnippet, snippetVariables } from '@/snippets/template';
import { resizeSplit } from '@/workspaces/paneTree';
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

  it('rejects malformed and oversized configuration imports', () => {
    expect(() => parseImport(null)).toThrow('not an object');
    expect(() => parseImport({ version: 1, servers: [] })).toThrow('format is invalid');
    expect(() =>
      parseImport({
        version: 1,
        servers: [],
        snippets: [],
        workspaces: [],
        themes: ['x'.repeat(1_000_001)],
        settings: { theme: 'dark', autoLockMinutes: 5 },
      }),
    ).toThrow('too large');
  });
});

describe('server profiles', () => {
  it('creates non-secret connection metadata with safe defaults', () => {
    const profile = serverFromDraft({
      ...emptyServerDraft(),
      name: 'Build host',
      host: ' BUILD.EXAMPLE.COM ',
      username: ' deploy ',
    });
    expect(profile.host).toBe('build.example.com');
    expect(profile.authMethod).toBe('password');
    expect(profile).not.toHaveProperty('credentialRef');
  });
});

describe('known hosts', () => {
  it('normalizes DNS names and bracketed IPv6 addresses', () => {
    expect(normalizeHost(' EXAMPLE.COM ')).toBe('example.com');
    expect(normalizeHost('[2001:DB8::1]')).toBe('2001:db8::1');
  });
});

describe('jump hosts', () => {
  it('rejects cyclic server references', () => {
    const a = { ...server, id: 'a', jumpServerId: 'b' };
    const b = { ...server, id: 'b', jumpServerId: 'a' };
    expect(() => validateJumpGraph([a, b])).toThrow('cycle');
  });

  it('limits jump chains to three hops', () => {
    const a = { ...server, id: 'a', jumpServerId: 'b' };
    const b = { ...server, id: 'b', jumpServerId: 'c' };
    const c = { ...server, id: 'c', jumpServerId: 'd' };
    const d = { ...server, id: 'd', jumpServerId: 'e' };
    const e = { ...server, id: 'e' };
    expect(() => validateJumpGraph([a, b, c, d, e])).toThrow('at most three hops');
  });
});

describe('transfer state', () => {
  it('moves active transfers through terminal outcomes only once', () => {
    expect(nextTransferState('queued', 'start')).toBe('running');
    expect(nextTransferState('running', 'complete')).toBe('completed');
    expect(nextTransferState('completed', 'fail')).toBe('completed');
  });

  it('allows cancellation before completion and preserves cancellation', () => {
    expect(nextTransferState('queued', 'cancel')).toBe('cancelled');
    expect(nextTransferState('running', 'cancel')).toBe('cancelled');
    expect(nextTransferState('cancelled', 'progress')).toBe('cancelled');
  });
});

describe('snippets', () => {
  it('extracts variables and requires values when rendering', () => {
    expect(snippetVariables('deploy {{environment}} to {{host}}')).toEqual(['environment', 'host']);
    expect(renderSnippet('echo {{value}}', { value: 'ok' })).toBe('echo ok');
    expect(() => renderSnippet('echo {{value}}', {})).toThrow('value');
  });
});

describe('pane sizing', () => {
  it('changes a named split ratio within validation bounds', () => {
    const root = splitPane(
      { kind: 'leaf', id: 'one' },
      'one',
      'row',
      { kind: 'leaf', id: 'two' },
      'split',
    );
    expect(resizeSplit(root, 'split', 0.7)).toMatchObject({ ratio: 0.7 });
    expect(() => resizeSplit(root, 'split', 1)).toThrow('ratio');
  });
});
