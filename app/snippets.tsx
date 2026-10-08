import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { SnippetRun } from '@/components/SnippetRun';
import { ActionButton as Action } from '@/components/ActionButton';
import { ServerRepository } from '@/servers/repository';
import { ScreenShell } from '@/components/ScreenShell';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { SnippetRepository } from '@/snippets/repository';
import { snippetVariables } from '@/snippets/template';
import { useTheme } from '@/theme/ThemeProvider';
import type { Server, Snippet } from '@/types/domain';

type Draft = {
  name: string;
  command: string;
  description: string;
  category: string;
  favorite: boolean;
};
const blankDraft = (): Draft => ({
  name: '',
  command: '',
  description: '',
  category: 'General',
  favorite: false,
});
const newId = () => `snippet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export default function SnippetsScreen() {
  const theme = useTheme();
  const { snippetId } = useLocalSearchParams<{ snippetId?: string }>();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [draft, setDraft] = useState<Draft>();
  const [editing, setEditing] = useState<Snippet>();
  const [preview, setPreview] = useState<Snippet>();
  const [servers, setServers] = useState<Server[]>([]);
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      const db = await openMetadataDatabase();
      setSnippets(await new SnippetRepository(db).list());
      setServers(await new ServerRepository(db).list());
    } catch {
      setError('Snippets could not be loaded.');
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => {
    const selected = snippets.find((snippet) => snippet.id === snippetId);
    if (!selected) return;
    setDraft(undefined);
    setPreview(selected);
    setError(undefined);
    router.setParams({ snippetId: undefined });
  }, [snippetId, snippets]);
  async function save() {
    if (!draft) return;
    if (!draft.name.trim() || !draft.command.trim()) {
      setError('A snippet needs a name and command.');
      return;
    }
    const now = new Date().toISOString();
    try {
      const db = await openMetadataDatabase();
      await new SnippetRepository(db).save({
        id: editing?.id ?? newId(),
        name: draft.name,
        commandTemplate: draft.command,
        description: draft.description,
        category: draft.category || 'General',
        favorite: draft.favorite,
        variables: snippetVariables(draft.command),
        createdAt: editing?.createdAt ?? now,
        updatedAt: now,
      });
      setDraft(undefined);
      setEditing(undefined);
      await load();
    } catch {
      setError('The snippet could not be saved.');
    }
  }
  function edit(snippet: Snippet) {
    setEditing(snippet);
    setDraft({
      name: snippet.name,
      command: snippet.commandTemplate,
      description: snippet.description,
      category: snippet.category,
      favorite: snippet.favorite,
    });
    setError(undefined);
  }
  function remove(snippet: Snippet) {
    Alert.alert('Delete snippet?', `Delete ${snippet.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              const db = await openMetadataDatabase();
              await new SnippetRepository(db).remove(snippet.id);
              await load();
            } catch {
              setError('The snippet could not be deleted.');
            }
          })();
        },
      },
    ]);
  }
  function openPreview(snippet: Snippet) {
    setPreview(snippet);
    setError(undefined);
  }
  if (draft)
    return (
      <ScrollView
        style={[styles.page, { backgroundColor: theme.background }]}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        <ScreenShell
          compact
          title={editing ? 'Edit snippet' : 'New snippet'}
          message="Save a command, choose a server, then run it from the terminal. Use {{name}} for values you want to fill in each time."
        />
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, marginHorizontal: 24, marginBottom: 24 },
          ]}
        >
          <Field
            label="Name"
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name })}
          />
          <Field
            label="Category"
            value={draft.category}
            onChangeText={(category) => setDraft({ ...draft, category })}
          />
          <Field
            label="Description"
            value={draft.description}
            onChangeText={(description) => setDraft({ ...draft, description })}
          />
          <Field
            label="Command"
            value={draft.command}
            multiline
            onChangeText={(command) => setDraft({ ...draft, command })}
          />
          <View style={styles.favorite}>
            <Text style={{ color: theme.text }}>Favorite</Text>
            <Switch
              value={draft.favorite}
              onValueChange={(favorite) => setDraft({ ...draft, favorite })}
            />
          </View>
          {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
          <Action label="Save snippet" onPress={() => void save()} />
          <Action label="Cancel" onPress={() => setDraft(undefined)} />
        </View>
      </ScrollView>
    );
  if (preview)
    return (
      <SnippetRun
        key={preview.id}
        snippet={preview}
        servers={servers}
        onBack={() => setPreview(undefined)}
      />
    );
  return (
    <ScrollView
      style={[styles.page, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <ScreenShell
        compact
        title="Snippets"
        message="Reusable commands are stored locally and never execute automatically."
      />
      <View style={styles.toolbar}>
        <Action
          label="Add snippet"
          onPress={() => {
            setDraft(blankDraft());
            setEditing(undefined);
            setError(undefined);
          }}
        />
      </View>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <View style={styles.content}>
        {snippets.length === 0 ? (
          <Text style={{ color: theme.muted }}>No snippets yet.</Text>
        ) : null}
        {snippets.map((snippet) => (
          <View key={snippet.id} style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.heading, { color: theme.text }]}>
              {snippet.favorite ? '★ ' : ''}
              {snippet.name}
            </Text>
            <Text style={{ color: theme.muted }}>
              {snippet.category} · {snippet.description || 'No description'}
            </Text>
            <Text selectable style={[styles.command, { color: theme.accent }]}>
              {snippet.commandTemplate}
            </Text>
            <View style={styles.actions}>
              <Action label="Run on server" onPress={() => openPreview(snippet)} />
              <Action label="Edit" onPress={() => edit(snippet)} />
              <Action label="Delete" danger onPress={() => remove(snippet)} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const theme = useTheme();
  const { label, ...input } = props;
  return (
    <View style={styles.field}>
      <Text style={{ color: theme.muted }}>{label}</Text>
      <TextInput
        {...input}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { borderColor: theme.muted, color: theme.text }]}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 24, gap: 12 },
  card: { padding: 16, borderRadius: 12, gap: 10 },
  field: { gap: 5 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 40 },
  favorite: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toolbar: { paddingHorizontal: 24 },
  error: { padding: 24, paddingBottom: 0 },
  heading: { fontSize: 17, fontWeight: '700' },
  command: { fontFamily: 'Courier', fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
