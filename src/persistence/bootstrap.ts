import * as SQLite from 'expo-sqlite';
import { applyMigrations } from './migrations';

/** Opens and migrates only non-secret metadata before feature UI mounts. */
export async function openMetadataDatabase() {
  const database = await SQLite.openDatabaseAsync('termforge-metadata.db');
  await applyMigrations(database);
  return database;
}
