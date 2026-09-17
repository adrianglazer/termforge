import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/components/ScreenShell';
import { useTheme } from '@/theme/ThemeProvider';

export default function OnboardingScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <ScreenShell
        compact
        title="Welcome to Termforge"
        message="A native iPhone SSH workstation—not a local Linux shell."
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Step
          number="1"
          title="Create a trusted server"
          body="Save the host and username, inspect its fingerprint, then connect once or save trust after independent verification."
        />
        <Step
          number="2"
          title="Protect an SSH key"
          body="Generate or import an Ed25519 key. Private material remains in native Keychain protection; only a public fingerprint and opaque reference appear in the app."
        />
        <Step
          number="3"
          title="Use remote tools"
          body="Terminal commands run on the connected remote host. SFTP, forwards, snippets, and layouts are explicit actions; Termforge never creates a local Linux environment."
        />
        <View style={[styles.demo, { borderColor: theme.muted }]}>
          <Text style={[styles.demoTitle, { color: theme.text }]}>Demo mode</Text>
          <Text style={{ color: theme.muted }}>
            Demo mode is visual guidance only. It never simulates a live SSH connection, host trust,
            terminal output, or transfer.
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/servers')}>
          <Text style={{ color: theme.accent }}>Set up a server</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
function Step({ number, title, body }: { number: string; title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={styles.step}>
      <Text style={[styles.number, { color: theme.accent }]}>{number}</Text>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={{ color: theme.muted }}>{body}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 24, gap: 20 },
  step: { flexDirection: 'row', gap: 14 },
  number: { fontSize: 22, fontWeight: '700' },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 17, fontWeight: '700' },
  demo: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 5 },
  demoTitle: { fontWeight: '700' },
});
