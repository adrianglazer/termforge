import { TermforgeNative, type SessionState } from '@/native/termforgeNative';

import { SessionController, type SessionAdapter } from '@/sessions/controller';

export type { ManagedSession } from '@/sessions/controller';

const nativeAdapter: SessionAdapter = {
  createSession: () => TermforgeNative.createSession(),
  disconnect: (sessionId) => TermforgeNative.disconnect(sessionId),
  subscribeSessionState: (listener) =>
    TermforgeNative.addListener('onSessionState', (event: SessionState) => {
      listener(event);
    }),
};

/** Production wiring for the native session registry. */
export class SessionManager extends SessionController {
  constructor(adapter: SessionAdapter = nativeAdapter, now?: () => string) {
    super(adapter, now);
  }
}

export const sessionManager = new SessionManager();
