import { describe, expect, it } from 'vitest';
import { applyMigrations, migrations, type SqlExecutor } from '@/persistence/migrations';

describe('migrations', () => {
  it('applies numbered migrations transactionally once', async () => {
    const statements: string[] = [];
    let version: number | undefined;
    const db: SqlExecutor = {
      execAsync: async (sql) => void statements.push(sql),
      getFirstAsync: async <T>() => (version === undefined ? null : ({ version } as T)),
      runAsync: async (_sql, nextVersion) => void (version = Number(nextVersion)),
      withTransactionAsync: async (task) => task(),
    };
    await applyMigrations(db);
    expect(statements[0]).toContain('CREATE TABLE IF NOT EXISTS schema_migrations');
    expect(version).toBe(migrations.at(-1)?.version);
    expect(statements.join('\n')).toContain('CREATE TABLE IF NOT EXISTS servers');
    const afterFirstRun = statements.length;
    await applyMigrations(db);
    expect(statements).toHaveLength(afterFirstRun + 1); // connection pragmas are reapplied
  });
});
