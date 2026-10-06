import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { accessStatus, initialAccess, purchaseMessage, reconcileAccess } from '@/domain/access';
import { safeError } from '@/application/errors';
const source = (name: string) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const registry = source('native/TermforgeNative/TermforgeNativeModule.swift');
const service = source('native/TermforgeNative/TermforgeAccessService.swift');
function method(text: string, name: string) {
  const start = text.indexOf(`func ${name}(`);
  if (start < 0) throw new Error(`Missing ${name}`);
  const body = text.indexOf('{', start);
  let depth = 1;
  let end = body + 1;
  while (depth && end < text.length) {
    if (text[end] === '{') depth++;
    if (text[end] === '}') depth--;
    end++;
  }
  return text.slice(start, end);
}

describe('access UI state and native wiring (source checks, not Apple execution)', () => {
  it('rejects stale startup responses after purchase/revocation events', () => {
    const purchased = { ...initialAccess, state: 'lifetime' as const, revision: 5 };
    expect(reconcileAccess(purchased, { ...initialAccess, revision: 4 })).toBe(purchased);
    const revoked = { ...initialAccess, state: 'expired' as const, revision: 6 };
    expect(reconcileAccess(purchased, revoked)).toBe(revoked);
  });
  it('explains pending/canceled/missing/failed results without suggesting a trial started', () => {
    for (const outcome of [
      'pending',
      'cancelled',
      'unavailable',
      'verificationFailed',
      'restoreFailed',
      'trialAlreadyUsed',
    ]) {
      expect(purchaseMessage(outcome)).toBeTruthy();
    }
    expect(purchaseMessage('pending')).toContain('starts no new trial');
    expect(accessStatus({ ...initialAccess, state: 'trial', warning: true })).toContain(
      'interrupted',
    );
    expect(accessStatus({ ...initialAccess, state: 'expired' })).toContain('local data');
  });
  it('keeps lifetime status independent of product catalog errors', () => {
    expect(
      accessStatus({ ...initialAccess, state: 'lifetime', storeError: 'storeUnavailable' }),
    ).toBe('Lifetime access');
  });
  it('returns only a redacted actionable access error', () => {
    expect(
      safeError({ code: 'ACCESS_REQUIRED', message: 'private host and transaction' }).safeMessage,
    ).toContain('Open Access');
    expect(safeError({ code: 'ACCESS_REQUIRED' }).code).toBe('ACCESS_REQUIRED');
  });
  it('places native admission at creation/connect/input/forward/SFTP boundaries', () => {
    for (const name of [
      'create',
      'connect',
      'sendKey',
      'sendText',
      'write',
      'resize',
      'reserveForward',
      'client',
    ]) {
      expect(method(registry, name), name).toContain(
        'TermforgeAccessService.shared.requireRemoteAccess()',
      );
    }
    expect(method(registry, 'pasteClipboard')).toContain('sendText');
    expect(method(registry, 'beginJumpInspection')).toContain('create()');
    expect(method(registry, 'beginInspection')).toContain('create()');
    expect(method(registry, 'startRemoteForward')).toContain('reserveForward');
    // All remote operations resolve the gated client, including reads and writes.
    for (const name of [
      'listDirectory',
      'renameRemote',
      'removeRemote',
      'createRemoteDirectory',
      'removeRemoteDirectory',
      'readText',
      'writeText',
      'downloadFile',
      'uploadFile',
      'startLocalForward',
    ]) {
      expect(method(registry, name), name).toContain('TermforgeSessionRegistry.shared.client');
    }
    expect(source('native/TermforgeNative/TermforgeHostTrust.swift')).toContain(
      'TermforgeAccessService.shared.requireRemoteAccess()',
    );
  });
  it('uses existing close/cancel paths at expiry without deleting local data or drafts', () => {
    expect(service).toContain('old.state.allowsRemoteWork && !decision.state.allowsRemoteWork');
    expect(service).toContain('teardown?()');
    expect(registry).toContain('TermforgeAccessService.shared.teardown = { self.closeAll() }');
    const close = method(registry, 'close');
    expect(close).toContain('cancelAll');
    expect(close).toContain('session.transports.close()');
    expect(close).not.toMatch(/removeItem|DELETE FROM|deleteKey/);
    expect(service).not.toMatch(/UserDefaults|SQLite|isPro|removeItem/);
  });
  it('keeps bounded, protected local draft copy/export available after remote expiry', () => {
    for (const name of ['copyText', 'saveTextDraftToFiles', 'saveFileToFiles']) {
      const local = method(registry, name);
      expect(local).toContain('TermforgeAppLock.shared.requireUnlocked()');
      expect(local).not.toContain('requireRemoteAccess');
    }
    const draft = method(registry, 'saveTextDraftToFiles');
    expect(draft).toContain('2 * 1024 * 1024');
    expect(draft).toContain('files.temporaryFile()');
    expect(draft).toContain('files.publish');
    expect(draft).toContain('files.discard');
    const editor = source('app/terminal.tsx');
    expect(editor).toContain('Copy draft');
    expect(editor).toContain('Save draft to Files');
    expect(editor).toContain('TermforgeNative.saveTextDraftToFiles(editor.text)');
  });
  it('fetches localized products and verifies expected transactions, with explicit sync only', () => {
    expect(service).toContain('Product.products(for:');
    expect(service).toContain('displayPrice');
    expect(service).toContain('transaction.productType == .nonConsumable');
    expect(service).toContain('transaction.ownershipType == .purchased');
    expect(service).toContain('case .verified(let transaction)');
    expect(service).toContain('Transaction.currentEntitlements');
    expect(service).toContain('Transaction.all');
    expect(service).toContain('Transaction.updates');
    expect(service).toContain('transaction.finish()');
    expect(service.match(/AppStore\.sync\(\)/g)).toHaveLength(1);
    expect(method(service, 'restore')).toContain('AppStore.sync()');
    expect(method(service, 'install')).not.toContain('AppStore.sync()');
    expect(service).not.toMatch(/\$14\.99/);
  });
});
