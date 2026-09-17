import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenShell } from '@/components/ScreenShell';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { ServerRepository } from '@/servers/repository';
import { SettingsRepository } from '@/settings/repository';
import { SnippetRepository } from '@/snippets/repository';
import { createExport, parseImport } from '@/storage/export';
import { terminalThemes } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { WorkspaceRepository } from '@/workspaces/repository';
import type { Server } from '@/types/domain';

export default function ConfigurationScreen() {
  const theme = useTheme();
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const create = useCallback(async () => {
    try {
      const database = await openMetadataDatabase();
      const servers = await new ServerRepository(database).list();
      const snippets = await new SnippetRepository(database).list();
      const workspaces = await new WorkspaceRepository(database).list();
      const settings = await new SettingsRepository(database).get();
      setExportText(
        JSON.stringify(
          createExport({ servers, snippets, workspaces, themes: [...terminalThemes], settings }),
          null,
          2,
        ),
      );
      setError(undefined);
    } catch {
      setError('Configuration could not be exported.');
    }
  }, []);
  useEffect(() => {
    void create();
  }, [create]);
  async function importConfiguration() {
    try {
      const parsed = parseImport(JSON.parse(importText));
      const database = await openMetadataDatabase();
      await database.withTransactionAsync(async () => {
        const servers = new ServerRepository(database);
        const snippets = new SnippetRepository(database);
        const workspaces = new WorkspaceRepository(database);
        for (const source of parsed.servers) {
          const now = new Date().toISOString();
          const server = {
            ...source,
            authMethod: source.authMethod,
            timeoutSeconds: source.timeoutSeconds,
            keepaliveSeconds: source.keepaliveSeconds,
            reconnect: source.reconnect,
            terminalType: source.terminalType,
            createdAt: source.createdAt || now,
            updatedAt: now,
          } as Server;
          await servers.save(server);
        }
        for (const snippet of parsed.snippets) await snippets.save(snippet);
        for (const workspace of parsed.workspaces) await workspaces.save(workspace);
        const current = await new SettingsRepository(database).get();
        await new SettingsRepository(database).save({
          ...current,
          theme: parsed.settings.theme,
          autoLockMinutes: parsed.settings.autoLockMinutes,
          updatedAt: new Date().toISOString(),
        });
      });
      setMessage(
        'Configuration imported. Imported server profiles require credential or key rebinding before use.',
      );
      setError(undefined);
      await create();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Configuration could not be imported.');
    }
  }
  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <ScreenShell
        compact
        title="Import & export"
        message="This export intentionally excludes passwords, Keychain references, SSH keys, known-host trust, history, live sessions, startup commands, and environment values."
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.heading, { color: theme.text }]}>Export</Text>
        <Text selectable style={[styles.code, { color: theme.accent, borderColor: theme.muted }]}>
          {exportText}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => void create()}>
          <Text style={{ color: theme.accent }}>Refresh export</Text>
        </Pressable>
        <Text style={[styles.heading, { color: theme.text }]}>Import</Text>
        <TextInput
          value={importText}
          onChangeText={setImportText}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Paste a Termforge configuration export"
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text, borderColor: theme.muted }]}
        />
        <Pressable accessibilityRole="button" onPress={() => void importConfiguration()}>
          <Text style={{ color: theme.accent }}>Import configuration</Text>
        </Pressable>
        {message ? <Text style={{ color: theme.accent }}>{message}</Text> : null}
        {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 24, gap: 12 },
  heading: { fontSize: 17, fontWeight: '700' },
  code: { borderWidth: 1, borderRadius: 8, padding: 12, fontFamily: 'Courier', fontSize: 11 },
  input: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    fontFamily: 'Courier',
    fontSize: 11,
  },
});
