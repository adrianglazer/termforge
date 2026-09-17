import type { Id, PaneLeaf, PaneNode } from '@/types/domain';
import { validatePaneTree } from '@/validation/domain';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export function replacePane(root: PaneNode, targetId: Id, replacement: PaneNode): PaneNode {
  const visit = (node: PaneNode): PaneNode =>
    node.id === targetId
      ? replacement
      : node.kind === 'leaf'
        ? node
        : { ...node, children: [visit(node.children[0]), visit(node.children[1])] };
  const result = visit(clone(root));
  return validatePaneTree(result);
}
export function splitPane(
  root: PaneNode,
  targetId: Id,
  axis: 'row' | 'column',
  newLeaf: PaneLeaf,
  splitId: Id,
  ratio = 0.5,
): PaneNode {
  const target = findPane(root, targetId);
  if (!target || target.kind !== 'leaf') throw new Error('Only terminal panes can be split.');
  return replacePane(root, targetId, {
    kind: 'split',
    id: splitId,
    axis,
    ratio,
    children: [target, newLeaf],
  });
}
export function closePane(root: PaneNode, targetId: Id): PaneNode | undefined {
  if (root.id === targetId) return undefined;
  const prune = (node: PaneNode): PaneNode | undefined => {
    if (node.kind === 'leaf') return node.id === targetId ? undefined : node;
    const left = prune(node.children[0]);
    const right = prune(node.children[1]);
    return !left ? right : !right ? left : { ...node, children: [left, right] };
  };
  const result = prune(clone(root));
  return result && validatePaneTree(result);
}
export function findPane(node: PaneNode, id: Id): PaneNode | undefined {
  return node.id === id
    ? node
    : node.kind === 'split'
      ? (findPane(node.children[0], id) ?? findPane(node.children[1], id))
      : undefined;
}

export function resizeSplit(root: PaneNode, splitId: Id, ratio: number): PaneNode {
  const visit = (node: PaneNode): PaneNode =>
    node.id === splitId && node.kind === 'split'
      ? { ...node, ratio }
      : node.kind === 'split'
        ? { ...node, children: [visit(node.children[0]), visit(node.children[1])] }
        : node;
  return validatePaneTree(visit(clone(root)));
}
