import type { AppError } from '@/application/errors';
export type Capability =
  | { status: 'available' }
  | { status: 'unavailable' | 'unverified'; reason: string };
export type SessionSnapshot = {
  sessionId: string;
  generation: number;
  status: 'disconnected' | 'connecting' | 'connected' | 'failed';
};
export interface SessionManager {
  create(config: { serverId: string; keyId?: string }): Promise<string>;
  connect(sessionId: string): Promise<void>;
  disconnect(sessionId: string): Promise<void>;
  close(sessionId: string): Promise<void>;
  snapshot(sessionId: string): Promise<SessionSnapshot>;
  subscribe(listener: (snapshot: SessionSnapshot) => void): () => void;
}
export interface NativeAdapter {
  readonly capability: Capability;
  readonly errors: readonly AppError[];
}
