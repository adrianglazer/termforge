export type AppErrorCode =
  | 'INVALID_CONFIG'
  | 'DNS_FAILED'
  | 'CONNECTION_REFUSED'
  | 'TIMEOUT'
  | 'AUTH_FAILED'
  | 'KEY_LOCKED'
  | 'KEY_UNAVAILABLE'
  | 'HOST_KEY_UNKNOWN'
  | 'HOST_KEY_CHANGED'
  | 'NETWORK_LOST'
  | 'REMOTE_CLOSED'
  | 'UNSUPPORTED'
  | 'PATH_REJECTED'
  | 'CONFLICT'
  | 'CANCELLED'
  | 'RESOURCE_LIMIT';
export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    public readonly safeMessage: string,
  ) {
    super(safeMessage);
    this.name = 'AppError';
  }
}
export const safeError = (value: unknown): AppError =>
  value instanceof AppError
    ? value
    : new AppError('UNSUPPORTED', 'The operation could not be completed.');
