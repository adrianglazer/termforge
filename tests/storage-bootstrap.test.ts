import { beforeEach, describe, expect, it, vi } from 'vitest';

const adapters = vi.hoisted(() => ({
  prepareMetadataStorage: vi.fn(),
  openDatabaseAsync: vi.fn(),
  closeAsync: vi.fn(),
  applyMigrations: vi.fn(),
}));
vi.mock('@/native/termforgeNative', () => ({ TermforgeNative: adapters }));
vi.mock('expo-sqlite', () => ({ openDatabaseAsync: adapters.openDatabaseAsync }));
vi.mock('@/persistence/migrations', () => ({ applyMigrations: adapters.applyMigrations }));

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  adapters.prepareMetadataStorage.mockResolvedValue('/protected/SQLite');
  adapters.openDatabaseAsync.mockResolvedValue({ closeAsync: adapters.closeAsync });
  adapters.closeAsync.mockResolvedValue(undefined);
  adapters.applyMigrations.mockResolvedValue(undefined);
});

describe('protected metadata bootstrap', () => {
  it('serializes concurrent initial opens and protects newly created sidecars', async () => {
    const { openMetadataDatabase } = await import('@/persistence/bootstrap');
    const opened = await Promise.all([
      openMetadataDatabase(),
      openMetadataDatabase(),
      openMetadataDatabase(),
    ]);
    expect(opened[0]).toBe(opened[1]);
    expect(adapters.openDatabaseAsync).toHaveBeenCalledExactlyOnceWith(
      'termforge-metadata.db',
      {},
      '/protected/SQLite',
    );
    expect(adapters.applyMigrations).toHaveBeenCalledTimes(1);
    expect(adapters.prepareMetadataStorage).toHaveBeenCalledTimes(2);
  });

  it('does not open a database when initial protection fails, and permits a later retry', async () => {
    adapters.prepareMetadataStorage.mockRejectedValueOnce(new Error('unavailable'));
    const { openMetadataDatabase } = await import('@/persistence/bootstrap');
    await expect(openMetadataDatabase()).rejects.toThrow('unavailable');
    expect(adapters.openDatabaseAsync).not.toHaveBeenCalled();
    await expect(openMetadataDatabase()).resolves.toBeDefined();
    expect(adapters.openDatabaseAsync).toHaveBeenCalledTimes(1);
  });

  it('closes and rejects a connection if new-file protection fails after migration', async () => {
    adapters.prepareMetadataStorage
      .mockResolvedValueOnce('/protected/SQLite')
      .mockRejectedValueOnce(new Error('sidecar protection failed'));
    const { openMetadataDatabase } = await import('@/persistence/bootstrap');
    await expect(openMetadataDatabase()).rejects.toThrow('sidecar protection failed');
    expect(adapters.closeAsync).toHaveBeenCalledTimes(1);
    await expect(openMetadataDatabase()).resolves.toBeDefined();
    expect(adapters.openDatabaseAsync).toHaveBeenCalledTimes(2);
  });
  it('blocks new opens while locked and waits for closure before reopening', async () => {
    const { openMetadataDatabase, suspendMetadataStorage, resumeMetadataStorage } =
      await import('@/persistence/bootstrap');
    await openMetadataDatabase();
    let finishClose!: () => void;
    adapters.closeAsync.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishClose = resolve;
        }),
    );
    const closed = suspendMetadataStorage();
    await expect(openMetadataDatabase()).rejects.toMatchObject({ code: 'KEY_LOCKED' });
    const resumed = resumeMetadataStorage();
    expect(adapters.openDatabaseAsync).toHaveBeenCalledTimes(1);
    finishClose();
    await closed;
    await resumed;
    await openMetadataDatabase();
    expect(adapters.openDatabaseAsync).toHaveBeenCalledTimes(2);
  });

  it('drains an opening connection when lock arrives during migration', async () => {
    const { openMetadataDatabase, suspendMetadataStorage, resumeMetadataStorage } =
      await import('@/persistence/bootstrap');
    let finishMigration!: () => void;
    adapters.applyMigrations.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishMigration = resolve;
        }),
    );
    const opened = openMetadataDatabase();
    await vi.waitFor(() => expect(finishMigration).toBeDefined());
    const closed = suspendMetadataStorage();
    finishMigration();
    await opened;
    await closed;
    expect(adapters.closeAsync).toHaveBeenCalledTimes(1);
    await resumeMetadataStorage();
    await openMetadataDatabase();
    expect(adapters.openDatabaseAsync).toHaveBeenCalledTimes(2);
  });
});
