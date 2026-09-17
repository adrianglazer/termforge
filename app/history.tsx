import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/components/ScreenShell';
import { ConnectionHistoryRepository } from '@/history/repository';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { ServerRepository } from '@/servers/repository';
import { useTheme } from '@/theme/ThemeProvider';
import type { ConnectionHistory, Server } from '@/types/domain';

export default function HistoryScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<ConnectionHistory[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      const database = await openMetadataDatabase();
      setItems(await new ConnectionHistoryRepository(database).list());
      setServers(await new ServerRepository(database).list());
    } catch {
      setError('Connection history could not be loaded.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <ScreenShell
        compact
        title="Connection history"
        message="This history contains only timing and safe outcomes—never commands, output, credentials, or private keys."
      />
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <Text style={{ color: theme.muted }}>No saved connection history yet.</Text>
        ) : null}
        {items.map((item) => (
          <View key={item.id} style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.name, { color: theme.text }]}>
              {servers.find((server) => server.id === item.serverId)?.name ?? 'Deleted server'}
            </Text>
            <Text style={{ color: theme.muted }}>
              {item.outcome} · {new Date(item.startedAt).toLocaleString()}
            </Text>
            {item.endedAt ? (
              <Text style={{ color: theme.muted }}>
                Ended {new Date(item.endedAt).toLocaleString()}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 24, gap: 12 },
  card: { padding: 14, borderRadius: 12, gap: 4 },
  name: { fontSize: 17, fontWeight: '700' },
  error: { paddingHorizontal: 24 },
});
