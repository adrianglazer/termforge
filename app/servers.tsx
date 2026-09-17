import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScreenShell } from '@/components/ScreenShell';
import { KeyRepository } from '@/keys/repository';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { emptyServerDraft, serverFromDraft, type ServerDraft } from '@/servers/model';
import { validateJumpGraph } from '@/servers/jumpGraph';
import { ServerRepository } from '@/servers/repository';
import { sessionManager, type ManagedSession } from '@/sessions/manager';
import { useTheme } from '@/theme/ThemeProvider';
import type { AuthMethod, KeyMetadata, Server } from '@/types/domain';

export default function ServersScreen() {
  const theme = useTheme();
  const [servers, setServers] = useState<Server[]>([]);
  const [keys, setKeys] = useState<KeyMetadata[]>([]);
  const [draft, setDraft] = useState<ServerDraft>();
  const [editing, setEditing] = useState<Server>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [liveSessions, setLiveSessions] = useState<ManagedSession[]>([]);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const db = await openMetadataDatabase();
      setServers(await new ServerRepository(db).list());
      setKeys(await new KeyRepository(db).list());
    } catch {
      setError('Saved servers could not be loaded. Your existing profiles were left unchanged.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => sessionManager.subscribe(setLiveSessions), []);
  function startCreate() {
    setEditing(undefined);
    setDraft(emptyServerDraft());
    setError(undefined);
  }
  function startEdit(server: Server) {
    setEditing(server);
    setDraft({
      name: server.name,
      host: server.host,
      port: String(server.port),
      username: server.username,
      authMethod: server.authMethod,
      ...(server.keyId ? { keyId: server.keyId } : {}),
      ...(server.jumpServerId ? { jumpServerId: server.jumpServerId } : {}),
      timeoutSeconds: String(server.timeoutSeconds),
      keepaliveSeconds: String(server.keepaliveSeconds),
      reconnect: server.reconnect,
      terminalType: server.terminalType,
      startupCommand: server.startupCommand ?? '',
    });
    setError(undefined);
  }
  function startDuplicate(server: Server) {
    setEditing(undefined);
    setDraft({
      name: `${server.name} copy`,
      host: server.host,
      port: String(server.port),
      username: server.username,
      authMethod: server.authMethod,
      ...(server.keyId ? { keyId: server.keyId } : {}),
      timeoutSeconds: String(server.timeoutSeconds),
      keepaliveSeconds: String(server.keepaliveSeconds),
      reconnect: server.reconnect,
      terminalType: server.terminalType,
      startupCommand: server.startupCommand ?? '',
    });
    setError(undefined);
  }
  async function save() {
    if (!draft) return;
    try {
      const db = await openMetadataDatabase();
      const next = serverFromDraft(draft, editing);
      validateJumpGraph([...servers.filter((server) => server.id !== next.id), next]);
      await new ServerRepository(db).save(next);
      setDraft(undefined);
      setEditing(undefined);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'This server profile could not be saved.',
      );
    }
  }
  function confirmDelete(server: Server) {
    Alert.alert('Delete server?', `Remove ${server.name}? This does not delete any SSH key.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              const db = await openMetadataDatabase();
              await new ServerRepository(db).remove(server.id);
              await load();
            } catch {
              setError('The server could not be deleted.');
            }
          })();
        },
      },
    ]);
  }
  if (draft)
    return (
      <ScrollView
        style={[styles.page, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
      >
        <ScreenShell
          title={editing ? 'Edit server' : 'New server'}
          message="Connection details are stored locally. Passwords are requested only when you connect."
          compact
        />
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <DraftField
            label="Name"
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name })}
          />
          <DraftField
            label="Host"
            value={draft.host}
            autoCapitalize="none"
            onChangeText={(host) => setDraft({ ...draft, host })}
          />
          <DraftField
            label="Port"
            value={draft.port}
            keyboardType="number-pad"
            onChangeText={(port) => setDraft({ ...draft, port })}
          />
          <DraftField
            label="Username"
            value={draft.username}
            autoCapitalize="none"
            onChangeText={(username) => setDraft({ ...draft, username })}
          />
          <Text style={[styles.label, { color: theme.muted }]}>Authentication</Text>
          <View style={styles.choiceRow}>
            {(['password', 'key'] as const).map((auth) => (
              <Choice
                key={auth}
                value={auth}
                current={draft.authMethod}
                onChange={(authMethod) => setDraft({ ...draft, authMethod })}
              />
            ))}
          </View>
          <Text style={{ color: theme.muted }}>
            Keyboard-interactive authentication is not available in this build.
          </Text>
          {draft.authMethod === 'key' ? (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.muted }]}>SSH key</Text>
              {keys.length === 0 ? (
                <Text style={{ color: theme.muted }}>
                  Create or import a key from the SSH keys screen first.
                </Text>
              ) : (
                <View style={styles.choiceRow}>
                  {keys.map((key) => (
                    <KeyChoice
                      key={key.id}
                      name={key.name}
                      selected={key.id === draft.keyId}
                      onPress={() => setDraft({ ...draft, keyId: key.id })}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : null}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.muted }]}>Jump host (optional)</Text>
            <Text style={{ color: theme.muted }}>
              One password-authenticated jump host is supported. Chained jumps and SOCKS are
              unavailable.
            </Text>
            <View style={styles.choiceRow}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: !draft.jumpServerId }}
                onPress={() => {
                  const withoutJump = { ...draft };
                  delete withoutJump.jumpServerId;
                  setDraft(withoutJump);
                }}
                style={[
                  styles.choice,
                  { borderColor: !draft.jumpServerId ? theme.accent : theme.muted },
                ]}
              >
                <Text style={{ color: !draft.jumpServerId ? theme.accent : theme.text }}>None</Text>
              </Pressable>
              {servers
                .filter((server) => server.id !== editing?.id)
                .map((server) => (
                  <Pressable
                    key={server.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: draft.jumpServerId === server.id }}
                    onPress={() => setDraft({ ...draft, jumpServerId: server.id })}
                    style={[
                      styles.choice,
                      {
                        borderColor: draft.jumpServerId === server.id ? theme.accent : theme.muted,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: draft.jumpServerId === server.id ? theme.accent : theme.text,
                      }}
                    >
                      {server.name}
                    </Text>
                  </Pressable>
                ))}
            </View>
          </View>
          <DraftField
            label="Connect timeout (seconds)"
            value={draft.timeoutSeconds}
            keyboardType="number-pad"
            onChangeText={(timeoutSeconds) => setDraft({ ...draft, timeoutSeconds })}
          />
          <DraftField
            label="Keepalive (seconds)"
            value={draft.keepaliveSeconds}
            keyboardType="number-pad"
            onChangeText={(keepaliveSeconds) => setDraft({ ...draft, keepaliveSeconds })}
          />
          <DraftField
            label="Terminal type"
            value={draft.terminalType}
            autoCapitalize="none"
            onChangeText={(terminalType) => setDraft({ ...draft, terminalType })}
          />
          <DraftField
            label="Startup command (optional)"
            value={draft.startupCommand}
            autoCapitalize="none"
            onChangeText={(startupCommand) => setDraft({ ...draft, startupCommand })}
          />
          <View style={styles.switchRow}>
            <Text style={{ color: theme.text }}>Reconnect after interruption</Text>
            <Switch
              value={draft.reconnect}
              onValueChange={(reconnect) => setDraft({ ...draft, reconnect })}
            />
          </View>
          {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            style={[styles.primary, { backgroundColor: theme.accent }]}
            onPress={() => void save()}
          >
            <Text style={styles.primaryText}>Save server</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={styles.cancel}
            onPress={() => setDraft(undefined)}
          >
            <Text style={{ color: theme.muted }}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <ScreenShell
        title="Servers"
        message="Manage connection profiles. Server identities are verified before authentication."
        compact
      />
      <View style={styles.listHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Saved servers</Text>
        <Pressable
          accessibilityRole="button"
          style={[styles.newButton, { borderColor: theme.accent }]}
          onPress={startCreate}
        >
          <Text style={{ color: theme.accent }}>Add server</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={theme.accent} /> : null}
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.list}>
        {!loading && servers.length === 0 ? (
          <Text style={{ color: theme.muted }}>
            No servers yet. Add one to start a trusted SSH connection.
          </Text>
        ) : null}
        {servers.map((server) => (
          <View key={server.id} style={[styles.serverCard, { backgroundColor: theme.surface }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Connect to ${server.name}`}
              style={styles.serverMain}
              onPress={() =>
                router.push({ pathname: '/terminal', params: { serverId: server.id } })
              }
            >
              <Text style={[styles.serverName, { color: theme.text }]}>{server.name}</Text>
              <Text style={{ color: theme.muted }}>
                {server.username}@{server.host}:{server.port}
              </Text>
              <Text style={{ color: theme.muted }}>
                {server.authMethod} · {server.terminalType}
              </Text>
              <Text style={{ color: theme.muted }}>
                Saved profile ·{' '}
                {liveSessions.some((session) => session.serverId === server.id)
                  ? 'active pane session'
                  : 'disconnected'}
              </Text>
              {liveSessions
                .filter((session) => session.serverId === server.id)
                .map((session) => (
                  <Text key={session.sessionId} style={{ color: theme.accent }}>
                    Pane session · {session.state}
                  </Text>
                ))}
            </Pressable>
            <View style={styles.serverActions}>
              <Pressable accessibilityRole="button" onPress={() => startEdit(server)}>
                <Text style={{ color: theme.accent }}>Edit</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => startDuplicate(server)}>
                <Text style={{ color: theme.accent }}>Duplicate</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => confirmDelete(server)}>
                <Text style={{ color: theme.danger }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
function DraftField(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const theme = useTheme();
  const { label, ...input } = props;
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <TextInput
        {...input}
        autoCorrect={false}
        style={[styles.input, { color: theme.text, borderColor: theme.muted }]}
      />
    </View>
  );
}
function Choice({
  value,
  current,
  onChange,
}: {
  value: AuthMethod;
  current: AuthMethod;
  onChange: (value: AuthMethod) => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: value === current }}
      onPress={() => onChange(value)}
      style={[styles.choice, { borderColor: value === current ? theme.accent : theme.muted }]}
    >
      <Text style={{ color: value === current ? theme.accent : theme.text }}>{value}</Text>
    </Pressable>
  );
}
function KeyChoice({
  name,
  selected,
  onPress,
}: {
  name: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, { borderColor: selected ? theme.accent : theme.muted }]}
    >
      <Text style={{ color: selected ? theme.accent : theme.text }}>{name}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingBottom: 32 },
  listHeader: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  newButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  list: { padding: 24, paddingTop: 4, gap: 12 },
  serverCard: { padding: 14, borderRadius: 12, gap: 12 },
  serverMain: { gap: 3 },
  serverName: { fontSize: 17, fontWeight: '700' },
  serverActions: { flexDirection: 'row', gap: 20 },
  card: { margin: 24, marginTop: 0, padding: 18, borderRadius: 12, gap: 14 },
  field: { gap: 5 },
  label: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  primary: { padding: 13, borderRadius: 8, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  cancel: { padding: 10, alignItems: 'center' },
  error: { paddingHorizontal: 24, paddingBottom: 12 },
});
