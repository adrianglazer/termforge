export type AppErrorCode =
  | 'ACCESS_REQUIRED'
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

const messages: Record<AppErrorCode, string> = {
  ACCESS_REQUIRED:
    'Open Access to start or restore a trial or lifetime purchase. Your local data remains available.',
  INVALID_CONFIG: 'The operation settings are invalid.',
  DNS_FAILED: 'The server name could not be resolved.',
  CONNECTION_REFUSED: 'The server refused the connection.',
  TIMEOUT: 'The operation timed out.',
  AUTH_FAILED: 'The server rejected the selected credentials.',
  KEY_LOCKED: 'The protected key is locked.',
  KEY_UNAVAILABLE: 'The protected key is unavailable.',
  HOST_KEY_UNKNOWN: 'The server identity has not been approved.',
  HOST_KEY_CHANGED: 'The server identity does not match the approved host key.',
  NETWORK_LOST: 'The network connection ended unexpectedly.',
  REMOTE_CLOSED: 'The remote server closed the operation.',
  UNSUPPORTED: 'The operation could not be completed.',
  PATH_REJECTED: 'The selected path is not allowed.',
  CONFLICT: 'The remote file changed. Reload it before saving.',
  CANCELLED: 'The operation was cancelled.',
  RESOURCE_LIMIT: 'The operation exceeds the configured resource limit.',
};

export const safeError = (value: unknown): AppError => {
  const code =
    typeof value === 'object' && value !== null && 'code' in value ? String(value.code) : undefined;
  return code && Object.hasOwn(messages, code)
    ? new AppError(code as AppErrorCode, messages[code as AppErrorCode])
    : new AppError('UNSUPPORTED', messages.UNSUPPORTED);
};
