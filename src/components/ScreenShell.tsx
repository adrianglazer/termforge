import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

const appIcon = require('../../assets/icon.png');

export function ScreenShell({
  title,
  message,
  compact = false,
}: {
  title: string;
  message: string;
  compact?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.page, compact && styles.compact, { backgroundColor: theme.background }]}>
      <View style={styles.heading}>
        <Image source={appIcon} style={styles.icon} accessibilityLabel="Termforge icon" />
        <View style={styles.headingText}>
          <Text style={[styles.brand, { color: theme.muted }]}>TERMFORGE</Text>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
            {title}
          </Text>
        </View>
      </View>
      <Text style={[styles.message, { color: theme.muted }]}>{message}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 24, gap: 14 },
  compact: { flexGrow: 0, flexShrink: 0 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headingText: { gap: 1, flex: 1 },
  icon: { width: 56, height: 56, borderRadius: 13, flexShrink: 0 },
  brand: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  message: { fontSize: 14, lineHeight: 18 },
});
