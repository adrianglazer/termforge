import type { SQLiteDatabase } from 'expo-sqlite';

import type { Snippet } from '@/types/domain';

type SnippetRow = {
  id: string;
  name: string;
  command_template: string;
  description: string;
  category: string;
  favorite: number;
  variables_json: string;
  created_at: string;
  updated_at: string;
};

const fromRow = (row: SnippetRow): Snippet => ({
  id: row.id,
  name: row.name,
  commandTemplate: row.command_template,
  description: row.description,
  category: row.category,
  favorite: Boolean(row.favorite),
  variables: JSON.parse(row.variables_json) as string[],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class SnippetRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async list(): Promise<Snippet[]> {
    const rows = await this.database.getAllAsync<SnippetRow>(
      'SELECT * FROM snippets ORDER BY favorite DESC, category COLLATE NOCASE, name COLLATE NOCASE',
    );
    return rows.map(fromRow);
  }

  async save(snippet: Snippet): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO snippets (id, name, command_template, description, category, favorite, variables_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, command_template = excluded.command_template,
         description = excluded.description, category = excluded.category, favorite = excluded.favorite,
         variables_json = excluded.variables_json, updated_at = excluded.updated_at`,
      snippet.id,
      snippet.name.trim(),
      snippet.commandTemplate,
      snippet.description.trim(),
      snippet.category.trim(),
      snippet.favorite ? 1 : 0,
      JSON.stringify(snippet.variables),
      snippet.createdAt,
      snippet.updatedAt,
    );
  }

  async remove(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM snippets WHERE id = ?', id);
  }
}
