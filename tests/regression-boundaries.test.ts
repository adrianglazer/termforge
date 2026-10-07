import { describe, expect, it, vi } from 'vitest';

import { safeError } from '@/application/errors';
import { logger } from '@/logging/logger';
import { parseImport } from '@/storage/export';
import { retainTerminalOutput, validateTerminalInput } from '@/terminal/bounds';

describe('regression boundaries', () => {
  it('accepts malformed or truncated escape sequences without retaining unbounded output', () => {
    const malformed = `before\u001b[38;5;999;${'x'.repeat(20_000)}\u001b`;
    expect(() => validateTerminalInput(malformed.slice(0, 16 * 1024))).not.toThrow();
    const retained = retainTerminalOutput(malformed, 512);
    expect(new TextEncoder().encode(retained).byteLength).toBeLessThanOrEqual(512);
    expect(retained.endsWith('\u001b')).toBe(true);
  });

  it('rejects imported credential references instead of trusting portable data', () => {
    expect(() =>
      parseImport({
        version: 1,
        servers: [
          {
            id: 'server-1',
            name: 'Server',
            host: 'example.com',
            port: 22,
            username: 'user',
            authMethod: 'key',
            credentialRef: 'secret-reference',
            timeoutSeconds: 10,
            keepaliveSeconds: 30,
            reconnect: false,
            terminalType: 'xterm-256color',
            createdAt: 'now',
            updatedAt: 'now',
          },
        ],
        snippets: [],
        workspaces: [],
        themes: [],
        settings: { theme: 'dark', autoLockMinutes: 5 },
      }),
    ).toThrow('Credentials cannot be part of server state');
  });

  it('omits sensitive logger context while retaining the safe error code', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      logger.error(
        'connection_failed',
        {
          host: 'example.com',
          password: 'do-not-log',
          output: 'private terminal text',
          reason: 'password=hidden-under-an-innocent-key',
          attempt: 2,
        },
        new Error('safe failure'),
      );
      const line = output.mock.calls[0]?.[0] as string;
      expect(line).toContain('connection_failed');
      expect(line).toContain('"attempt":2');
      expect(line).not.toContain('example.com');
      expect(line).not.toContain('do-not-log');
      expect(line).not.toContain('private terminal text');
      expect(line).not.toContain('hidden-under-an-innocent-key');
    } finally {
      output.mockRestore();
    }
  });

  it('maps native error codes to fixed messages and drops raw exception details', () => {
    const mapped = safeError({
      code: 'PATH_REJECTED',
      message: 'server rejected /private/path/with-a-secret',
    });
    const unknown = safeError(new Error('password=secret; host=private.example'));

    expect(mapped.safeMessage).toBe('The selected path is not allowed.');
    expect(mapped.safeMessage).not.toContain('/private/path');
    expect(unknown.safeMessage).toBe('The operation could not be completed.');
    expect(unknown.safeMessage).not.toContain('secret');
  });

  it('recognizes Expo codes from native inspection errors', () => {
    expect(safeError({ code: 'ERR_A_CC_ES_S__RE_QU_IR_ED' })).toMatchObject({
      code: 'ACCESS_REQUIRED',
      safeMessage:
        'Open Access to start or restore a trial or lifetime purchase. Your local data remains available.',
    });
    expect(safeError({ code: 'ERR_H_OS_T__KE_Y__UN_KN_OW_N' })).toMatchObject({
      code: 'HOST_KEY_UNKNOWN',
      safeMessage: 'The server identity has not been approved.',
    });
  });
});
