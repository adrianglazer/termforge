import * as SQLite from 'expo-sqlite';
import { TermforgeNative } from '@/native/termforgeNative';
import { AppError } from '@/application/errors';
import { applyMigrations } from './migrations';

let opening: Promise<SQLite.SQLiteDatabase> | undefined;
let blocked = false;
let closing: Promise<void> = Promise.resolve();

/** One connection/migration writer; protection failures prevent opening storage. */
export function openMetadataDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (blocked)
    return Promise.reject(new AppError('KEY_LOCKED', 'Unlock Termforge to access metadata.'));
  const previousClose = closing;
  opening ??= (async () => {
    await previousClose;
    if (blocked) throw new AppError('KEY_LOCKED', 'Unlock Termforge to access metadata.');
    const directory = await TermforgeNative.prepareMetadataStorage();
    const database = await SQLite.openDatabaseAsync('termforge-metadata.db', {}, directory);
    try {
      await applyMigrations(database);
      // Cover pre-existing files and newly created database/WAL/SHM files.
      await TermforgeNative.prepareMetadataStorage();
      return database;
    } catch (error) {
      await database.closeAsync();
      throw error;
    }
  })().catch((error: unknown) => {
    opening = undefined;
    throw error;
  });
  return opening;
}

/** Stop admitting new queries before closing the shared connection on app lock. */
export async function suspendMetadataStorage(): Promise<void> {
  blocked = true;
  const pending = opening;
  opening = undefined;
  closing = closing
    .then(async () => {
      const database = await pending?.catch(() => undefined);
      if (database) await database.closeAsync();
    })
    .catch(() => undefined);
  await closing;
}

export async function resumeMetadataStorage(): Promise<void> {
  await closing;
  blocked = false;
}
