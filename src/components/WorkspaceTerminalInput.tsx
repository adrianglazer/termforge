import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { TermforgeNative } from '@/native/termforgeNative';

export function WorkspaceTerminalInput({
  sessionId,
  mode,
  onClose,
  onError,
}: {
  sessionId: string;
  mode: 'find' | 'compose';
  onClose: () => void;
  onError: (error: unknown) => void;
}) {
  const [text, setText] = useState('');
  const [match, setMatch] = useState({ index: 0, total: 0 });
  const [busy, setBusy] = useState(false);
  async function search(direction: 'previous' | 'next') {
    try {
      setMatch(await TermforgeNative.searchTerminal(sessionId, text, direction, false));
    } catch (error) {
      onError(error);
    }
  }
  async function send() {
    if (busy || !text) return;
    setBusy(true);
    try {
      await TermforgeNative.sendText(sessionId, text);
      onClose();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }
  const button = (label: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      style={styles.button}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.panel}>
      <TextInput
        accessibilityLabel={
          mode === 'find' ? 'Find in selected terminal' : 'Text for selected terminal'
        }
        value={text}
        onChangeText={setText}
        editable={!busy}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={mode === 'compose'}
        placeholder={mode === 'find' ? 'Find in selected pane' : 'Compose Unicode text'}
        placeholderTextColor="#9ca3af"
        style={styles.input}
        onSubmitEditing={() => mode === 'find' && void search('next')}
      />
      <View style={styles.row}>
        {mode === 'find' ? (
          <>
            {button('Previous', () => void search('previous'))}
            {button('Next', () => void search('next'))}
            <Text style={styles.text}>
              {match.index}/{match.total}
            </Text>
          </>
        ) : (
          button(busy ? 'Sending…' : 'Send text', () => void send())
        )}
        {button('Close', onClose)}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  panel: { padding: 8, gap: 6, backgroundColor: '#111827' },
  input: {
    minHeight: 36,
    maxHeight: 100,
    padding: 8,
    borderWidth: 1,
    borderRadius: 6,
    borderColor: '#4b5563',
    color: '#fff',
  },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  button: {
    minHeight: 36,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
    borderColor: '#4b5563',
  },
  text: { color: '#d1d5db', fontSize: 12 },
});
