import type { HostKey } from '@/native/termforgeNative';
import { AppError } from '@/application/errors';
import { normalizeHost } from '@/known-hosts/repository';
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

/** A new algorithm at an already-known endpoint also requires separate review. */
export function checkEndpointTrust(
  knownHosts: KnownHost[],
  host: string,
  port: number,
  inspected: HostKey,
): HostTrustDecision {
  const identities = knownHosts.filter(
    (entry) => entry.host === normalizeHost(host) && entry.port === port,
  );
  const known =
    identities.find((entry) => entry.algorithm === inspected.algorithm) ?? identities[0];
  const decision = decideHostTrust(known, inspected);
  if (decision.status === 'changed')
    throw new AppError(
      'HOST_KEY_CHANGED',
      'The server identity changed. Review it in Known hosts before connecting.',
    );
  return decision;
}

export function trustEndpointId(form: {
  host: string;
  port: string;
  useJump: boolean;
  jumpHost: string;
  jumpPort: string;
}): string {
  return JSON.stringify([
    normalizeHost(form.host),
    Number(form.port),
    form.useJump,
    form.useJump ? normalizeHost(form.jumpHost) : '',
    form.useJump ? Number(form.jumpPort) : 0,
  ]);
}
