import type { PaneNode } from '@/types/domain';

export type PaneFrame = { id: string; x: number; y: number; width: number; height: number };

/** Divide the available terminal area using the saved axes and ratios. */
export function terminalFrames(
  root: PaneNode,
  width: number,
  height: number,
  expanded?: string,
): PaneFrame[] {
  const frames: PaneFrame[] = [];
  const visit = (node: PaneNode, x: number, y: number, w: number, h: number) => {
    if (node.kind === 'leaf') {
      frames.push({ id: node.id, x, y, width: w, height: h });
      return;
    }
    const ratio = Math.max(0.1, Math.min(0.9, node.ratio));
    if (node.axis === 'row') {
      visit(node.children[0], x, y, w * ratio, h);
      visit(node.children[1], x + w * ratio, y, w * (1 - ratio), h);
    } else {
      visit(node.children[0], x, y, w, h * ratio);
      visit(node.children[1], x, y + h * ratio, w, h * (1 - ratio));
    }
  };
  visit(root, 0, 0, Math.max(0, width), Math.max(0, height));
  return expanded && frames.some((frame) => frame.id === expanded)
    ? frames.map((frame) =>
        frame.id === expanded
          ? { ...frame, x: 0, y: 0, width, height }
          : { ...frame, width: 0, height: 0 },
      )
    : frames;
}
