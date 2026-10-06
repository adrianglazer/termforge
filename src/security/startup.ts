import { StorageStartupError } from '@/persistence/startupError';

export type StartupStatus =
  | { kind: 'waiting' | 'loading' | 'ready' }
  | { kind: 'failed'; stage: string };

/** A foreground transition may retry the same lock revision after cold launch. */
export function createSecurityStartup(options: {
  active: boolean;
  initialize: (stage: (name: string) => void) => Promise<void>;
  suspend: () => Promise<void>;
  changed: (status: StartupStatus) => void;
}) {
  let active = options.active;
  let revision = -1;
  let locked = true;
  let generation = 0;
  let disposed = false;
  let status: StartupStatus['kind'] = 'waiting';
  let tail = Promise.resolve();
  const publish = (next: StartupStatus) => {
    status = next.kind;
    if (!disposed) options.changed(next);
  };
  const start = () => {
    if (disposed || !active || locked || status === 'loading' || status === 'ready') return;
    const current = ++generation;
    publish({ kind: 'loading' });
    tail = tail.then(async () => {
      if (disposed || current !== generation) return;
      let stage = 'storage';
      try {
        await options.initialize((name) => {
          stage = name;
        });
        if (!disposed && current === generation) publish({ kind: 'ready' });
      } catch (error) {
        if (!disposed && current === generation)
          publish({
            kind: 'failed',
            stage: error instanceof StorageStartupError ? error.stage : stage,
          });
      }
    });
  };
  return {
    apply(state: { locked: boolean; revision: number }) {
      if (disposed || state.revision < revision) return;
      if (state.revision === revision) {
        start();
        return;
      }
      revision = state.revision;
      locked = state.locked;
      ++generation;
      publish({ kind: 'waiting' });
      if (locked) void options.suspend();
      else start();
    },
    activity(next: 'active' | 'inactive' | 'background' | string) {
      active = next === 'active';
      if (!active) {
        ++generation;
        publish({ kind: 'waiting' });
        if (next === 'background') void options.suspend();
      }
      // Wait for a fresh native lock snapshot before starting on foreground.
    },
    snapshotFailed() {
      publish({ kind: 'failed', stage: 'security-state' });
    },
    dispose() {
      disposed = true;
      ++generation;
    },
  };
}
