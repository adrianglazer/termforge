import { AppError } from '@/application/errors';
import type { Server } from '@/types/domain';

/** The native bridge supports one password-authenticated jump host, never chained hops. */
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
      if (seen.has(next.id))
        throw new AppError('INVALID_CONFIG', 'Jump-host references cannot form a cycle.');
      if (hops > 1)
        throw new AppError(
          'INVALID_CONFIG',
          'Only one jump host is supported. Chained jump hosts and SOCKS are unavailable.',
        );
      seen.add(next.id);
      current = next;
    }
  }
}
