import type { SQLiteDatabase } from 'expo-sqlite';

import type { Server } from '@/types/domain';
import { validateServer } from '@/validation/domain';

type ServerRow = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_method: Server['authMethod'];
  key_id: string | null;
  jump_server_id: string | null;
  timeout_seconds: number;
  keepalive_seconds: number;
  reconnect: number;
  terminal_type: string;
  startup_command: string | null;
  environment_json: string | null;
  created_at: string;
  updated_at: string;
};

const fromRow = (row: ServerRow): Server => ({
  id: row.id,
  name: row.name,
  host: row.host,
  port: row.port,
  username: row.username,
  authMethod: row.auth_method,
  ...(row.key_id ? { keyId: row.key_id } : {}),
  ...(row.jump_server_id ? { jumpServerId: row.jump_server_id } : {}),
  timeoutSeconds: row.timeout_seconds,
  keepaliveSeconds: row.keepalive_seconds,
  reconnect: Boolean(row.reconnect),
  terminalType: row.terminal_type,
  ...(row.startup_command ? { startupCommand: row.startup_command } : {}),
  ...(row.environment_json
    ? { environment: JSON.parse(row.environment_json) as Record<string, string> }
    : {}),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Persistent, non-secret connection profiles. Passwords and private keys never enter this store. */
export class ServerRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async list(): Promise<Server[]> {
    const rows = await this.database.getAllAsync<ServerRow>(
      'SELECT * FROM servers ORDER BY name COLLATE NOCASE, created_at',
    );
    return rows.map(fromRow);
  }

  async get(id: string): Promise<Server | undefined> {
    const row = await this.database.getFirstAsync<ServerRow>(
      'SELECT * FROM servers WHERE id = ?',
      id,
    );
    return row ? fromRow(row) : undefined;
  }

  async save(input: Server): Promise<Server> {
    const server = validateServer(input);
    await this.database.runAsync(
      `INSERT INTO servers (
        id, name, host, port, username, auth_method, key_id, jump_server_id,
        timeout_seconds, keepalive_seconds, reconnect, terminal_type, startup_command,
        environment_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, host = excluded.host, port = excluded.port,
        username = excluded.username, auth_method = excluded.auth_method, key_id = excluded.key_id,
        jump_server_id = excluded.jump_server_id, timeout_seconds = excluded.timeout_seconds,
        keepalive_seconds = excluded.keepalive_seconds, reconnect = excluded.reconnect,
        terminal_type = excluded.terminal_type, startup_command = excluded.startup_command,
        environment_json = excluded.environment_json, updated_at = excluded.updated_at`,
      server.id,
      server.name,
      server.host,
      server.port,
      server.username,
      server.authMethod,
      server.keyId ?? null,
      server.jumpServerId ?? null,
      server.timeoutSeconds,
      server.keepaliveSeconds,
      server.reconnect ? 1 : 0,
      server.terminalType,
      server.startupCommand ?? null,
      server.environment ? JSON.stringify(server.environment) : null,
      server.createdAt,
      server.updatedAt,
    );
    return server;
  }

  async remove(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM servers WHERE id = ?', id);
  }
}
