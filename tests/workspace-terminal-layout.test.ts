import { describe, expect, it } from 'vitest';
import { terminalFrames } from '@/workspaces/terminalLayout';
import type { PaneNode } from '@/types/domain';

const layout: PaneNode = {
  kind: 'split',
  id: 'root',
  axis: 'row',
  ratio: 0.4,
  children: [
    { kind: 'leaf', id: 'one' },
    {
      kind: 'split',
      id: 'right',
      axis: 'column',
      ratio: 0.5,
      children: [
        { kind: 'leaf', id: 'two' },
        { kind: 'leaf', id: 'three' },
      ],
    },
  ],
};
describe('workspace terminal layout', () => {
  it('honors saved axes and ratios even on a narrow phone', () => {
    expect(terminalFrames(layout, 300, 600)).toEqual([
      { id: 'one', x: 0, y: 0, width: 120, height: 600 },
      { id: 'two', x: 120, y: 0, width: 180, height: 300 },
      { id: 'three', x: 120, y: 300, width: 180, height: 300 },
    ]);
  });
  it('expands without deleting pane identities, then restores all splits', () => {
    const full = terminalFrames(layout, 300, 600, 'two');
    expect(full.map((frame) => frame.id)).toEqual(['one', 'two', 'three']);
    expect(full[1]).toEqual({ id: 'two', x: 0, y: 0, width: 300, height: 600 });
    expect(full[0]?.width).toBe(0);
    expect(terminalFrames(layout, 300, 600)[0]?.width).toBe(120);
  });
  it('fits a resized keyboard viewport and ignores a stale expanded pane', () => {
    const frames = terminalFrames(layout, 600, 240, 'removed');
    expect(frames[0]?.height).toBe(240);
    expect(frames[2]?.y).toBe(120);
    expect(
      frames.every((frame) => frame.x + frame.width <= 600 && frame.y + frame.height <= 240),
    ).toBe(true);
  });
});
