import type { SQLiteDatabase } from 'expo-sqlite';

import type { ConnectionHistory } from '@/types/domain';

type HistoryRow = {
  id: string;
  server_id: string;
  started_at: string;
  ended_at: string | null;
  outcome: ConnectionHistory['outcome'];
};

const fromRow = (row: HistoryRow): ConnectionHistory => ({
  id: row.id,
  serverId: row.server_id,
  startedAt: row.started_at,
  ...(row.ended_at ? { endedAt: row.ended_at } : {}),
  outcome: row.outcome,
});

/** Bounded operational history; deliberately excludes terminal content and credentials. */
export class ConnectionHistoryRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async list(limit = 100): Promise<ConnectionHistory[]> {
    const rows = await this.database.getAllAsync<HistoryRow>(
      'SELECT * FROM connection_history ORDER BY started_at DESC LIMIT ?',
      Math.min(Math.max(limit, 1), 500),
    );
    return rows.map(fromRow);
  }

  async save(entry: ConnectionHistory): Promise<void> {
    await this.database.runAsync(
      'INSERT INTO connection_history (id, server_id, started_at, ended_at, outcome) VALUES (?, ?, ?, ?, ?)',
      entry.id,
      entry.serverId,
      entry.startedAt,
      entry.endedAt ?? null,
      entry.outcome,
    );
    await this.database.runAsync(
      'DELETE FROM connection_history WHERE id NOT IN (SELECT id FROM connection_history ORDER BY started_at DESC LIMIT 500)',
    );
  }
}
