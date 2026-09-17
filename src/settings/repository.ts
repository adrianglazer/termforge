import type { SQLiteDatabase } from 'expo-sqlite';

import type { Settings } from '@/types/domain';

export class SettingsRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async get(): Promise<Settings> {
    const existing = await this.database.getFirstAsync<Settings>(
      "SELECT id, theme, auto_lock_minutes AS autoLockMinutes, terminal_font_size AS terminalFontSize, scrollback_lines AS scrollbackLines, accessory_preset AS accessoryPreset, version, updated_at AS updatedAt FROM settings WHERE id = 'default'",
    );
    if (existing) return existing;
    const value: Settings = {
      id: 'default',
      theme: 'Default Dark',
      autoLockMinutes: 5,
      terminalFontSize: 14,
      scrollbackLines: 10_000,
      accessoryPreset: 'extended',
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    await this.save(value);
    return value;
  }

  async save(settings: Settings): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO settings (id, theme, auto_lock_minutes, terminal_font_size, scrollback_lines, accessory_preset, version, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET theme = excluded.theme, auto_lock_minutes = excluded.auto_lock_minutes,
         terminal_font_size = excluded.terminal_font_size, scrollback_lines = excluded.scrollback_lines, accessory_preset = excluded.accessory_preset, version = excluded.version, updated_at = excluded.updated_at`,
      settings.id,
      settings.theme,
      settings.autoLockMinutes,
      settings.terminalFontSize,
      settings.scrollbackLines,
      settings.accessoryPreset,
      settings.version,
      settings.updatedAt,
    );
  }
}
