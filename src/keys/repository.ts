import type { SQLiteDatabase } from 'expo-sqlite';

import type { KeyMetadata } from '@/types/domain';

type KeyRow = {
  id: string;
  name: string;
  algorithm: string;
  public_key: string;
  fingerprint: string;
  credential_ref: string;
  protection_policy: KeyMetadata['protectionPolicy'];
  created_at: string;
  updated_at: string;
};

const fromRow = (row: KeyRow): KeyMetadata => ({
  id: row.id,
  name: row.name,
  algorithm: row.algorithm,
  publicKey: row.public_key,
  fingerprint: row.fingerprint,
  credentialRef: row.credential_ref,
  protectionPolicy: row.protection_policy,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Stores only display metadata and the opaque native Keychain reference. */
export class KeyRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async list(): Promise<KeyMetadata[]> {
    const rows = await this.database.getAllAsync<KeyRow>(
      'SELECT * FROM keys ORDER BY name COLLATE NOCASE, created_at',
    );
    return rows.map(fromRow);
  }

  async get(id: string): Promise<KeyMetadata | undefined> {
    const row = await this.database.getFirstAsync<KeyRow>('SELECT * FROM keys WHERE id = ?', id);
    return row ? fromRow(row) : undefined;
  }

  async save(key: KeyMetadata): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO keys (id, name, algorithm, public_key, fingerprint, credential_ref, protection_policy, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`,
      key.id,
      key.name.trim(),
      key.algorithm,
      key.publicKey,
      key.fingerprint,
      key.credentialRef,
      key.protectionPolicy,
      key.createdAt,
      key.updatedAt,
    );
  }

  async remove(id: string): Promise<void> {
    await this.database.runAsync('UPDATE servers SET key_id = NULL WHERE key_id = ?', id);
    await this.database.runAsync('DELETE FROM keys WHERE id = ?', id);
  }
}
