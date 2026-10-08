import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenShell } from '@/components/ScreenShell';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { ServerRepository } from '@/servers/repository';
import { SnippetRepository } from '@/snippets/repository';
import { useTheme } from '@/theme/ThemeProvider';
import { WorkspaceRepository } from '@/workspaces/repository';
import type { Server, Snippet, Workspace } from '@/types/domain';

export default function PaletteScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [servers, setServers] = useState<Server[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      const database = await openMetadataDatabase();
      setServers(await new ServerRepository(database).list());
      setSnippets(await new SnippetRepository(database).list());
      setWorkspaces(await new WorkspaceRepository(database).list());
    } catch {
      setError('Search could not be loaded.');
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const matches = useMemo(() => query.trim().toLowerCase(), [query]);
  const matching = <T extends { name: string }>(items: T[]) =>
    items.filter((item) => !matches || item.name.toLowerCase().includes(matches));
  return (
    <ScrollView
      style={[styles.page, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <ScreenShell
        compact
        title="Search"
        message="Find your servers, workspaces and saved snippets."
      />
      <TextInput
        autoFocus
        accessibilityLabel="Search servers, workspaces and snippets"
        returnKeyType="search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search servers, workspaces, snippets"
        placeholderTextColor={theme.muted}
        style={[styles.input, { borderColor: theme.muted, color: theme.text }]}
      />
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <View style={styles.content}>
        <Section
          title="Servers"
          items={matching(servers)}
          empty="No matching servers."
          render={(server) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/terminal', params: { serverId: server.id } })
              }
            >
              <Text style={{ color: theme.accent }}>
                {server.name} · {server.username}@{server.host}
              </Text>
            </Pressable>
          )}
        />
        <Section
          title="Workspaces"
          items={matching(workspaces)}
          empty="No matching workspaces."
          render={(workspace) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/workspaces', params: { workspaceId: workspace.id } })
              }
            >
              <Text style={{ color: theme.accent }}>{workspace.name}</Text>
            </Pressable>
          )}
        />
        <Section
          title="Snippets"
          items={matching(snippets)}
          empty="No matching snippets."
          render={(snippet) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/snippets', params: { snippetId: snippet.id } })
              }
            >
              <Text style={{ color: theme.accent }}>
                {snippet.favorite ? '★ ' : ''}
                {snippet.name} · {snippet.category}
              </Text>
            </Pressable>
          )}
        />
      </View>
    </ScrollView>
  );
}
function Section<T extends { id: string; name: string }>({
  title,
  items,
  empty,
  render,
}: {
  title: string;
  items: T[];
  empty: string;
  render: (item: T) => React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: theme.text }]}>{title}</Text>
      {items.length ? (
        items.map((item) => <View key={item.id}>{render(item)}</View>)
      ) : (
        <Text style={{ color: theme.muted }}>{empty}</Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  input: { margin: 24, marginTop: 0, borderWidth: 1, borderRadius: 8, padding: 12 },
  error: { paddingHorizontal: 24 },
  content: { padding: 24, paddingTop: 0, gap: 18 },
  section: { gap: 9 },
  heading: { fontSize: 17, fontWeight: '700' },
});
