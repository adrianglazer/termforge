import type { KeyMetadata } from '@/types/domain';

export type NativeKeyResult = {
  reference: string;
  algorithm: string;
  publicKey: string;
  fingerprint: string;
  protection: string;
};

export type KeyNativeAdapter = {
  generateEd25519Key(protection: 'userPresence' | 'biometryCurrentSet'): Promise<NativeKeyResult>;
  importEd25519Key(
    openSSH: string,
    passphrase: string,
    protection: 'userPresence' | 'biometryCurrentSet',
  ): Promise<NativeKeyResult>;
  deleteKey(reference: string): Promise<void>;
  copyText(value: string): Promise<void>;
  shareClipboard(): Promise<void>;
};

export type KeyMetadataStore = {
  save(key: KeyMetadata): Promise<void>;
  remove(id: string): Promise<void>;
};

export class KeyManagementController {
  constructor(
    private readonly native: KeyNativeAdapter,
    private readonly store: KeyMetadataStore,
    private readonly makeId: () => string,
    private readonly now: () => string,
  ) {}

  async generate(name: string): Promise<KeyMetadata> {
    return this.saveNativeResult(name, await this.native.generateEd25519Key('userPresence'));
  }

  async import(name: string, openSSH: string, passphrase: string): Promise<KeyMetadata> {
    return this.saveNativeResult(
      name,
      await this.native.importEd25519Key(openSSH, passphrase, 'userPresence'),
    );
  }

  async rename(key: KeyMetadata, name: string): Promise<KeyMetadata> {
    const trimmed = requireName(name);
    const renamed = { ...key, name: trimmed, updatedAt: this.now() };
    await this.store.save(renamed);
    return renamed;
  }

  async remove(key: KeyMetadata): Promise<void> {
    await this.native.deleteKey(key.credentialRef);
    await this.store.remove(key.id);
  }

  async exportPublicKey(key: KeyMetadata): Promise<void> {
    await this.native.copyText(key.publicKey);
    await this.native.shareClipboard();
  }

  private async saveNativeResult(name: string, result: NativeKeyResult): Promise<KeyMetadata> {
    const now = this.now();
    const key: KeyMetadata = {
      id: this.makeId(),
      name: requireName(name),
      algorithm: result.algorithm,
      publicKey: result.publicKey,
      fingerprint: result.fingerprint,
      credentialRef: result.reference,
      protectionPolicy:
        result.protection === 'biometryCurrentSet' ? 'biometry-current-set' : 'user-presence',
      createdAt: now,
      updatedAt: now,
    };
    await this.store.save(key);
    return key;
  }
}

const requireName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Give this SSH key a name.');
  return trimmed;
};
