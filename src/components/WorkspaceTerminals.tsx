import { useCallback, useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeTerminalView, TermforgeNative } from '@/native/termforgeNative';
import { safeError } from '@/application/errors';
import { leaves } from '@/workspaces/controller';
import { terminalFrames } from '@/workspaces/terminalLayout';
import type { Workspace, Server } from '@/types/domain';
import type { ManagedSession } from '@/sessions/manager';
import { TerminalToolbar } from './TerminalToolbar';
import { WorkspaceTerminalInput } from './WorkspaceTerminalInput';
import { terminalThemes } from '@/terminal/themes';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { SettingsRepository } from '@/settings/repository';

type Props = {
  workspace: Workspace;
  servers: Server[];
  sessions: ManagedSession[];
  initialExpanded?: string | undefined;
  onLayout: () => void;
};
export function WorkspaceTerminals({
  workspace,
  servers,
  sessions,
  initialExpanded,
  onLayout,
}: Props) {
  const insets = useSafeAreaInsets();
  const panes = leaves(workspace.layout);
  const [selected, setSelected] = useState(initialExpanded ?? panes[0]?.id);
  const [expanded, setExpanded] = useState(initialExpanded);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [visible, setVisible] = useState(false);
  const [keyboard, setKeyboard] = useState(Keyboard.isVisible());
  const [error, setError] = useState<string>();
  const [inputMode, setInputMode] = useState<'find' | 'compose'>();
  const [preferences, setPreferences] = useState({
    fontSize: 14,
    scrollback: 10000,
    preset: 'extended' as 'compact' | 'extended',
    themeIndex: 0,
  });
  const [panePreferences, setPanePreferences] = useState<
    Record<string, { fontSize: number; themeIndex: number }>
  >({});
  useEffect(() => {
    void (async () => {
      try {
        const settings = await new SettingsRepository(await openMetadataDatabase()).get();
        setPreferences({
          fontSize: settings.terminalFontSize,
          scrollback: settings.scrollbackLines,
          preset: settings.accessoryPreset,
          themeIndex: Math.max(
            0,
            terminalThemes.findIndex((theme) => theme.name === settings.theme),
          ),
        });
      } catch {
        /* Use the same defaults as the main terminal. */
      }
    })();
  }, []);
  const selectedPreferences = (selected && panePreferences[selected]) || preferences;
  const selectedTheme = terminalThemes[selectedPreferences.themeIndex] ?? terminalThemes[0];
  function changeFont(delta: number) {
    if (!selected) return;
    const fontSize = Math.max(8, Math.min(32, selectedPreferences.fontSize + delta));
    setPanePreferences((current) => ({
      ...current,
      [selected]: { ...selectedPreferences, fontSize },
    }));
    void (async () => {
      try {
        const repository = new SettingsRepository(await openMetadataDatabase());
        const settings = await repository.get();
        await repository.save({
          ...settings,
          terminalFontSize: fontSize,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        /* A preference failure must not interrupt input. */
      }
    })();
  }

  useFocusEffect(
    useCallback(() => {
      setVisible(true);
      return () => {
        setVisible(false);
        Keyboard.dismiss();
      };
    }, []),
  );
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(undefined), 5000);
    return () => clearTimeout(timer);
  }, [error]);
  const active = sessions.find((session) => session.paneId === selected);
  const activeId = active?.sessionId;
  useEffect(() => {
    if (keyboard && visible && activeId)
      void TermforgeNative.setKeyboardVisible(activeId, true).catch((error: unknown) =>
        setError(safeError(error).safeMessage),
      );
  }, [keyboard, visible, activeId]);

  const open = (paneId: string) => {
    const pane = panes.find((item) => item.id === paneId);
    if (pane?.serverId)
      router.push({
        pathname: '/terminal',
        params: { serverId: pane.serverId, paneId, workspaceId: workspace.id },
      });
  };
  const report = (error: unknown) => setError(safeError(error).safeMessage);
  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={styles.toolbar}>
        <Control
          label="Layout"
          onPress={() => {
            Keyboard.dismiss();
            onLayout();
          }}
        />
        <Text numberOfLines={1} style={styles.title}>
          {workspace.name}
        </Text>
        {expanded ? <Control label="All panes" onPress={() => setExpanded(undefined)} /> : null}
        <Control label="Tools" disabled={!active} onPress={() => selected && open(selected)} />
      </View>
      <View style={styles.canvas} onLayout={(event) => setSize(event.nativeEvent.layout)}>
        {terminalFrames(workspace.layout, size.width, size.height, expanded).map((frame) => {
          const pane = panes.find((item) => item.id === frame.id)!;
          const session = sessions.find((item) => item.paneId === pane.id);
          const server = servers.find((item) => item.id === pane.serverId);
          const appearance = panePreferences[pane.id] ?? preferences;
          const terminalTheme = terminalThemes[appearance.themeIndex] ?? terminalThemes[0];
          return (
            <View
              key={pane.id}
              onTouchStart={() => setSelected(pane.id)}
              style={[
                styles.pane,
                {
                  left: frame.x,
                  top: frame.y,
                  width: frame.width,
                  height: frame.height,
                  display: frame.width && frame.height ? 'flex' : 'none',
                  borderColor: selected === pane.id ? '#5eead4' : '#374151',
                },
              ]}
            >
              <View style={styles.paneHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${server?.name ?? 'unassigned pane'}`}
                  accessibilityState={{ selected: selected === pane.id }}
                  onPress={() => setSelected(pane.id)}
                  style={styles.paneName}
                >
                  <Text numberOfLines={1} style={styles.text}>
                    {server?.name ?? pane.title ?? 'Terminal'}
                  </Text>
                </Pressable>
                <Control
                  label={expanded === pane.id ? '↙' : '↗'}
                  accessibilityLabel={
                    expanded === pane.id ? 'Restore split layout' : 'Expand terminal'
                  }
                  onPress={() => {
                    setSelected(pane.id);
                    setExpanded(expanded === pane.id ? undefined : pane.id);
                  }}
                />
              </View>
              {session && visible ? (
                <NativeTerminalView
                  style={styles.canvas}
                  sessionId={session.sessionId}
                  fontSize={appearance.fontSize}
                  scrollback={preferences.scrollback}
                  foregroundColor={terminalTheme.foreground}
                  backgroundColor={terminalTheme.background}
                />
              ) : (
                <View style={styles.empty}>
                  <Text style={styles.text}>
                    {server ? 'Disconnected' : 'Choose a server in Layout.'}
                  </Text>
                  <Control
                    label={server ? 'Connect' : 'Layout'}
                    onPress={() => (server ? open(pane.id) : onLayout())}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {inputMode && activeId ? (
        <WorkspaceTerminalInput
          key={`${activeId}-${inputMode}`}
          sessionId={activeId}
          mode={inputMode}
          onClose={() => setInputMode(undefined)}
          onError={report}
        />
      ) : null}
      <TerminalToolbar
        sessionId={active?.state === 'ready' ? activeId : undefined}
        keyboardVisible={keyboard}
        bottomInset={8}
        preset={preferences.preset}
        themeName={selectedTheme.name}
        onFind={() => setInputMode('find')}
        onCompose={() => setInputMode((current) => (current === 'compose' ? undefined : 'compose'))}
        onFont={changeFont}
        onTheme={() => {
          if (selected)
            setPanePreferences((current) => ({
              ...current,
              [selected]: {
                ...selectedPreferences,
                themeIndex: (selectedPreferences.themeIndex + 1) % terminalThemes.length,
              },
            }));
        }}
        onError={report}
      />
    </KeyboardAvoidingView>
  );
}
function Control({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
}: {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      hitSlop={3}
      onPress={onPress}
      style={[styles.control, disabled && { opacity: 0.4 }]}
    >
      <Text numberOfLines={1} style={styles.text}>
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#000' },
  canvas: { flex: 1, minHeight: 0, minWidth: 0 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  title: { flex: 1, minWidth: 0, color: '#e5e7eb', fontWeight: '600' },
  control: {
    minHeight: 28,
    minWidth: 32,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 6,
  },
  text: { color: '#d1d5db', fontSize: 12 },
  pane: { position: 'absolute', overflow: 'hidden', borderWidth: 1, backgroundColor: '#000' },
  paneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 5,
    paddingVertical: 3,
    gap: 6,
  },
  paneName: { flex: 1, minWidth: 0, minHeight: 28, justifyContent: 'center', paddingHorizontal: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  error: { color: '#fda4af', padding: 8 },
});
