import type { PaneLeaf, PaneNode, Workspace } from '@/types/domain';
import { findPane } from '@/workspaces/paneTree';

export const leaves = (node: PaneNode): PaneLeaf[] =>
  node.kind === 'leaf' ? [node] : [...leaves(node.children[0]), ...leaves(node.children[1])];

export const duplicateWorkspace = (
  workspace: Workspace,
  makeId: (kind: 'workspace' | 'pane' | 'split') => string,
  now: string,
): Workspace => {
  const id = makeId('workspace');
  const duplicateNode = (node: PaneNode): PaneNode =>
    node.kind === 'leaf'
      ? { ...node, id: makeId('pane') }
      : {
          ...node,
          id: makeId('split'),
          children: [duplicateNode(node.children[0]), duplicateNode(node.children[1])],
        };
  const layout = duplicateNode(workspace.layout);
  return {
    id,
    name: `${workspace.name.trim()} copy`,
    layout,
    tabOrder: leaves(layout).map((leaf) => leaf.id),
    createdAt: now,
    updatedAt: now,
  };
};

export const zoomedPane = (layout: PaneNode, paneId: string | undefined): PaneNode | undefined =>
  paneId ? findPane(layout, paneId) : undefined;
