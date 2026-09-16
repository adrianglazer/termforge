export type Migration = { version: number; sql: readonly string[] };
export const migrations: readonly Migration[] = [
  {
    version: 1,
    sql: [
      'PRAGMA foreign_keys = ON',
      'PRAGMA journal_mode = WAL',
      'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL)',
      'CREATE TABLE IF NOT EXISTS servers (id TEXT PRIMARY KEY, name TEXT NOT NULL, host TEXT NOT NULL, port INTEGER NOT NULL, username TEXT NOT NULL, auth_method TEXT NOT NULL, key_id TEXT, jump_server_id TEXT, timeout_seconds INTEGER NOT NULL, keepalive_seconds INTEGER NOT NULL, reconnect INTEGER NOT NULL, terminal_type TEXT NOT NULL, startup_command TEXT, environment_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS keys (id TEXT PRIMARY KEY, name TEXT NOT NULL, algorithm TEXT NOT NULL, fingerprint TEXT NOT NULL, credential_ref TEXT NOT NULL, protection_policy TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, layout_json TEXT NOT NULL, tab_order_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS snippets (id TEXT PRIMARY KEY, name TEXT NOT NULL, command_template TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, favorite INTEGER NOT NULL, variables_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS known_hosts (id TEXT PRIMARY KEY, host TEXT NOT NULL, port INTEGER NOT NULL, algorithm TEXT NOT NULL, public_key TEXT NOT NULL, fingerprint TEXT NOT NULL, approved_at TEXT NOT NULL, UNIQUE(host, port, algorithm))',
      "CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY CHECK(id = 'default'), theme TEXT NOT NULL, auto_lock_minutes INTEGER NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL)",
      'CREATE TABLE IF NOT EXISTS connection_history (id TEXT PRIMARY KEY, server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE, started_at TEXT NOT NULL, ended_at TEXT, outcome TEXT NOT NULL)',
    ],
  },
];
export interface SqlExecutor {
  execAsync(sql: string): Promise<unknown>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
  runAsync(sql: string, ...params: unknown[]): Promise<unknown>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
export async function applyMigrations(db: SqlExecutor): Promise<void> {
  // The migration ledger must exist before we can ask it for the current version.
  // Keeping this in the connection bootstrap also makes a brand-new database safe.
  await db.execAsync(
    'PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL);',
  );
  const current = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) AS version FROM schema_migrations',
  );
  for (const migration of migrations.filter((item) => item.version > (current?.version ?? 0)))
    await db.withTransactionAsync(async () => {
      for (const sql of migration.sql) await db.execAsync(sql);
      await db.runAsync('INSERT INTO schema_migrations(version) VALUES (?)', migration.version);
    });
}
