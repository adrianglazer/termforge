import type { HostKey } from '@/native/termforgeNative';
import type { KnownHost } from '@/types/domain';

export type HostTrustDecision =
  | { status: 'review'; inspected: HostKey }
  | { status: 'trusted'; inspected: HostKey; knownHost: KnownHost }
  | { status: 'changed'; inspected: HostKey; knownHost: KnownHost };

export const decideHostTrust = (
  knownHost: KnownHost | undefined,
  inspected: HostKey,
): HostTrustDecision => {
  if (!knownHost) return { status: 'review', inspected };
  return knownHost.publicKey === inspected.key
    ? { status: 'trusted', inspected, knownHost }
    : { status: 'changed', inspected, knownHost };
};
