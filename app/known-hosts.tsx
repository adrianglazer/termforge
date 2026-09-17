import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/components/ScreenShell';
import { KnownHostRepository } from '@/known-hosts/repository';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { useTheme } from '@/theme/ThemeProvider';
import type { KnownHost } from '@/types/domain';

export default function KnownHostsScreen() {
  const theme = useTheme();
  const [hosts, setHosts] = useState<KnownHost[]>([]);
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      const database = await openMetadataDatabase();
      setHosts(await new KnownHostRepository(database).list());
    } catch {
      setError('Known hosts could not be loaded.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  function remove(host: KnownHost) {
    Alert.alert(
      'Remove trusted host?',
      `${host.host}:${host.port} will need fingerprint approval before its next connection.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const database = await openMetadataDatabase();
                await new KnownHostRepository(database).remove(host.id);
                await load();
              } catch {
                setError('The trusted host could not be removed.');
              }
            })();
          },
        },
      ],
    );
  }
  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <ScreenShell
        compact
        title="Known hosts"
        message="These saved public identities protect against unexpected server-key changes. Removing one requires a new fingerprint review."
      />
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.list}>
        {hosts.length === 0 ? (
          <Text style={{ color: theme.muted }}>
            No hosts have been saved yet. Choose “Trust and connect” after reviewing a server
            fingerprint.
          </Text>
        ) : null}
        {hosts.map((host) => (
          <View key={host.id} style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.name, { color: theme.text }]}>
              {host.host}:{host.port}
            </Text>
            <Text selectable style={{ color: theme.muted }}>
              {host.algorithm}
            </Text>
            <Text selectable style={{ color: theme.accent }}>
              {host.fingerprint}
            </Text>
            <Text style={{ color: theme.muted }}>
              Approved {new Date(host.approvedAt).toLocaleString()}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => remove(host)}>
              <Text style={{ color: theme.danger }}>Remove trust</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  list: { padding: 24, gap: 12 },
  card: { padding: 16, borderRadius: 12, gap: 7 },
  name: { fontSize: 17, fontWeight: '700' },
  error: { paddingHorizontal: 24 },
});
