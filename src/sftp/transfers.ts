export type TransferState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TransferRecord = {
  id: string;
  direction: 'upload' | 'download';
  remotePath: string;
  state: TransferState;
  bytes: string;
  total: string;
  sha256?: string;
  localURL?: string;
  error?: string;
};

export const nextTransferState = (
  state: TransferState,
  event: 'start' | 'progress' | 'complete' | 'fail' | 'cancel',
): TransferState => {
  if (state === 'completed' || state === 'failed' || state === 'cancelled') return state;
  return event === 'complete'
    ? 'completed'
    : event === 'fail'
      ? 'failed'
      : event === 'cancel'
        ? 'cancelled'
        : 'running';
};
