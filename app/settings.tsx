import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/components/ScreenShell';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { SettingsRepository } from '@/settings/repository';
import { useTheme } from '@/theme/ThemeProvider';
import { terminalThemes } from '@/theme/tokens';
import type { Settings } from '@/types/domain';

export default function SettingsScreen() {
  const theme = useTheme();
  const [settings, setSettings] = useState<Settings>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      const db = await openMetadataDatabase();
      setSettings(await new SettingsRepository(db).get());
    } catch {
      setError('Settings could not be loaded.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function update(next: Settings) {
    try {
      const db = await openMetadataDatabase();
      await new SettingsRepository(db).save(next);
      setSettings(next);
    } catch {
      setError('Settings could not be saved.');
    }
  }
  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <ScreenShell
        compact
        title="Settings"
        message="Preferences are stored locally. Connection credentials and private keys are never included in exports."
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: theme.text }]}>Terminal theme</Text>
        <View style={styles.choices}>
          {terminalThemes.map((name) => (
            <Pressable
              key={name}
              accessibilityRole="radio"
              accessibilityState={{ selected: settings?.theme === name }}
              onPress={() =>
                settings &&
                void update({ ...settings, theme: name, updatedAt: new Date().toISOString() })
              }
              style={[
                styles.choice,
                { borderColor: settings?.theme === name ? theme.accent : theme.muted },
              ]}
            >
              <Text style={{ color: settings?.theme === name ? theme.accent : theme.text }}>
                {name}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.heading, { color: theme.text }]}>Auto-lock</Text>
        <View style={styles.choices}>
          {[1, 5, 15, 30].map((minutes) => (
            <Pressable
              key={minutes}
              accessibilityRole="radio"
              accessibilityState={{ selected: settings?.autoLockMinutes === minutes }}
              onPress={() =>
                settings &&
                void update({
                  ...settings,
                  autoLockMinutes: minutes,
                  updatedAt: new Date().toISOString(),
                })
              }
              style={[
                styles.choice,
                { borderColor: settings?.autoLockMinutes === minutes ? theme.accent : theme.muted },
              ]}
            >
              <Text
                style={{ color: settings?.autoLockMinutes === minutes ? theme.accent : theme.text }}
              >
                {minutes} min
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.heading, { color: theme.text }]}>Terminal font size</Text>
        <View style={styles.choices}>
          {[12, 14, 16, 18].map((terminalFontSize) => (
            <Pressable
              key={terminalFontSize}
              accessibilityRole="radio"
              accessibilityState={{ selected: settings?.terminalFontSize === terminalFontSize }}
              onPress={() =>
                settings &&
                void update({ ...settings, terminalFontSize, updatedAt: new Date().toISOString() })
              }
              style={[
                styles.choice,
                {
                  borderColor:
                    settings?.terminalFontSize === terminalFontSize ? theme.accent : theme.muted,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    settings?.terminalFontSize === terminalFontSize ? theme.accent : theme.text,
                }}
              >
                {terminalFontSize} pt
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.heading, { color: theme.text }]}>Scrollback</Text>
        <View style={styles.choices}>
          {[5_000, 10_000, 25_000].map((scrollbackLines) => (
            <Pressable
              key={scrollbackLines}
              accessibilityRole="radio"
              accessibilityState={{ selected: settings?.scrollbackLines === scrollbackLines }}
              onPress={() =>
                settings &&
                void update({ ...settings, scrollbackLines, updatedAt: new Date().toISOString() })
              }
              style={[
                styles.choice,
                {
                  borderColor:
                    settings?.scrollbackLines === scrollbackLines ? theme.accent : theme.muted,
                },
              ]}
            >
              <Text
                style={{
                  color: settings?.scrollbackLines === scrollbackLines ? theme.accent : theme.text,
                }}
              >
                {scrollbackLines.toLocaleString()} lines
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ color: theme.muted }}>
          Terminal selection and accessory-key preferences stay local to this device. Backgrounded
          SSH sessions are shown as disconnected after return.
        </Text>
        {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 24, gap: 14 },
  heading: { fontSize: 17, fontWeight: '700' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderRadius: 8, padding: 10 },
});
