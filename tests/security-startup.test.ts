import { describe, expect, it, vi } from 'vitest';
import { createSecurityStartup } from '@/security/startup';

function fixture(active = true) {
  const initialize = vi.fn(async (_stage: (name: string) => void) => {});
  const changed = vi.fn();
  const suspend = vi.fn(async () => {});
  const startup = createSecurityStartup({ active, initialize, changed, suspend });
  return { startup, initialize, changed, suspend };
}
const unlocked = { locked: false, revision: 0 };

describe('protected startup lifecycle', () => {
  it('waits for foreground and accepts the unchanged cold-launch revision', async () => {
    const f = fixture(false);
    f.startup.apply(unlocked);
    await Promise.resolve();
    expect(f.initialize).not.toHaveBeenCalled();
    f.startup.activity('active');
    f.startup.apply(unlocked);
    await vi.waitFor(() => expect(f.changed).toHaveBeenLastCalledWith({ kind: 'ready' }));
    f.startup.apply(unlocked);
    expect(f.initialize).toHaveBeenCalledTimes(1);
  });

  it('retries a failure on foreground without requiring a new lock revision', async () => {
    const f = fixture();
    f.initialize.mockImplementationOnce(async (stage) => {
      stage('key-inventory');
      throw new Error('secret native diagnostic must not reach UI');
    });
    f.startup.apply(unlocked);
    await vi.waitFor(() =>
      expect(f.changed).toHaveBeenLastCalledWith({ kind: 'failed', stage: 'key-inventory' }),
    );
    f.startup.activity('inactive');
    f.startup.activity('active');
    f.startup.apply(unlocked);
    await vi.waitFor(() => expect(f.changed).toHaveBeenLastCalledWith({ kind: 'ready' }));
    expect(f.initialize).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(f.changed.mock.calls)).not.toContain('secret');
  });

  it('keeps the current screen mounted during a temporary authentication prompt', async () => {
    const f = fixture();
    f.startup.apply(unlocked);
    await vi.waitFor(() => expect(f.changed).toHaveBeenLastCalledWith({ kind: 'ready' }));
    const updates = f.changed.mock.calls.length;

    f.startup.activity('inactive');
    expect(f.changed).toHaveBeenCalledTimes(updates);
    expect(f.suspend).not.toHaveBeenCalled();

    f.startup.activity('active');
    f.startup.apply(unlocked);
    expect(f.initialize).toHaveBeenCalledTimes(1);

    f.startup.activity('inactive');
    f.startup.apply({ locked: true, revision: 1 });
    expect(f.changed).toHaveBeenLastCalledWith({ kind: 'waiting' });
    expect(f.suspend).toHaveBeenCalledTimes(1);
  });

  it('ignores stale snapshots and prevents late startup from unlocking a locked screen', async () => {
    const f = fixture();
    let finish!: () => void;
    f.initialize.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    f.startup.apply(unlocked);
    await vi.waitFor(() => expect(finish).toBeDefined());
    f.startup.apply({ locked: true, revision: 1 });
    finish();
    await Promise.resolve();
    f.startup.apply(unlocked);
    expect(f.suspend).toHaveBeenCalledTimes(1);
    expect(f.changed).toHaveBeenLastCalledWith({ kind: 'waiting' });
    f.startup.apply({ locked: false, revision: 2 });
    await vi.waitFor(() => expect(f.changed).toHaveBeenLastCalledWith({ kind: 'ready' }));
  });

  it('serializes initialization across interruption and ignores results after disposal', async () => {
    const f = fixture();
    let finish!: () => void;
    f.initialize.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    f.startup.apply(unlocked);
    await vi.waitFor(() => expect(finish).toBeDefined());
    f.startup.activity('background');
    f.startup.activity('active');
    f.startup.apply(unlocked);
    expect(f.initialize).toHaveBeenCalledTimes(1);
    finish();
    await vi.waitFor(() => expect(f.initialize).toHaveBeenCalledTimes(2));
    f.startup.dispose();
    const calls = f.changed.mock.calls.length;
    f.startup.snapshotFailed();
    f.startup.apply({ locked: false, revision: 3 });
    expect(f.changed).toHaveBeenCalledTimes(calls);
  });
});
