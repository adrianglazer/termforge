import { describe, expect, it, vi } from 'vitest';
import { AppError, safeError } from '@/application/errors';
import { checkEndpointTrust, trustEndpointId } from '@/known-hosts/trust';
import { createExport, parseImport } from '@/storage/export';
import { logger } from '@/logging/logger';

const server = {
  id: 's1',
  name: 'Host',
  host: ' HOST.EXAMPLE ',
  port: 22,
  username: 'user',
  authMethod: 'key' as const,
  timeoutSeconds: 15,
  keepaliveSeconds: 30,
  reconnect: false,
  terminalType: 'xterm-256color',
  createdAt: 'now',
  updatedAt: 'now',
};
const configuration = () => ({
  version: 1,
  servers: [server],
  snippets: [],
  workspaces: [],
  themes: ['dark'],
  settings: { theme: 'dark', autoLockMinutes: 5 },
});

describe('security review: portable configuration boundary', () => {
  it('rebuilds an allowlist recursively and detaches exported data from application state', () => {
    const data = {
      ...configuration(),
      servers: [
        {
          ...server,
          keyId: 'private-ref',
          password: 'hidden',
          startupCommand: 'run-me',
          environment: { SECRET: 'hidden' },
        },
      ],
      snippets: [
        {
          id: 'snippet',
          name: 'Example',
          commandTemplate: 'echo ok',
          description: '',
          category: '',
          favorite: false,
          variables: [],
          createdAt: 'now',
          updatedAt: 'now',
          password: 'hidden',
        },
      ],
      workspaces: [
        {
          id: 'workspace',
          name: 'Main',
          tabOrder: ['pane'],
          createdAt: 'now',
          updatedAt: 'now',
          credentialRef: 'hidden',
          layout: {
            kind: 'leaf' as const,
            id: 'pane',
            serverId: 's1',
            terminalOverrides: { password: 'hidden' },
            runtimeSession: 'hidden',
          },
        },
      ],
      settings: { theme: 'dark', autoLockMinutes: 5, credentialRef: 'hidden' },
      knownHosts: [{ publicKey: 'injected-trust' }],
    };
    for (const result of [parseImport(data), createExport(data)]) {
      expect(JSON.stringify(result)).not.toMatch(
        /hidden|private-ref|run-me|runtimeSession|knownHosts|terminalOverrides|environment/,
      );
      expect(result.servers[0]?.host).toBe('host.example');
      expect(result.snippets[0]?.commandTemplate).toBe('echo ok');
      result.snippets[0]!.variables.push('changed');
      expect(data.snippets[0]!.variables).toEqual([]);
    }
  });

  it.each([
    { authMethod: 'unsupported' },
    { port: '22' },
    { reconnect: 'false' },
    { timeoutSeconds: -1 },
    { jumpServerId: 'missing' },
    { host: null },
    { credentialRef: 'injected-keychain-ref' },
  ])('rejects malformed server fields: %j', (patch) => {
    expect(() => parseImport({ ...configuration(), servers: [{ ...server, ...patch }] })).toThrow(
      AppError,
    );
  });

  it.each([
    { kind: 'split', id: 'x', axis: 'row', ratio: 0.5, children: [] },
    { kind: 'unknown', id: 'x' },
    { kind: 'leaf', id: 'x', serverId: 'missing' },
    {
      kind: 'split',
      id: 'x',
      axis: 'diagonal',
      ratio: 0.5,
      children: [
        { kind: 'leaf', id: 'a' },
        { kind: 'leaf', id: 'b' },
      ],
    },
  ])('rejects malformed or dangling pane layouts: %j', (layout) => {
    expect(() =>
      parseImport({
        ...configuration(),
        workspaces: [
          { id: 'w', name: 'Main', layout, tabOrder: [], createdAt: 'now', updatedAt: 'now' },
        ],
      }),
    ).toThrow(AppError);
  });

  it('rejects duplicate identities, cyclic input, invalid settings, and oversized UTF-8 content', () => {
    expect(() => parseImport({ ...configuration(), servers: [server, server] })).toThrow(AppError);
    const cycle: Record<string, unknown> = configuration();
    cycle.self = cycle;
    expect(() => parseImport(cycle)).toThrow(AppError);
    expect(() =>
      parseImport({ ...configuration(), settings: { theme: 'dark', autoLockMinutes: 0 } }),
    ).toThrow(AppError);
    expect(() => parseImport({ ...configuration(), extra: '界'.repeat(350_000) })).toThrow(
      'too large',
    );
  });
});

describe('security review: endpoint trust and diagnostic values', () => {
  const known = {
    id: 'known',
    host: 'jump.example',
    port: 22,
    algorithm: 'ssh-ed25519',
    publicKey: 'original',
    fingerprint: 'SHA256:old',
    approvedAt: 'now',
  };
  it('rejects changed bastion keys and algorithm switching at a known endpoint', () => {
    expect(() =>
      checkEndpointTrust([known], ' JUMP.EXAMPLE ', 22, {
        algorithm: 'ssh-ed25519',
        key: 'attacker',
        fingerprint: 'SHA256:bad',
      }),
    ).toThrow(AppError);
    expect(() =>
      checkEndpointTrust([known], 'jump.example', 22, {
        algorithm: 'ssh-rsa',
        key: 'new',
        fingerprint: 'SHA256:new',
      }),
    ).toThrow(AppError);
    expect(
      checkEndpointTrust([known], 'jump.example', 22, {
        algorithm: 'ssh-ed25519',
        key: 'original',
        fingerprint: 'SHA256:old',
      }).status,
    ).toBe('trusted');
    const form = {
      host: 'target',
      port: '22',
      useJump: true,
      jumpHost: 'jump.example',
      jumpPort: '22',
    };
    expect(trustEndpointId(form)).not.toBe(trustEndpointId({ ...form, jumpPort: '2222' }));
  });

  it('does not treat inherited properties or custom AppError messages as safe diagnostics', () => {
    expect(safeError({ code: 'constructor' }).code).toBe('UNSUPPORTED');
    expect(safeError(new AppError('AUTH_FAILED', 'private-password')).safeMessage).not.toContain(
      'private-password',
    );
    const output = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      logger.error(
        'private-host',
        { attempt: 'private-password', operationId: 'private-key', bytes: 4 },
        Object.assign(new Error('private-message'), { code: 'private-token' }),
      );
      expect(output.mock.calls[0]?.[0]).not.toContain('private');
      expect(JSON.parse(output.mock.calls[0]?.[0] as string)).toEqual({
        event: 'application_error',
        bytes: 4,
        code: 'UNSUPPORTED',
      });
    } finally {
      output.mockRestore();
    }
  });
});
