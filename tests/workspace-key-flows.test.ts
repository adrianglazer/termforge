import { describe, expect, it } from 'vitest';

import { KeyManagementController, type KeyNativeAdapter } from '@/keys/controller';
import { decideHostTrust } from '@/known-hosts/trust';
import type { KeyMetadata } from '@/types/domain';
import { splitPane, resizeSplit } from '@/workspaces/paneTree';
import { duplicateWorkspace, zoomedPane } from '@/workspaces/controller';

class ControlledKeyAdapter implements KeyNativeAdapter {
  readonly deleted: string[] = [];
  readonly copied: string[] = [];
  shares = 0;

  async generateEd25519Key() {
    return {
      reference: 'native-generated',
      algorithm: 'ed25519',
      publicKey: 'ssh-ed25519 generated',
      fingerprint: 'SHA256:generated',
      protection: 'userPresence',
    };
  }

  async importEd25519Key(openSSH: string, passphrase: string) {
    expect(openSSH).toContain('PRIVATE KEY');
    expect(passphrase).toBe('passphrase');
    return {
      reference: 'native-imported',
      algorithm: 'ed25519',
      publicKey: 'ssh-ed25519 imported',
      fingerprint: 'SHA256:imported',
      protection: 'biometryCurrentSet',
    };
  }

  async deleteKey(reference: string) {
    this.deleted.push(reference);
  }

  async copyText(value: string) {
    this.copied.push(value);
  }

  async shareClipboard() {
    this.shares += 1;
  }
}

describe('workspace and key-management flows', () => {
  it('persists split/resize intent, provides a zoom target, and duplicates every pane identity', () => {
    const original = {
      id: 'workspace-original',
      name: 'Operations',
      layout: { kind: 'leaf' as const, id: 'pane-one', serverId: 'server-one' },
      tabOrder: ['pane-one'],
      createdAt: '2026-09-17T00:00:00.000Z',
      updatedAt: '2026-09-17T00:00:00.000Z',
    };
    const split = splitPane(
      original.layout,
      'pane-one',
      'row',
      { kind: 'leaf', id: 'pane-two', serverId: 'server-two' },
      'split-one',
    );
    const resized = resizeSplit(split, 'split-one', 0.7);
    const workspace = { ...original, layout: resized, tabOrder: ['pane-one', 'pane-two'] };
    const identifiers = ['workspace-copy', 'split-copy', 'pane-copy-one', 'pane-copy-two'];
    const copy = duplicateWorkspace(
      workspace,
      () => identifiers.shift()!,
      '2026-09-17T00:00:01.000Z',
    );

    expect(zoomedPane(workspace.layout, 'pane-two')).toMatchObject({ serverId: 'server-two' });
    expect(zoomedPane(workspace.layout, undefined)).toBeUndefined();
    expect(workspace.layout).toMatchObject({ kind: 'split', ratio: 0.7 });
    expect(copy).toMatchObject({
      id: 'workspace-copy',
      name: 'Operations copy',
      tabOrder: ['pane-copy-one', 'pane-copy-two'],
    });
    expect(copy.layout).not.toEqual(workspace.layout);
  });

  it('drives protected key generation, import, rename, export, and deletion through adapters', async () => {
    const native = new ControlledKeyAdapter();
    const stored = new Map<string, KeyMetadata>();
    const removed: string[] = [];
    const controller = new KeyManagementController(
      native,
      {
        save: async (key) => void stored.set(key.id, key),
        remove: async (id) => {
          removed.push(id);
          stored.delete(id);
        },
      },
      (() => {
        let next = 0;
        return () => `key-${++next}`;
      })(),
      () => '2026-09-17T00:00:00.000Z',
    );

    const generated = await controller.generate(' Generated ');
    const imported = await controller.import(' Imported ', 'OPENSSH PRIVATE KEY', 'passphrase');
    const renamed = await controller.rename(generated, ' Renamed ');
    await controller.exportPublicKey(imported);
    await controller.remove(renamed);

    expect(generated).toMatchObject({ name: 'Generated', credentialRef: 'native-generated' });
    expect(imported).toMatchObject({
      name: 'Imported',
      protectionPolicy: 'biometry-current-set',
      publicKey: 'ssh-ed25519 imported',
    });
    expect(stored.get(renamed.id)).toBeUndefined();
    expect(native.deleted).toEqual(['native-generated']);
    expect(removed).toEqual([generated.id]);
    expect(native.copied).toEqual(['ssh-ed25519 imported']);
    expect(native.shares).toBe(1);
  });

  it('requires review for new hosts, accepts matching trust, and blocks changed host keys', () => {
    const inspected = { algorithm: 'ssh-ed25519', key: 'AAA', fingerprint: 'SHA256:new' };
    const trusted = {
      id: 'host-1',
      host: 'example.com',
      port: 22,
      algorithm: 'ssh-ed25519',
      publicKey: 'AAA',
      fingerprint: 'SHA256:old',
      approvedAt: '2026-09-17T00:00:00.000Z',
    };

    expect(decideHostTrust(undefined, inspected).status).toBe('review');
    expect(decideHostTrust(trusted, inspected).status).toBe('trusted');
    expect(decideHostTrust({ ...trusted, publicKey: 'DIFFERENT' }, inspected)).toMatchObject({
      status: 'changed',
      knownHost: { fingerprint: 'SHA256:old' },
    });
  });
});
