import { useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenShell } from '@/components/ScreenShell';
import {
  type HostKey,
  NativeTerminalView,
  type SessionState,
  TermforgeNative,
} from '@/native/termforgeNative';
import { useTheme } from '@/theme/ThemeProvider';

type Form = { host: string; port: string; username: string; password: string };
const initialForm: Form = {
  host: '',
  port: '2222',
  username: 'termforge',
  password: 'termforge-test',
};

export default function TerminalScreen() {
  const theme = useTheme();
  const [form, setForm] = useState(initialForm);
  const [hostKey, setHostKey] = useState<HostKey>();
  const [sessionId, setSessionId] = useState<string>();
  const [state, setState] = useState<SessionState['state']>('closed');
  const [error, setError] = useState<string>();

  useEffect(() => {
    const subscription = TermforgeNative.addListener('onSessionState', (event) => {
      if (!sessionId || event.sessionId === sessionId) {
        setState(event.state);
        setError(event.state === 'failed' ? (event.message ?? 'Connection failed.') : undefined);
      }
    });
    return () => subscription.remove();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        void TermforgeNative.disconnect(sessionId);
        setSessionId(undefined);
        setState('closed');
      }
    });
    return () => subscription.remove();
  }, [sessionId]);

  async function inspect() {
    setError(undefined);
    try {
      setHostKey(await TermforgeNative.inspectHostKey(form.host.trim(), Number(form.port)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not inspect the server.');
    }
  }

  function approve() {
    if (!hostKey) return;
    Alert.alert(
      'Trust this server?',
      `${hostKey.algorithm}\n${hostKey.fingerprint}\n\nConfirm this fingerprint with the server administrator before continuing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Trust and connect', onPress: connect },
      ],
    );
  }

  async function connect() {
    if (!hostKey) return;
    try {
      const id = await TermforgeNative.createSession();
      setSessionId(id);
      await TermforgeNative.connectPassword(
        id,
        form.host.trim(),
        Number(form.port),
        form.username,
        form.password,
        hostKey.key,
        80,
        24,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Connection failed.');
    }
  }

  async function disconnect() {
    if (sessionId) await TermforgeNative.disconnect(sessionId);
    setSessionId(undefined);
    setHostKey(undefined);
    setState('closed');
  }

  if (sessionId) {
    return (
      <KeyboardAvoidingView
        style={styles.terminalPage}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {form.username}@{form.host} · {state}
          </Text>
          <Pressable accessibilityRole="button" onPress={disconnect}>
            <Text style={styles.disconnect}>Disconnect</Text>
          </Pressable>
        </View>
        <NativeTerminalView style={styles.terminal} sessionId={sessionId} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <ScreenShell
        title="Connect"
        message="Inspect and approve the server identity before your password is used."
      />
      <ScrollView
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Field
            label="Host"
            value={form.host}
            onChangeText={(host) => {
              setForm({ ...form, host });
              setHostKey(undefined);
            }}
          />
          <Field
            label="Port"
            value={form.port}
            keyboardType="number-pad"
            onChangeText={(port) => {
              setForm({ ...form, port });
              setHostKey(undefined);
            }}
          />
          <Field
            label="Username"
            value={form.username}
            onChangeText={(username) => setForm({ ...form, username })}
          />
          <Field
            label="Password"
            value={form.password}
            secureTextEntry
            onChangeText={(password) => setForm({ ...form, password })}
          />
          {hostKey ? (
            <>
              <Text selectable style={{ color: theme.text }}>
                {hostKey.algorithm}
              </Text>
              <Text selectable style={{ color: theme.accent }}>
                {hostKey.fingerprint}
              </Text>
              <Action
                label="Review and connect"
                onPress={approve}
                disabled={!form.username || !form.password}
              />
            </>
          ) : (
            <Action
              label="Inspect server identity"
              onPress={inspect}
              disabled={!form.host || !Number(form.port)}
            />
          )}
          {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const theme = useTheme();
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={{ color: theme.muted }}>{label}</Text>
      <TextInput
        {...inputProps}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { color: theme.text, borderColor: theme.muted }]}
      />
    </View>
  );
}

function Action({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { borderColor: theme.accent, opacity: disabled ? 0.4 : 1 }]}
    >
      <Text style={{ color: theme.accent }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  card: { margin: 24, marginTop: 0, padding: 18, borderRadius: 12, gap: 12 },
  formContent: { flexGrow: 1 },
  field: { gap: 5 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  button: { borderWidth: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  terminalPage: { flex: 1, backgroundColor: '#000' },
  terminal: { flex: 1 },
  statusBar: {
    paddingTop: 54,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: '#111827',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusText: { color: '#d1d5db' },
  disconnect: { color: '#fb7185' },
  error: { color: '#fb7185', padding: 8 },
});
