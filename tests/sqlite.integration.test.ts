import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { ConnectionHistoryRepository } from '@/history/repository';
import { KeyRepository } from '@/keys/repository';
import { KnownHostRepository } from '@/known-hosts/repository';
import { applyMigrations, migrations, type SqlExecutor } from '@/persistence/migrations';
import { ServerRepository } from '@/servers/repository';
import { SettingsRepository } from '@/settings/repository';
import { SnippetRepository } from '@/snippets/repository';
import type { KeyMetadata, Server, Workspace } from '@/types/domain';
import { duplicateWorkspace } from '@/workspaces/controller';
import { resizeSplit, splitPane } from '@/workspaces/paneTree';
import { WorkspaceRepository } from '@/workspaces/repository';

type Sqlite = Database.Database;

const temporaryDirectories: string[] = [];

afterEach(() => {
  while (temporaryDirectories.length) rmSync(temporaryDirectories.pop()!, { recursive: true });
});

function createExecutor(
  sqlite: Sqlite,
): SqlExecutor & { getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> } {
  return {
    execAsync: async (sql) => sqlite.exec(sql),
    getFirstAsync: async <T>(sql: string, ...params: unknown[]) =>
      (sqlite.prepare(sql).get(...params) as T | undefined) ?? null,
    getAllAsync: async <T>(sql: string, ...params: unknown[]) =>
      sqlite.prepare(sql).all(...params) as T[],
    runAsync: async (sql, ...params) => sqlite.prepare(sql).run(...params),
    withTransactionAsync: async (task) => {
      sqlite.exec('BEGIN');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

async function openTemporaryDatabase() {
  const directory = mkdtempSync(join(tmpdir(), 'termforge-sqlite-'));
  temporaryDirectories.push(directory);
  const path = join(directory, 'metadata.db');
  const sqlite = new Database(path);
  const executor = createExecutor(sqlite);
  await applyMigrations(executor);
  return { path, sqlite, database: executor };
}

const server: Server = {
  id: 'server-1',
  name: ' Production ',
  host: ' EXAMPLE.COM ',
  port: 22,
  username: ' deploy ',
  authMethod: 'key',
  keyId: 'key-1',
  timeoutSeconds: 10,
  keepaliveSeconds: 30,
  reconnect: true,
  terminalType: 'xterm-256color',
  startupCommand: 'tmux attach',
  environment: { LANG: 'C.UTF-8' },
  createdAt: '2026-09-17T00:00:00.000Z',
  updatedAt: '2026-09-17T00:00:00.000Z',
};

const key: KeyMetadata = {
  id: 'key-1',
  name: ' Deployment ',
  algorithm: 'ed25519',
  publicKey: 'ssh-ed25519 AAAA termforge',
  fingerprint: 'SHA256:example',
  credentialRef: 'opaque-keychain-reference',
  protectionPolicy: 'user-presence',
  createdAt: '2026-09-17T00:00:00.000Z',
  updatedAt: '2026-09-17T00:00:00.000Z',
};

describe('real SQLite migrations and repositories', () => {
  it('migrates a persistent database and restores every metadata repository after reopen', async () => {
    const { path, sqlite, database } = await openTemporaryDatabase();
    const servers = new ServerRepository(database as never);
    const keys = new KeyRepository(database as never);
    const knownHosts = new KnownHostRepository(database as never);
    const workspaces = new WorkspaceRepository(database as never);
    const snippets = new SnippetRepository(database as never);
    const settings = new SettingsRepository(database as never);
    const history = new ConnectionHistoryRepository(database as never);

    await keys.save(key);
    await servers.save(server);
    await knownHosts.save({
      host: ' EXAMPLE.COM ',
      port: 22,
      algorithm: 'ssh-ed25519',
      publicKey: 'AAAAB3Nza',
      fingerprint: 'SHA256:host-one',
      approvedAt: '2026-09-17T00:00:01.000Z',
    });
    await knownHosts.save({
      host: 'example.com',
      port: 22,
      algorithm: 'ssh-ed25519',
      publicKey: 'AAAAB3Nza-updated',
      fingerprint: 'SHA256:host-two',
      approvedAt: '2026-09-17T00:00:02.000Z',
    });
    const splitLayout = resizeSplit(
      splitPane(
        { kind: 'leaf', id: 'pane-1', serverId: server.id, title: 'Production' },
        'pane-1',
        'row',
        { kind: 'leaf', id: 'pane-2', title: 'Disconnected terminal' },
        'split-1',
      ),
      'split-1',
      0.7,
    );
    const workspace: Workspace = {
      id: 'workspace-1',
      name: ' Main ',
      layout: splitLayout,
      tabOrder: ['pane-1', 'pane-2'],
      createdAt: '2026-09-17T00:00:00.000Z',
      updatedAt: '2026-09-17T00:00:03.000Z',
    };
    await workspaces.save(workspace);
    const copyIds = ['workspace-2', 'split-2', 'pane-3', 'pane-4'];
    await workspaces.save(
      duplicateWorkspace(workspace, () => copyIds.shift()!, '2026-09-17T00:00:03.500Z'),
    );
    await snippets.save({
      id: 'snippet-1',
      name: ' Deploy ',
      commandTemplate: 'deploy {{environment}}',
      description: ' Deploy safely ',
      category: ' Operations ',
      favorite: true,
      variables: ['environment'],
      createdAt: '2026-09-17T00:00:00.000Z',
      updatedAt: '2026-09-17T00:00:04.000Z',
    });
    const currentSettings = await settings.get();
    await settings.save({ ...currentSettings, theme: 'Dracula', terminalFontSize: 18, version: 2 });
    await history.save({
      id: 'history-1',
      serverId: server.id,
      startedAt: '2026-09-17T00:00:05.000Z',
      outcome: 'success',
    });

    sqlite.close();
    const reopened = new Database(path);
    const reopenedDatabase = createExecutor(reopened);
    await applyMigrations(reopenedDatabase);

    expect(await new ServerRepository(reopenedDatabase as never).get(server.id)).toMatchObject({
      name: 'Production',
      host: 'example.com',
      username: 'deploy',
      environment: { LANG: 'C.UTF-8' },
    });
    expect(await new KeyRepository(reopenedDatabase as never).list()).toMatchObject([
      { name: 'Deployment', credentialRef: 'opaque-keychain-reference' },
    ]);
    expect(await new KnownHostRepository(reopenedDatabase as never).list()).toEqual([
      expect.objectContaining({ host: 'example.com', fingerprint: 'SHA256:host-two' }),
    ]);
    expect(await new WorkspaceRepository(reopenedDatabase as never).list()).toEqual([
      expect.objectContaining({
        id: 'workspace-2',
        name: 'Main copy',
        layout: expect.objectContaining({ kind: 'split', ratio: 0.7 }),
        tabOrder: ['pane-3', 'pane-4'],
      }),
      expect.objectContaining({
        name: 'Main',
        layout: workspace.layout,
        tabOrder: ['pane-1', 'pane-2'],
      }),
    ]);
    expect(await new SnippetRepository(reopenedDatabase as never).list()).toMatchObject([
      { name: 'Deploy', description: 'Deploy safely', category: 'Operations', favorite: true },
    ]);
    expect(await new SettingsRepository(reopenedDatabase as never).get()).toMatchObject({
      theme: 'Dracula',
      terminalFontSize: 18,
      version: 2,
    });
    expect(await new ConnectionHistoryRepository(reopenedDatabase as never).list()).toEqual([
      expect.objectContaining({ serverId: server.id, outcome: 'success' }),
    ]);

    await new KeyRepository(reopenedDatabase as never).remove(key.id);
    expect(await new ServerRepository(reopenedDatabase as never).get(server.id)).not.toHaveProperty(
      'keyId',
    );
    await new ServerRepository(reopenedDatabase as never).remove(server.id);
    expect(await new ConnectionHistoryRepository(reopenedDatabase as never).list()).toEqual([]);
    reopened.close();
  });

  it('rolls back a failed migration without advancing the migration ledger', async () => {
    const { sqlite } = await openTemporaryDatabase();
    sqlite.exec('DROP TABLE settings');
    sqlite.exec('DROP TABLE keys');
    sqlite.exec('DROP TABLE schema_migrations');
    sqlite.exec('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY NOT NULL)');
    for (const sql of migrations[0]!.sql) sqlite.exec(sql);
    sqlite.prepare('INSERT INTO schema_migrations(version) VALUES (?)').run(1);

    const database = createExecutor(sqlite);
    const failingDatabase: SqlExecutor = {
      ...database,
      execAsync: async (sql) => {
        if (sql.startsWith('ALTER TABLE keys ADD COLUMN public_key'))
          throw new Error('injected failure');
        return database.execAsync(sql);
      },
    };

    await expect(applyMigrations(failingDatabase)).rejects.toThrow('injected failure');
    expect(sqlite.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()).toEqual({
      version: 1,
    });
    expect(sqlite.prepare('PRAGMA table_info(keys)').all()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'public_key' })]),
    );
    sqlite.close();
  });
});
