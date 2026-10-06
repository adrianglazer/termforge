/** UI projections only. Native StoreKit state alone authorizes remote operations. */
export type AccessSnapshot = {
  state: 'loading' | 'notStarted' | 'trial' | 'expired' | 'lifetime' | 'error';
  revision: number;
  expiresAt?: number;
  displayPrice?: string;
  trialAvailable: boolean;
  warning: boolean;
  busy: boolean;
  outcome: string;
  storeError: string;
  accessError: string;
};
export const initialAccess: AccessSnapshot = {
  state: 'loading',
  revision: -1,
  trialAvailable: false,
  warning: false,
  busy: false,
  outcome: 'none',
  storeError: 'none',
  accessError: 'none',
};
export function reconcileAccess(current: AccessSnapshot, next: AccessSnapshot): AccessSnapshot {
  return next.revision >= current.revision ? next : current;
}
export function accessStatus(access: AccessSnapshot): string {
  switch (access.state) {
    case 'lifetime':
      return 'Lifetime access';
    case 'trial':
      return access.warning
        ? 'Trial ending within five minutes. Active remote work will be interrupted.'
        : 'Full-access trial active';
    case 'expired':
      return 'Trial ended. Remote work is paused; local data remains available.';
    case 'notStarted':
      return 'Start your 7-day trial or buy lifetime access.';
    case 'loading':
      return 'Checking App Store access…';
    case 'error':
      return access.accessError === 'clockChanged'
        ? 'Device time moved backward. Enable automatic date and time, then retry.'
        : 'Access could not be verified. Connect to the internet and retry or restore.';
  }
}
const outcomes: Record<string, string> = {
  success: 'Purchase verified. Access is ready.',
  restored: 'Purchases restored. Access is ready.',
  cancelled: 'Purchase canceled. No access change or trial start.',
  pending:
    'Apple approval is pending. Existing access continues; a pending acquisition starts no new trial.',
  trialAlreadyUsed:
    'This App Store account already started a trial. Restoring does not restart it.',
  verificationFailed: 'Apple transaction verification failed. Retry or restore while online.',
  unavailable: 'This product is unavailable. Try again when connected; no purchase was completed.',
  storeUnavailable: 'The App Store could not complete the purchase. Try again while online.',
  noActivePurchase:
    'No active access was restored. Check the original App Store account; an expired trial stays expired.',
  accessUnavailable:
    'The transaction was verified but access is unavailable. Check device time or restore; an old trial cannot restart.',
  restoreFailed:
    'Restore did not complete. Check connectivity and the original App Store account, then try again.',
  bridgeUnavailable:
    'Access could not be loaded from the app. Retry; a compatible app update may be required.',
};
export function purchaseMessage(outcome: string): string | undefined {
  return outcomes[outcome];
}
