/** Development preview only. It has no network or SSH capability and always remains disconnected. */
import type { Capability, SessionManager, SessionSnapshot } from '@/native/contracts';
export class MockTerminalEngine implements SessionManager {
  readonly capability: Capability = {
    status: 'unverified',
    reason: 'Development mock; no native terminal or SSH connection.',
  };
  async create(): Promise<string> {
    return 'mock-session';
  }
  async connect(): Promise<void> {
    return;
  }
  async disconnect(): Promise<void> {
    return;
  }
  async close(): Promise<void> {
    return;
  }
  async snapshot(): Promise<SessionSnapshot> {
    return { sessionId: 'mock-session', generation: 0, status: 'disconnected' };
  }
  subscribe(): () => void {
    return () => undefined;
  }
}
