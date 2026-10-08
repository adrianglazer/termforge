export type NativeSessionState =
  | 'created'
  | 'connecting'
  | 'reconnecting'
  | 'connected'
  | 'ready'
  | 'closed'
  | 'failed';

export type NativeSessionEvent = {
  sessionId: string;
  generation: number;
  sequence: number;
  state: NativeSessionState;
  message?: string;
  code?: string;
  attempt?: number;
};

export type ManagedForward = { id: string; kind: 'local' | 'remote'; summary: string };

export type ManagedSession = {
  sessionId: string;
  paneId: string;
  serverId: string;
  state: NativeSessionState;
  generation: number;
  sequence: number;
  createdAt: string;
  reconnectAttempt?: number;
  forwards?: ManagedForward[];
};

type Listener = (sessions: ManagedSession[]) => void;

export type SessionAdapter = {
  createSession(): Promise<string>;
  disconnect(sessionId: string): Promise<void>;
  subscribeSessionState(listener: (event: NativeSessionEvent) => void): { remove(): void };
};

/** Native retry base before jitter: attempts 1–5 use 1, 2, 4, 8, and 16 seconds. */
export const reconnectDelaySeconds = (attempt: number): number =>
  Math.min(30, 2 ** Math.max(0, Math.min(5, attempt) - 1));

/**
 * React owns only pane-to-session metadata. The adapter remains responsible for
 * sockets, retry timers, and terminal resources; this controller makes native
 * lifecycle events safe to consume in workspace UI.
 */
export class SessionController {
  private sessions = new Map<string, ManagedSession>();
  private closing = new Set<string>();
  private creatingPanes = new Set<string>();
  private listeners = new Set<Listener>();
  private readonly subscription: { remove(): void };

  constructor(
    private readonly adapter: SessionAdapter,
    private readonly now = () => new Date().toISOString(),
  ) {
    this.subscription = adapter.subscribeSessionState((event) => this.apply(event));
  }

  async create(paneId: string, serverId: string): Promise<string> {
    if (this.forPane(paneId) || this.creatingPanes.has(paneId)) {
      throw new Error('This pane already has a session. Open its terminal or disconnect it first.');
    }
    this.creatingPanes.add(paneId);
    try {
      const sessionId = await this.adapter.createSession();
      this.sessions.set(sessionId, {
        sessionId,
        paneId,
        serverId,
        state: 'created',
        generation: 1,
        sequence: 0,
        createdAt: this.now(),
      });
      this.publish();
      return sessionId;
    } finally {
      this.creatingPanes.delete(paneId);
    }
  }

  async close(sessionId: string): Promise<void> {
    if (!this.sessions.has(sessionId) || this.closing.has(sessionId)) return;
    this.closing.add(sessionId);
    try {
      await this.adapter.disconnect(sessionId);
      if (this.sessions.delete(sessionId)) this.publish();
    } finally {
      this.closing.delete(sessionId);
    }
  }

  /** `inactive` is temporary (for example Control Center); only background closes sessions. */
  async handleAppState(state: 'active' | 'inactive' | 'background'): Promise<void> {
    if (state !== 'background') return;
    await Promise.all(this.snapshot().map((session) => this.close(session.sessionId)));
  }

  forPane(paneId: string): ManagedSession | undefined {
    return this.snapshot().find((session) => session.paneId === paneId);
  }

  setForwards(sessionId: string, forwards: ManagedForward[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.sessions.set(sessionId, { ...session, forwards: [...forwards] });
    this.publish();
  }

  snapshot(): ManagedSession[] {
    return [...this.sessions.values()];
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.subscription.remove();
    this.listeners.clear();
  }

  private apply(event: NativeSessionEvent): void {
    const current = this.sessions.get(event.sessionId);
    if (!current || !acceptsEvent(current, event)) return;
    if (event.state === 'closed' || event.state === 'failed') this.sessions.delete(event.sessionId);
    else {
      const updated: ManagedSession = {
        ...current,
        state: event.state,
        generation: event.generation,
        sequence: event.sequence,
        ...(event.state === 'reconnecting' && event.attempt !== undefined
          ? { reconnectAttempt: event.attempt }
          : {}),
      };
      if (event.state !== 'reconnecting') delete updated.reconnectAttempt;
      this.sessions.set(event.sessionId, updated);
    }
    this.publish();
  }

  private publish(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

const acceptsEvent = (current: ManagedSession, event: NativeSessionEvent): boolean => {
  if (event.generation < current.generation) return false;
  if (event.sequence <= current.sequence) return false;
  if (event.generation > current.generation && event.state !== 'reconnecting') return false;
  const next = event.state;
  const state = current.state;
  if (next === 'closed' || next === 'failed' || next === 'reconnecting') return true;
  if (next === 'created') return state === 'created';
  if (next === 'connecting') return state === 'created' || state === 'reconnecting';
  if (next === 'connected') return state === 'connecting' || state === 'reconnecting';
  return next === 'ready' && state === 'connected';
};
