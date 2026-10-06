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
      'SELECT * FROM keys WHERE id NOT IN (SELECT key_id FROM pending_key_deletions) ORDER BY name COLLATE NOCASE, created_at',
    );
    return rows.map(fromRow);
  }

  async get(id: string): Promise<KeyMetadata | undefined> {
    const row = await this.database.getFirstAsync<KeyRow>(
      'SELECT * FROM keys WHERE id = ? AND id NOT IN (SELECT key_id FROM pending_key_deletions)',
      id,
    );
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

  async beginRemoval(key: Pick<KeyMetadata, 'id' | 'credentialRef'>): Promise<void> {
    await this.database.runAsync(
      'INSERT INTO pending_key_deletions (key_id, credential_ref) VALUES (?, ?) ON CONFLICT(key_id) DO NOTHING',
      key.id,
      key.credentialRef,
    );
  }

  async pendingRemovals(): Promise<Array<{ id: string; credentialRef: string }>> {
    return this.database.getAllAsync(
      'SELECT key_id AS id, credential_ref AS credentialRef FROM pending_key_deletions',
    );
  }

  async remove(id: string): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync('UPDATE servers SET key_id = NULL WHERE key_id = ?', id);
      await transaction.runAsync('DELETE FROM keys WHERE id = ?', id);
      await transaction.runAsync('DELETE FROM pending_key_deletions WHERE key_id = ?', id);
    });
  }
}
