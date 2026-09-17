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
  state: NativeSessionState;
  message?: string;
  code?: string;
  attempt?: number;
};

export type ManagedSession = {
  sessionId: string;
  paneId: string;
  serverId: string;
  state: NativeSessionState;
  createdAt: string;
  reconnectAttempt?: number;
};

type Listener = (sessions: ManagedSession[]) => void;

export type SessionAdapter = {
  createSession(): Promise<string>;
  disconnect(sessionId: string): Promise<void>;
  subscribeSessionState(listener: (event: NativeSessionEvent) => void): { remove(): void };
};

/** Mirrors the native retry policy: attempts 1–5 wait 1, 2, 4, 8, and 16 seconds. */
export const reconnectDelaySeconds = (attempt: number): number =>
  Math.min(30, 2 ** Math.max(0, Math.min(5, attempt) - 1));

/**
 * React owns only pane-to-session metadata. The adapter remains responsible for
 * sockets, retry timers, and terminal resources; this controller makes native
 * lifecycle events safe to consume in workspace UI.
 */
export class SessionController {
  private sessions = new Map<string, ManagedSession>();
  private listeners = new Set<Listener>();
  private readonly subscription: { remove(): void };

  constructor(
    private readonly adapter: SessionAdapter,
    private readonly now = () => new Date().toISOString(),
  ) {
    this.subscription = adapter.subscribeSessionState((event) => this.apply(event));
  }

  async create(paneId: string, serverId: string): Promise<string> {
    const sessionId = await this.adapter.createSession();
    this.sessions.set(sessionId, {
      sessionId,
      paneId,
      serverId,
      state: 'created',
      createdAt: this.now(),
    });
    this.publish();
    return sessionId;
  }

  async close(sessionId: string): Promise<void> {
    try {
      await this.adapter.disconnect(sessionId);
    } finally {
      if (this.sessions.delete(sessionId)) this.publish();
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
    if (!current || !acceptsEvent(current.state, event.state)) return;
    if (event.state === 'closed' || event.state === 'failed') this.sessions.delete(event.sessionId);
    else
      this.sessions.set(event.sessionId, {
        ...current,
        state: event.state,
        ...(event.state === 'reconnecting' && event.attempt !== undefined
          ? { reconnectAttempt: event.attempt }
          : {}),
      });
    this.publish();
  }

  private publish(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

const acceptsEvent = (current: NativeSessionState, next: NativeSessionState): boolean => {
  if (next === 'closed' || next === 'failed' || next === 'reconnecting') return true;
  if (next === 'created') return current === 'created';
  if (next === 'connecting') return current === 'created' || current === 'reconnecting';
  if (next === 'connected') return current === 'connecting' || current === 'reconnecting';
  return next === 'ready' && current === 'connected';
};
