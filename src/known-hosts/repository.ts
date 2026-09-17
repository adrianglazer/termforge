import type { SQLiteDatabase } from 'expo-sqlite';

import type { KnownHost } from '@/types/domain';

type KnownHostRow = {
  id: string;
  host: string;
  port: number;
  algorithm: string;
  public_key: string;
  fingerprint: string;
  approved_at: string;
};

const fromRow = (row: KnownHostRow): KnownHost => ({
  id: row.id,
  host: row.host,
  port: row.port,
  algorithm: row.algorithm,
  publicKey: row.public_key,
  fingerprint: row.fingerprint,
  approvedAt: row.approved_at,
});

/** Stores only public server identities; credentials and private keys are never part of trust records. */
export class KnownHostRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async list(): Promise<KnownHost[]> {
    const rows = await this.database.getAllAsync<KnownHostRow>(
      'SELECT * FROM known_hosts ORDER BY host COLLATE NOCASE, port, algorithm',
    );
    return rows.map(fromRow);
  }

  async get(host: string, port: number, algorithm: string): Promise<KnownHost | undefined> {
    const row = await this.database.getFirstAsync<KnownHostRow>(
      'SELECT * FROM known_hosts WHERE host = ? AND port = ? AND algorithm = ?',
      normalizeHost(host),
      port,
      algorithm,
    );
    return row ? fromRow(row) : undefined;
  }

  async save(host: Omit<KnownHost, 'id'>): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO known_hosts (id, host, port, algorithm, public_key, fingerprint, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(host, port, algorithm) DO UPDATE SET
         public_key = excluded.public_key, fingerprint = excluded.fingerprint, approved_at = excluded.approved_at`,
      `host-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      normalizeHost(host.host),
      host.port,
      host.algorithm,
      host.publicKey,
      host.fingerprint,
      host.approvedAt,
    );
  }

  async remove(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM known_hosts WHERE id = ?', id);
  }
}

export const normalizeHost = (host: string) =>
  host
    .trim()
    .replace(/^\[(.*)\]$/, '$1')
    .toLowerCase();
