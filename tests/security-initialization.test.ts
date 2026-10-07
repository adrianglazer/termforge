import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeProtectedData } from '@/security/initialize';
import { createSecurityStartup } from '@/security/startup';

const adapters = vi.hoisted(() => ({
  resumeMetadataStorage: vi.fn(),
  openMetadataDatabase: vi.fn(),
  credentialStates: vi.fn(),
  deleteKey: vi.fn(),
  setAutoLockMinutes: vi.fn(),
  database: {
    getAllAsync: vi.fn(),
    getFirstAsync: vi.fn(),
    withExclusiveTransactionAsync: vi.fn(),
    runAsync: vi.fn(),
  },
}));
vi.mock('@/native/termforgeNative', () => ({ TermforgeNative: adapters }));
vi.mock('@/persistence/bootstrap', () => adapters);

beforeEach(() => {
  vi.resetAllMocks();
  adapters.openMetadataDatabase.mockResolvedValue(adapters.database);
  adapters.database.getAllAsync.mockImplementation(async (sql: string) =>
    sql.startsWith('SELECT * FROM keys')
      ? [{ id: 'saved-key', credential_ref: 'protected-key-reference' }]
      : [],
  );
  adapters.database.getFirstAsync.mockResolvedValue({ autoLockMinutes: 5 });
  adapters.database.withExclusiveTransactionAsync.mockImplementation(async (task) =>
    task(adapters.database),
  );
  // A saved user-presence key cannot always be inspected without authenticating.
  adapters.credentialStates.mockRejectedValue({ code: 'KEY_LOCKED' });
});

describe('protected data initialization with saved keys', () => {
  it('opens and resumes the app without making saved-key authentication a startup requirement', async () => {
    const changed = vi.fn();
    const suspend = vi.fn(async () => {});
    const startup = createSecurityStartup({
      active: true,
      initialize: initializeProtectedData,
      suspend,
      changed,
    });
    startup.apply({ locked: false, revision: 0 });
    await vi.waitFor(() => expect(changed).toHaveBeenLastCalledWith({ kind: 'ready' }));
    startup.activity('background');
    startup.apply({ locked: true, revision: 1 });
    expect(changed).toHaveBeenLastCalledWith({ kind: 'waiting' });
    startup.activity('active');
    startup.apply({ locked: false, revision: 2 });
    await vi.waitFor(() => expect(adapters.setAutoLockMinutes).toHaveBeenCalledTimes(2));
    expect(changed).toHaveBeenLastCalledWith({ kind: 'ready' });
    expect(suspend).toHaveBeenCalled();
    expect(adapters.credentialStates).not.toHaveBeenCalled();
    expect(adapters.deleteKey).not.toHaveBeenCalled();
    expect(adapters.database.runAsync).not.toHaveBeenCalled();
    startup.dispose();
  });

  it('still completes explicitly requested key deletions before opening the app', async () => {
    adapters.database.getAllAsync.mockResolvedValue([
      { id: 'pending-key', credentialRef: 'pending-reference' },
    ]);
    await initializeProtectedData(vi.fn());
    expect(adapters.deleteKey).toHaveBeenCalledExactlyOnceWith('pending-reference');
    expect(adapters.database.runAsync).toHaveBeenCalledWith(
      'DELETE FROM pending_key_deletions WHERE key_id = ?',
      'pending-key',
    );
    expect(adapters.setAutoLockMinutes).toHaveBeenCalledWith(5);
  });

  it('keeps the deletion journal if native deletion fails', async () => {
    adapters.database.getAllAsync.mockResolvedValue([
      { id: 'pending-key', credentialRef: 'pending-reference' },
    ]);
    const failure = { code: 'KEY_UNAVAILABLE' };
    adapters.deleteKey.mockRejectedValue(failure);
    await expect(initializeProtectedData(vi.fn())).rejects.toBe(failure);
    expect(adapters.database.runAsync).not.toHaveBeenCalled();
    expect(adapters.setAutoLockMinutes).not.toHaveBeenCalled();
  });

  it('still blocks startup when protected metadata cannot be opened', async () => {
    const failure = { code: 'KEY_LOCKED' };
    adapters.openMetadataDatabase.mockRejectedValue(failure);
    await expect(initializeProtectedData(vi.fn())).rejects.toBe(failure);
    expect(adapters.database.getAllAsync).not.toHaveBeenCalled();
    expect(adapters.setAutoLockMinutes).not.toHaveBeenCalled();
  });
});
