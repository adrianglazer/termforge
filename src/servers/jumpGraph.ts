import { AppError } from '@/application/errors';
import type { Server } from '@/types/domain';

/** Rejects self references, cycles, and chains longer than the supported three hops. */
export function validateJumpGraph(servers: Server[]): void {
  const byId = new Map(servers.map((server) => [server.id, server]));
  for (const server of servers) {
    const seen = new Set<string>([server.id]);
    let current = server;
    let hops = 0;
    while (current.jumpServerId) {
      const next = byId.get(current.jumpServerId);
      if (!next) break;
      hops += 1;
      if (hops > 3)
        throw new AppError('INVALID_CONFIG', 'Jump-host chains support at most three hops.');
      if (seen.has(next.id))
        throw new AppError('INVALID_CONFIG', 'Jump-host references cannot form a cycle.');
      seen.add(next.id);
      current = next;
    }
  }
}
