import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { lightColors } from '@/theme/tokens';

export function HomeActions({ onAddServer }: { onAddServer: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.actions}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search servers, workspaces and snippets"
        onPress={() => router.push('/palette')}
        style={[styles.search, { backgroundColor: theme.surface }]}
      >
        <Text style={{ color: theme.muted }}>Search servers, workspaces, snippets…</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onAddServer}
        style={[styles.add, { backgroundColor: theme.accent }]}
      >
        <Text
          style={[
            styles.addText,
            { color: theme.background === lightColors.background ? '#fff' : '#0d1117' },
          ]}
        >
          + Add server
        </Text>
      </Pressable>
      <View style={styles.cards}>
        {(
          [
            ['/keys', 'SSH keys', 'Add or manage keys'],
            ['/workspaces', 'Workspaces', 'Create and organize panes'],
          ] as const
        ).map(([route, title, detail]) => (
          <Pressable
            key={route}
            accessibilityRole="button"
            onPress={() => router.push(route)}
            style={[styles.card, { backgroundColor: theme.surface }]}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.detail, { color: theme.muted }]}>{detail}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function HomeTools() {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.tools}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
        style={styles.tool}
      >
        <Text style={[styles.cardTitle, { color: theme.muted }]}>More tools</Text>
        <Text style={{ color: theme.muted }}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded ? (
        <View style={[styles.toolList, { backgroundColor: theme.surface }]}>
          {(
            [
              ['/snippets', 'Snippets'],
              ['/terminal', 'Quick connection'],
              ['/known-hosts', 'Known hosts'],
              ['/history', 'Connection history'],
              ['/configuration', 'Import & export'],
              ['/access', 'Access & purchases'],
            ] as const
          ).map(([route, label]) => (
            <Pressable
              key={route}
              accessibilityRole="button"
              onPress={() => router.push(route)}
              style={styles.tool}
            >
              <Text style={{ color: theme.text }}>{label}</Text>
              <Text style={{ color: theme.muted }}>›</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function HelpFooter() {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.background }}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Help and support, opens in browser"
        style={styles.help}
        onPress={() => {
          void Linking.openURL('https://termforge.glazer.es/support').catch(() =>
            Alert.alert(
              'Could not open Help',
              'Please visit https://termforge.glazer.es/support in your browser.',
            ),
          );
        }}
      >
        <Text style={{ color: theme.accent }}>Help & support ↗</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: { paddingHorizontal: 24, gap: 12, marginBottom: 24 },
  search: { minHeight: 48, borderRadius: 12, padding: 14, justifyContent: 'center' },
  add: {
    minHeight: 48,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontWeight: '700', fontSize: 16 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flexGrow: 1, flexBasis: 140, padding: 16, borderRadius: 12, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  detail: { fontSize: 13, lineHeight: 18 },
  tools: { marginHorizontal: 24, marginBottom: 20 },
  toolList: { borderRadius: 12, paddingHorizontal: 14 },
  tool: {
    minHeight: 48,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  help: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
});
