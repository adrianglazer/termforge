import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { ScreenShell } from '@/components/ScreenShell';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { ServerRepository } from '@/servers/repository';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaneLeaf, PaneNode, Workspace } from '@/types/domain';
import { closePane, findPane, replacePane, resizeSplit, splitPane } from '@/workspaces/paneTree';
import { duplicateWorkspace as createWorkspaceDuplicate } from '@/workspaces/controller';
import { WorkspaceRepository } from '@/workspaces/repository';
import type { Server } from '@/types/domain';

const makeId = (kind: string) => `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export default function WorkspacesScreen() {
  const theme = useTheme();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [active, setActive] = useState<Workspace>();
  const [name, setName] = useState('');
  const [rename, setRename] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [focusedPaneId, setFocusedPaneId] = useState<string>();
  const [zoomedPaneId, setZoomedPaneId] = useState<string>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      const db = await openMetadataDatabase();
      const saved = await new WorkspaceRepository(db).list();
      setServers(await new ServerRepository(db).list());
      setWorkspaces(saved);
      setActive((current) => saved.find((workspace) => workspace.id === current?.id) ?? saved[0]);
    } catch {
      setError('Workspaces could not be loaded.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function persist(workspace: Workspace) {
    try {
      const db = await openMetadataDatabase();
      await new WorkspaceRepository(db).save(workspace);
      setActive(workspace);
      await load();
    } catch {
      setError('This workspace layout could not be saved.');
    }
  }
  async function create() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the workspace a name.');
      return;
    }
    const now = new Date().toISOString();
    const leaf: PaneLeaf = { kind: 'leaf', id: makeId('pane'), title: 'Disconnected terminal' };
    await persist({
      id: makeId('workspace'),
      name: trimmed,
      layout: leaf,
      tabOrder: [leaf.id],
      createdAt: now,
      updatedAt: now,
    });
    setName('');
  }
  function split(targetId: string, axis: 'row' | 'column') {
    if (!active) return;
    try {
      const newLeaf: PaneLeaf = {
        kind: 'leaf',
        id: makeId('pane'),
        title: 'Disconnected terminal',
      };
      void persist({
        ...active,
        layout: splitPane(active.layout, targetId, axis, newLeaf, makeId('split')),
        tabOrder: [...active.tabOrder, newLeaf.id],
        updatedAt: new Date().toISOString(),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The pane could not be split.');
    }
  }
  function removePane(targetId: string) {
    if (!active) return;
    const layout = closePane(active.layout, targetId);
    if (!layout) {
      setError('A workspace must keep one pane. Delete the workspace instead.');
      return;
    }
    void persist({
      ...active,
      layout,
      tabOrder: active.tabOrder.filter((id) => id !== targetId),
      updatedAt: new Date().toISOString(),
    });
  }
  function resize(splitId: string, delta: number) {
    if (!active) return;
    const split = findPane(active.layout, splitId);
    if (!split || split.kind !== 'split') return;
    try {
      void persist({
        ...active,
        layout: resizeSplit(
          active.layout,
          splitId,
          Math.min(0.9, Math.max(0.1, split.ratio + delta)),
        ),
        updatedAt: new Date().toISOString(),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The pane split could not be resized.');
    }
  }
  function assignServer(paneId: string, serverId: string) {
    if (!active) return;
    const pane = findPane(active.layout, paneId);
    if (!pane || pane.kind !== 'leaf') return;
    const name = servers.find((server) => server.id === serverId)?.name;
    void persist({
      ...active,
      layout: replacePane(active.layout, paneId, {
        ...pane,
        serverId,
        ...(name ? { title: name } : {}),
      }),
      updatedAt: new Date().toISOString(),
    });
  }
  function removeWorkspace(workspace: Workspace) {
    Alert.alert(
      'Delete workspace?',
      `${workspace.name} and its disconnected layout will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const db = await openMetadataDatabase();
                await new WorkspaceRepository(db).remove(workspace.id);
                await load();
              } catch {
                setError('The workspace could not be deleted.');
              }
            })();
          },
        },
      ],
    );
  }
  async function saveRename() {
    if (!active || !rename.trim()) {
      setError('Give the workspace a name.');
      return;
    }
    await persist({ ...active, name: rename.trim(), updatedAt: new Date().toISOString() });
    setRenaming(false);
  }
  async function duplicateWorkspace() {
    if (!active) return;
    const now = new Date().toISOString();
    await persist(createWorkspaceDuplicate(active, makeId, now));
  }
  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <ScreenShell
        compact
        title="Workspaces"
        message="Layouts restore disconnected after relaunch. Reconnect opens fresh native sessions; no remote session is implied to survive."
      />
      <View style={styles.create}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="New workspace name"
          placeholderTextColor={theme.muted}
          style={[styles.input, { borderColor: theme.muted, color: theme.text }]}
        />
        <Pressable accessibilityRole="button" onPress={() => void create()}>
          <Text style={{ color: theme.accent }}>Create</Text>
        </Pressable>
      </View>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <ScrollView horizontal contentContainerStyle={styles.tabs}>
        {workspaces.map((workspace) => (
          <Pressable
            key={workspace.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: workspace.id === active?.id }}
            onPress={() => setActive(workspace)}
            style={[
              styles.tab,
              { borderColor: workspace.id === active?.id ? theme.accent : theme.muted },
            ]}
          >
            <Text style={{ color: workspace.id === active?.id ? theme.accent : theme.text }}>
              {workspace.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {active ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.workspaceHeader}>
            {renaming ? (
              <TextInput
                value={rename}
                onChangeText={setRename}
                autoFocus
                style={[styles.renameInput, { borderColor: theme.muted, color: theme.text }]}
              />
            ) : (
              <Text style={[styles.title, { color: theme.text }]}>{active.name}</Text>
            )}
            <View style={styles.workspaceActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (renaming) void saveRename();
                  else {
                    setRename(active.name);
                    setRenaming(true);
                  }
                }}
              >
                <Text style={{ color: theme.accent }}>{renaming ? 'Save' : 'Rename'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void duplicateWorkspace()}>
                <Text style={{ color: theme.accent }}>Duplicate</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => removeWorkspace(active)}>
                <Text style={{ color: theme.danger }}>Delete</Text>
              </Pressable>
            </View>
          </View>
          {zoomedPaneId && findPane(active.layout, zoomedPaneId) ? (
            <>
              <Pressable accessibilityRole="button" onPress={() => setZoomedPaneId(undefined)}>
                <Text style={{ color: theme.accent }}>Restore layout</Text>
              </Pressable>
              <Pane
                node={findPane(active.layout, zoomedPaneId)!}
                onSplit={split}
                onClose={removePane}
                onFocus={setFocusedPaneId}
                onZoom={setZoomedPaneId}
                onResize={resize}
                onAssign={assignServer}
                servers={servers}
                focusedPaneId={focusedPaneId}
              />
            </>
          ) : (
            <Pane
              node={active.layout}
              onSplit={split}
              onClose={removePane}
              onFocus={setFocusedPaneId}
              onZoom={setZoomedPaneId}
              onResize={resize}
              onAssign={assignServer}
              servers={servers}
              focusedPaneId={focusedPaneId}
            />
          )}
        </ScrollView>
      ) : (
        <Text style={[styles.empty, { color: theme.muted }]}>
          Create a workspace to arrange terminal panes.
        </Text>
      )}
    </View>
  );
}
function Pane({
  node,
  onSplit,
  onClose,
  onFocus,
  onZoom,
  onResize,
  onAssign,
  servers,
  focusedPaneId,
}: {
  node: PaneNode;
  onSplit: (id: string, axis: 'row' | 'column') => void;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  onZoom: (id: string) => void;
  onResize: (id: string, delta: number) => void;
  onAssign: (id: string, serverId: string) => void;
  servers: Server[];
  focusedPaneId: string | undefined;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  if (node.kind === 'split')
    return (
      <View
        style={[styles.split, node.axis === 'row' && width >= 700 ? styles.row : styles.column]}
      >
        <View style={styles.splitControls}>
          <Pressable accessibilityRole="button" onPress={() => onResize(node.id, -0.1)}>
            <Text style={{ color: theme.accent }}>−</Text>
          </Pressable>
          <Text style={{ color: theme.muted }}>{Math.round(node.ratio * 100)}%</Text>
          <Pressable accessibilityRole="button" onPress={() => onResize(node.id, 0.1)}>
            <Text style={{ color: theme.accent }}>+</Text>
          </Pressable>
        </View>
        <Pane
          node={node.children[0]}
          onSplit={onSplit}
          onClose={onClose}
          onFocus={onFocus}
          onZoom={onZoom}
          onResize={onResize}
          onAssign={onAssign}
          servers={servers}
          focusedPaneId={focusedPaneId}
        />
        <Pane
          node={node.children[1]}
          onSplit={onSplit}
          onClose={onClose}
          onFocus={onFocus}
          onZoom={onZoom}
          onResize={onResize}
          onAssign={onAssign}
          servers={servers}
          focusedPaneId={focusedPaneId}
        />
      </View>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${node.title ?? 'Disconnected terminal'} pane${focusedPaneId === node.id ? ', focused' : ''}`}
      accessibilityHint="Double tap to focus this terminal pane."
      accessibilityState={{ selected: focusedPaneId === node.id }}
      onPress={() => onFocus(node.id)}
      style={[styles.pane, { borderColor: focusedPaneId === node.id ? theme.accent : theme.muted }]}
    >
      <Text style={{ color: theme.text }}>
        {node.title ?? 'Disconnected terminal'}
        {focusedPaneId === node.id ? ' · focused' : ''}
      </Text>
      <Text style={{ color: theme.muted }}>Reconnect from Servers to attach a fresh session.</Text>
      {node.serverId ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/terminal',
              params: { serverId: node.serverId, paneId: node.id },
            })
          }
        >
          <Text style={{ color: theme.accent }}>Connect {node.title}</Text>
        </Pressable>
      ) : (
        <View style={styles.serverChoices}>
          {servers.map((server) => (
            <Pressable
              key={server.id}
              accessibilityRole="button"
              onPress={() => onAssign(node.id, server.id)}
            >
              <Text style={{ color: theme.accent }}>Use {server.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.paneActions}>
        <Pressable accessibilityRole="button" onPress={() => onSplit(node.id, 'row')}>
          <Text style={{ color: theme.accent }}>Split side-by-side</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => onSplit(node.id, 'column')}>
          <Text style={{ color: theme.accent }}>Split stacked</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => onClose(node.id)}>
          <Text style={{ color: theme.danger }}>Close</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => onZoom(node.id)}>
          <Text style={{ color: theme.accent }}>Zoom</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  create: { paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10 },
  renameInput: { minWidth: 100, borderWidth: 1, borderRadius: 8, padding: 8 },
  error: { padding: 24, paddingBottom: 0 },
  tabs: { padding: 24, gap: 8 },
  tab: { borderWidth: 1, borderRadius: 8, padding: 10 },
  content: { padding: 24, paddingTop: 0, gap: 12 },
  workspaceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  workspaceActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  title: { fontSize: 19, fontWeight: '700' },
  empty: { padding: 24 },
  split: { gap: 8 },
  splitControls: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' },
  pane: { flex: 1, minWidth: 150, borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  paneActions: { gap: 8 },
  serverChoices: { gap: 6 },
});
