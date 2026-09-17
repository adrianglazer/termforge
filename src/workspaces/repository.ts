import type { SQLiteDatabase } from 'expo-sqlite';

import type { Workspace } from '@/types/domain';
import { validatePaneTree } from '@/validation/domain';

type WorkspaceRow = {
  id: string;
  name: string;
  layout_json: string;
  tab_order_json: string;
  created_at: string;
  updated_at: string;
};

const fromRow = (row: WorkspaceRow): Workspace => ({
  id: row.id,
  name: row.name,
  layout: validatePaneTree(JSON.parse(row.layout_json) as Workspace['layout']),
  tabOrder: JSON.parse(row.tab_order_json) as string[],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Restores pane definitions only. Live SSH sessions always reconnect explicitly after relaunch. */
export class WorkspaceRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async list(): Promise<Workspace[]> {
    const rows = await this.database.getAllAsync<WorkspaceRow>(
      'SELECT * FROM workspaces ORDER BY updated_at DESC',
    );
    return rows.map(fromRow);
  }

  async save(workspace: Workspace): Promise<void> {
    const layout = validatePaneTree(workspace.layout);
    await this.database.runAsync(
      `INSERT INTO workspaces (id, name, layout_json, tab_order_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, layout_json = excluded.layout_json,
         tab_order_json = excluded.tab_order_json, updated_at = excluded.updated_at`,
      workspace.id,
      workspace.name.trim(),
      JSON.stringify(layout),
      JSON.stringify(workspace.tabOrder),
      workspace.createdAt,
      workspace.updatedAt,
    );
  }

  async remove(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM workspaces WHERE id = ?', id);
  }
}
