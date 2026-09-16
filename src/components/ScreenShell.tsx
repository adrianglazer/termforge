import { Link } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

const appIcon = require('../../assets/icon.png');

export function ScreenShell({ title, message }: { title: string; message: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <View style={styles.heading}>
        <Image source={appIcon} style={styles.icon} accessibilityLabel="Termforge icon" />
        <View style={styles.headingText}>
          <Text style={[styles.brand, { color: theme.muted }]}>TERMFORGE</Text>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        </View>
      </View>
      <Text style={{ color: theme.muted }}>{message}</Text>
      <View style={styles.nav}>
        <Link href="/servers" style={{ color: theme.accent }}>
          Servers
        </Link>
        <Link href="/terminal" style={{ color: theme.accent }}>
          Terminal
        </Link>
        <Link href="/settings" style={{ color: theme.accent }}>
          Settings
        </Link>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headingText: { gap: 1 },
  icon: { width: 56, height: 56, borderRadius: 13 },
  brand: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  title: { fontSize: 30, fontWeight: '700' },
  nav: { flexDirection: 'row', gap: 18, marginTop: 16 },
});
