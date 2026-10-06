export type StorageStage =
  | 'storage-prepare'
  | 'database-open'
  | 'database-migrate'
  | 'storage-protect';

/** Fixed stage labels are safe to display; native error messages/paths are not. */
export class StorageStartupError extends Error {
  constructor(
    readonly stage: StorageStage,
    cause: unknown,
  ) {
    super('Protected storage initialization failed.', { cause });
    this.name = 'StorageStartupError';
  }
}

export async function storageStep<T>(stage: StorageStage, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (cause) {
    throw new StorageStartupError(stage, cause);
  }
}
