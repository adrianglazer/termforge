import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const native = (name: string) =>
  readFileSync(new URL(`../native/TermforgeNative/${name}.swift`, import.meta.url), 'utf8');

describe('native authentication lifecycle wiring', () => {
  it('waits for temporary inactivity without allowing a lock or background transition', () => {
    const source = native('TermforgeAppLock');
    const wait = source.slice(
      source.indexOf('func waitUntilActive()'),
      source.indexOf('func lock()'),
    );
    expect(wait).toContain('try Task.checkCancellation()');
    expect(wait).toContain('!locked, revision == expectedRevision');
    expect(wait).toContain('applicationState != .background');
    expect(wait.indexOf('revision == expectedRevision')).toBeLessThan(
      wait.indexOf('applicationState == .active'),
    );
    expect(wait).toContain('try await Task<Never, Never>.sleep');
    expect(source).toContain(
      'observe(UIApplication.didEnterBackgroundNotification) { self.lock() }',
    );
    expect(source).toContain('TermforgeKeyAccess.shared.cancel()');
  });

  it('rechecks foreground, lock revision, session and trust after obtaining a credential', () => {
    const source = native('TermforgeHostTrust');
    const check = source.slice(
      source.indexOf('func checkCurrent()'),
      source.indexOf('func validateHostKey'),
    );
    expect(check.indexOf('waitUntilActive()')).toBeLessThan(check.indexOf('requireUnlocked()'));
    expect(check).toContain('revision == self.lockRevision');
    expect(check).toContain('isCurrent(id: self.sessionId, generation: self.generation)');
    expect(check).toContain('TermforgeTrustSnapshot.read(host: host, port: port) == snapshot');
    expect(source).toMatch(
      /let offer = try await provider\(\)\s+try await lease.checkCurrent\(\)\s+nextChallengePromise.succeed\(offer\)/,
    );
  });

  it('waits before the second prompt for an encrypted key and reads Keychain off the main actor', () => {
    const prompt = native('TermforgeCredentialPrompt');
    const request = prompt.slice(
      prompt.indexOf('func request('),
      prompt.indexOf('private func finish('),
    );
    expect(request.indexOf('waitUntilActive()')).toBeLessThan(
      request.indexOf('applicationState == .active'),
    );
    expect(request).toContain('TermforgeSessionRegistry.shared.contains(id: sessionId)');
    const module = native('TermforgeNativeModule');
    expect(module).toMatch(/var raw = try await Task.detached \{\s+try self.loadPrivateKey/);
    expect(module).toContain('defer { raw.resetBytes(in: 0..<raw.count) }');
  });
});
