import { TermforgeNative } from '@/native/termforgeNative';
import { openMetadataDatabase, resumeMetadataStorage } from '@/persistence/bootstrap';
import { KeyRepository } from '@/keys/repository';
import { SettingsRepository } from '@/settings/repository';

export async function initializeProtectedData(stage: (name: string) => void): Promise<void> {
  stage('storage');
  await resumeMetadataStorage();
  const database = await openMetadataDatabase();
  const keys = new KeyRepository(database);
  stage('key-cleanup');
  for (const pending of await keys.pendingRemovals()) {
    await TermforgeNative.deleteKey(pending.credentialRef);
    await keys.remove(pending.id);
  }
  // Keychain inventory is checked in SSH keys, not used to gate local metadata.
  // Private-key use still requires native association checks and authentication.
  stage('settings');
  const settings = await new SettingsRepository(database).get();
  await TermforgeNative.setAutoLockMinutes(settings.autoLockMinutes);
}
