import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { safeError } from '@/application/errors';
import { TermforgeNative } from '@/native/termforgeNative';
import { ActionButton } from '@/components/ActionButton';
import { ScreenShell } from '@/components/ScreenShell';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { ServerRepository } from '@/servers/repository';
import { SettingsRepository } from '@/settings/repository';
import { SnippetRepository } from '@/snippets/repository';
import { createExport, parseImport } from '@/storage/export';
import { terminalThemes } from '@/theme/tokens';
import { useTheme, useThemeRefresh } from '@/theme/ThemeProvider';
import { WorkspaceRepository } from '@/workspaces/repository';
import type { Server } from '@/types/domain';

export default function ConfigurationScreen() {
  const theme = useTheme();
  const refreshTheme = useThemeRefresh();
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
    setMessage(undefined);
    setError(undefined);
    try {
      if (new TextEncoder().encode(importText).byteLength > 1_000_000) {
        setError('Configuration is too large.');
        return;
      }
      const parsed = parseImport(JSON.parse(importText));
      const database = await openMetadataDatabase();
      await database.withExclusiveTransactionAsync(async (transaction) => {
        const servers = new ServerRepository(transaction);
        const snippets = new SnippetRepository(transaction);
        const workspaces = new WorkspaceRepository(transaction);
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
        const current = await new SettingsRepository(transaction).get();
        await new SettingsRepository(transaction).save({
          ...current,
          theme: parsed.settings.theme,
          autoLockMinutes: parsed.settings.autoLockMinutes,
          updatedAt: new Date().toISOString(),
        });
      });
      await TermforgeNative.setAutoLockMinutes(parsed.settings.autoLockMinutes);
      await refreshTheme();
      setMessage(
        'Configuration imported. Imported server profiles require credential or key rebinding before use.',
      );
      setError(undefined);
      await create();
    } catch (caught) {
      setError(safeError(caught).safeMessage);
    }
  }
  return (
    <ScrollView
      style={[styles.page, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <ScreenShell
        compact
        title="Import & export"
        message="This export intentionally excludes passwords, Keychain references, SSH keys, known-host trust, history, live sessions, startup commands, and environment values."
      />
      <View style={styles.content}>
        <Text style={[styles.heading, { color: theme.text }]}>Export</Text>
        <Text selectable style={[styles.code, { color: theme.accent, borderColor: theme.muted }]}>
          {exportText}
        </Text>
        <ActionButton
          label="Copy export"
          disabled={!exportText}
          onPress={() => {
            void TermforgeNative.copyText(exportText)
              .then(() => {
                setMessage('Configuration copied.');
                setError(undefined);
              })
              .catch(() => setError('The export could not be copied.'));
          }}
        />
        <ActionButton onPress={() => void create()} label="Refresh export" />
        <Text style={[styles.heading, { color: theme.text }]}>Import</Text>
        <Text style={{ color: theme.muted }}>
          Items with matching IDs will be replaced. Export your current configuration first if you
          want a backup.
        </Text>
        <TextInput
          value={importText}
          onChangeText={setImportText}
          multiline
          maxLength={1_000_000}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Paste a Termforge configuration export"
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text, borderColor: theme.muted }]}
        />
        <ActionButton onPress={() => void importConfiguration()} label="Import configuration" />
        {message ? <Text style={{ color: theme.accent }}>{message}</Text> : null}
        {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
      </View>
    </ScrollView>
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
