import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenShell } from './ScreenShell';
import { ActionButton as Button } from './ActionButton';
import { renderSnippet, snippetVariables } from '@/snippets/template';
import type { Server, Snippet } from '@/types/domain';
import { useTheme } from '@/theme/ThemeProvider';

export function SnippetRun({
  snippet,
  servers,
  onBack,
}: {
  snippet: Snippet;
  servers: Server[];
  onBack: () => void;
}) {
  const theme = useTheme();
  const [values, setValues] = useState<Record<string, string>>({});
  const [serverId, setServerId] = useState<string>();
  const [quickConnect, setQuickConnect] = useState(false);
  const [query, setQuery] = useState('');
  const selected = servers.find((server) => server.id === serverId);
  let command: string | undefined;
  let validation: string | undefined;
  try {
    command = renderSnippet(snippet.commandTemplate, values);
  } catch (error) {
    validation = error instanceof Error ? error.message : 'Complete the values below.';
  }
  const matches = servers.filter((server) =>
    `${server.name} ${server.host} ${server.username}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <ScreenShell
        compact
        title="Run snippet"
        message="Choose a server and review your command. After connecting, press Run command in the terminal."
      />
      <View style={styles.content}>
        <Text style={[styles.heading, { color: theme.text }]}>{snippet.name}</Text>
        {snippet.description ? (
          <Text style={{ color: theme.muted }}>{snippet.description}</Text>
        ) : null}
        {snippetVariables(snippet.commandTemplate).map((variable) => (
          <View key={variable} style={{ gap: 6 }}>
            <Text style={{ color: theme.text }}>{variable}</Text>
            <TextInput
              accessibilityLabel={variable}
              value={values[variable] ?? ''}
              onChangeText={(value) => setValues({ ...values, [variable]: value })}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { color: theme.text, borderColor: theme.muted }]}
            />
          </View>
        ))}
        {validation ? <Text style={{ color: theme.muted }}>{validation}</Text> : null}
        <Text
          selectable
          style={[styles.command, { color: theme.text, backgroundColor: theme.surface }]}
        >
          {command ?? snippet.commandTemplate}
        </Text>
        <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
          Choose a server
        </Text>
        {servers.length ? (
          <TextInput
            accessibilityLabel="Search saved servers"
            placeholder="Search saved servers"
            placeholderTextColor={theme.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: theme.text, borderColor: theme.muted }]}
          />
        ) : (
          <>
            <Text style={{ color: theme.muted }}>
              No saved servers yet. Add one from Your servers, or use Quick Connect below.
            </Text>
            <Button label="Go to Your servers" onPress={() => router.push('/servers')} />
          </>
        )}
        {servers.length > 0 && !matches.length ? (
          <Text style={{ color: theme.muted }}>No matching servers.</Text>
        ) : null}
        {matches.map((server) => (
          <Pressable
            key={server.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: server.id === selected?.id && !quickConnect }}
            onPress={() => {
              setServerId(server.id);
              setQuickConnect(false);
            }}
            style={[
              styles.server,
              {
                borderColor:
                  server.id === selected?.id && !quickConnect ? theme.accent : theme.muted,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <Text style={{ color: theme.text, fontWeight: '600' }}>
              {server.id === selected?.id && !quickConnect ? '✓ ' : ''}
              {server.name}
            </Text>
            <Text style={{ color: theme.muted }}>
              {server.username}@{server.host}:{server.port}
            </Text>
          </Pressable>
        ))}
        <Button
          label={quickConnect ? '✓ Quick Connect selected' : 'Use Quick Connect instead'}
          onPress={() => {
            setQuickConnect(true);
            setServerId(undefined);
          }}
        />
        {selected ? (
          <Text style={{ color: theme.text }}>
            Destination: {selected.name} · {selected.username}@{selected.host}
          </Text>
        ) : null}
        <Button
          label={
            quickConnect
              ? 'Continue to Quick Connect'
              : selected
                ? `Continue with ${selected.name}`
                : 'Select a server to continue'
          }
          disabled={!command || (!selected && !quickConnect)}
          onPress={() => {
            if (!command || (!selected && !quickConnect)) return;
            router.push({
              pathname: '/terminal',
              params: { snippet: command, ...(selected ? { serverId: selected.id } : {}) },
            });
          }}
        />
        <Button label="Back to snippets" onPress={onBack} />
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingBottom: 32, gap: 14 },
  heading: { fontSize: 18, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, minHeight: 48, padding: 12 },
  command: { fontFamily: 'Courier', padding: 16, borderRadius: 12, fontSize: 14 },
  server: { borderWidth: 1, borderRadius: 12, minHeight: 64, padding: 14, gap: 6 },
});
