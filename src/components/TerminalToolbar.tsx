import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TermforgeNative } from '@/native/termforgeNative';
import { KeyboardToggleIcon } from './KeyboardToggleIcon';

type Props = {
  sessionId: string | undefined;
  keyboardVisible: boolean;
  bottomInset: number;
  preset: 'compact' | 'extended';
  themeName: string;
  onFind: () => void;
  onCompose: () => void;
  onFont: (delta: number) => void;
  onTheme: () => void;
  onError: (error: unknown) => void;
};
export function TerminalToolbar(props: Props) {
  const { sessionId, keyboardVisible, onError } = props;
  const run = (operation: (id: string) => Promise<unknown>) => {
    if (sessionId) void operation(sessionId).catch(onError);
  };
  const button = (label: string, onPress: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!sessionId}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: !sessionId ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.bar, { paddingBottom: keyboardVisible ? 0 : props.bottomInset }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={keyboardVisible ? 'Hide keyboard' : 'Show keyboard'}
        disabled={!sessionId && !keyboardVisible}
        style={styles.toggle}
        onPress={() => {
          if (keyboardVisible) Keyboard.dismiss();
          run((id) => TermforgeNative.setKeyboardVisible(id, !keyboardVisible));
        }}
      >
        <KeyboardToggleIcon visible={keyboardVisible} />
      </Pressable>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="always"
        style={styles.scroll}
        contentContainerStyle={styles.keys}
      >
        {(
          [
            ['Esc', 'escape'],
            ['Tab', 'tab'],
            ['Ctrl-C', 'ctrlC'],
            ['Ctrl-D', 'ctrlD'],
            ['←', 'left'],
            ['↑', 'up'],
            ['↓', 'down'],
            ['→', 'right'],
            ['F1', 'f1'],
            ['F2', 'f2'],
            ['F3', 'f3'],
            ['F4', 'f4'],
            ['F5', 'f5'],
            ['F6', 'f6'],
            ['F7', 'f7'],
            ['F8', 'f8'],
            ['F9', 'f9'],
            ['F10', 'f10'],
            ['F11', 'f11'],
            ['F12', 'f12'],
          ] as const
        )
          .filter(([, key]) => props.preset === 'extended' || !key.startsWith('f'))
          .map(([label, key]) =>
            button(label, () => run((id) => TermforgeNative.sendKey(id, key))),
          )}
        {button('Find', props.onFind)}
        {button('Unicode', props.onCompose)}
        {button('Paste', () => run((id) => TermforgeNative.pasteClipboard(id)))}
        {button('Share', () => run(() => TermforgeNative.shareClipboard()))}
        {button('Clear history', () => run((id) => TermforgeNative.clearScrollback(id)))}
        {button('A−', () => props.onFont(-1))}
        {button('A+', () => props.onFont(1))}
        {button(props.themeName, props.onTheme)}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#111827' },
  toggle: {
    width: 44,
    flexShrink: 0,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: '#374151',
  },
  scroll: { flex: 1, minWidth: 0 },
  keys: { gap: 6, paddingHorizontal: 8, paddingVertical: 5 },
  button: {
    minHeight: 36,
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 7,
    paddingHorizontal: 10,
  },
  text: { color: '#f9fafb', fontSize: 13 },
});
