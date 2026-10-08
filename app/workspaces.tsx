import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';

import { WorkspaceTerminals } from '@/components/WorkspaceTerminals';
import { ScreenShell } from '@/components/ScreenShell';
import { WorkspacePane as Pane } from '@/components/WorkspacePane';
import { ActionButton as Button } from '@/components/ActionButton';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { ServerRepository } from '@/servers/repository';
import { sessionManager, type ManagedSession } from '@/sessions/manager';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaneLeaf, Workspace } from '@/types/domain';
import { closePane, findPane, replacePane, resizeSplit, splitPane } from '@/workspaces/paneTree';
import { duplicateWorkspace as createWorkspaceDuplicate } from '@/workspaces/controller';
import { WorkspaceRepository } from '@/workspaces/repository';
import type { Server } from '@/types/domain';

const makeId = (kind: string) => `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export default function WorkspacesScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [working, setWorking] = useState(false);
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: !working, gestureEnabled: !working });
  }, [navigation, working]);
  const { workspaceId } = useLocalSearchParams<{ workspaceId?: string }>();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [active, setActive] = useState<Workspace>();
  const [name, setName] = useState('');
  const [rename, setRename] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [zoomedPaneId, setZoomedPaneId] = useState<string>();
  const [liveSessions, setLiveSessions] = useState<ManagedSession[]>([]);
  const saving = useRef(false);
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
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => sessionManager.subscribe(setLiveSessions), []);
  useEffect(() => {
    const selected = workspaces.find((workspace) => workspace.id === workspaceId);
    if (!selected) return;
    setActive(selected);
    router.setParams({ workspaceId: undefined });
  }, [workspaceId, workspaces]);

  useEffect(() => {
    setZoomedPaneId(undefined);
    setRenaming(false);
  }, [active?.id]);

  async function persist(workspace: Workspace): Promise<boolean> {
    if (saving.current) return false;
    saving.current = true;
    setError(undefined);
    try {
      const db = await openMetadataDatabase();
      await new WorkspaceRepository(db).save(workspace);
      setActive(workspace);
      await load();
      return true;
    } catch {
      setError('This workspace layout could not be saved.');
      return false;
    } finally {
      saving.current = false;
    }
  }
  async function create() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the workspace a name.');
      return;
    }
    const now = new Date().toISOString();
    const leaf: PaneLeaf = { kind: 'leaf', id: makeId('pane'), title: 'New terminal' };
    const saved = await persist({
      id: makeId('workspace'),
      name: trimmed,
      layout: leaf,
      tabOrder: [leaf.id],
      createdAt: now,
      updatedAt: now,
    });
    if (saved) setName('');
  }
  function split(targetId: string, axis: 'row' | 'column') {
    if (!active) return;
    setZoomedPaneId(undefined);
    try {
      const newLeaf: PaneLeaf = {
        kind: 'leaf',
        id: makeId('pane'),
        title: 'New terminal',
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
  async function removePane(targetId: string) {
    if (!active) return;
    const layout = closePane(active.layout, targetId);
    if (!layout) {
      setError('A workspace must keep one pane. Delete the workspace instead.');
      return;
    }
    try {
      const session = sessionManager.forPane(targetId);
      if (session) await sessionManager.close(session.sessionId);
    } catch {
      setError('The pane could not be disconnected.');
      return;
    }
    setZoomedPaneId(undefined);
    await persist({
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
  function closePaneSession(sessionId: string) {
    void sessionManager
      .close(sessionId)
      .catch(() => setError('The pane session could not be disconnected.'));
  }
  function removeWorkspace(workspace: Workspace) {
    Alert.alert(
      'Delete workspace?',
      `${workspace.name} will be removed and its connected terminals will be disconnected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await Promise.all(
                  sessionManager
                    .snapshot()
                    .filter((session) => findPane(workspace.layout, session.paneId))
                    .map((session) => sessionManager.close(session.sessionId)),
                );
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
    if (await persist({ ...active, name: rename.trim(), updatedAt: new Date().toISOString() }))
      setRenaming(false);
  }
  async function duplicateWorkspace() {
    if (!active) return;
    const now = new Date().toISOString();
    await persist(createWorkspaceDuplicate(active, makeId, now));
  }
  if (working && active)
    return (
      <WorkspaceTerminals
        key={active.id}
        workspace={active}
        servers={servers}
        sessions={liveSessions}
        initialExpanded={zoomedPaneId}
        onLayout={() => {
          setWorking(false);
          setZoomedPaneId(undefined);
        }}
      />
    );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenShell
        compact
        title="Workspaces"
        message="Arrange your panes here, then tap Open terminals to use them together. In the terminal screen, tap a pane to type and use its arrow to expand or restore the split. Connections close in the background."
      />
      <View style={styles.content}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="New workspace name"
          placeholderTextColor={theme.muted}
          accessibilityLabel="New workspace name"
          style={[styles.input, { borderColor: theme.muted, color: theme.text }]}
        />
        <Button label="Create workspace" onPress={() => void create()} />
        {error ? (
          <Text accessibilityRole="alert" style={{ color: theme.danger }}>
            {error}
          </Text>
        ) : null}
        <ScrollView
          horizontal
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={styles.tabs}
        >
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
              <Text
                style={{
                  color: workspace.id === active?.id ? theme.accent : theme.text,
                  fontWeight: '600',
                }}
              >
                {workspace.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {active ? (
          <>
            {renaming ? (
              <TextInput
                value={rename}
                onChangeText={setRename}
                autoFocus
                accessibilityLabel="Workspace name"
                style={[styles.input, { borderColor: theme.muted, color: theme.text }]}
              />
            ) : (
              <Text style={[styles.title, { color: theme.text }]}>{active.name}</Text>
            )}
            <View style={styles.actions}>
              {renaming ? (
                <>
                  <Button label="Save name" onPress={() => void saveRename()} />
                  <Button label="Cancel" onPress={() => setRenaming(false)} />
                </>
              ) : (
                <Button
                  label="Workspace options…"
                  onPress={() =>
                    Alert.alert(active.name, 'Manage workspace', [
                      {
                        text: 'Rename',
                        onPress: () => {
                          setRename(active.name);
                          setRenaming(true);
                        },
                      },
                      { text: 'Duplicate', onPress: () => void duplicateWorkspace() },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => removeWorkspace(active),
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ])
                  }
                />
              )}
            </View>
            <Button
              label="Open terminals"
              onPress={() => {
                setZoomedPaneId(undefined);
                setWorking(true);
              }}
            />
            <Pane
              key={active.id}
              workspaceId={active.id}
              node={active.layout}
              onSplit={split}
              onClose={(id) => void removePane(id)}
              onZoom={(id) => {
                setZoomedPaneId(id);
                setWorking(true);
              }}
              onResize={resize}
              onAssign={assignServer}
              servers={servers}
              liveSessions={liveSessions}
              onDisconnect={closePaneSession}
            />
          </>
        ) : (
          <Text style={{ color: theme.muted }}>
            Create your first workspace above, then choose a server for its first pane.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, gap: 16 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, padding: 12 },
  tabs: { gap: 8, alignItems: 'stretch', paddingVertical: 4 },
  tab: {
    minHeight: 52,
    minWidth: 140,
    maxWidth: 260,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  title: { fontSize: 24, fontWeight: '700', flexShrink: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
