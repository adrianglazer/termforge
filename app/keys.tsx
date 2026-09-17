import { useCallback, useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenShell } from '@/components/ScreenShell';
import { TermforgeNative } from '@/native/termforgeNative';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import { KeyRepository } from '@/keys/repository';
import { useTheme } from '@/theme/ThemeProvider';
import type { KeyMetadata } from '@/types/domain';

type NativeKey = Awaited<ReturnType<typeof TermforgeNative.generateEd25519Key>>;

export default function KeysScreen() {
  const theme = useTheme();
  const [keys, setKeys] = useState<KeyMetadata[]>([]);
  const [name, setName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [renaming, setRenaming] = useState<KeyMetadata>();
  const [rename, setRename] = useState('');
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      const db = await openMetadataDatabase();
      setKeys(await new KeyRepository(db).list());
    } catch {
      setError('SSH-key metadata could not be loaded.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function saveNativeKey(result: NativeKey, keyName: string) {
    if (!keyName.trim()) throw new Error('Give this SSH key a name.');
    const now = new Date().toISOString();
    const db = await openMetadataDatabase();
    await new KeyRepository(db).save({
      id: `key-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      name: keyName,
      algorithm: result.algorithm,
      publicKey: result.publicKey,
      fingerprint: result.fingerprint,
      credentialRef: result.reference,
      protectionPolicy:
        result.protection === 'biometryCurrentSet' ? 'biometry-current-set' : 'user-presence',
      createdAt: now,
      updatedAt: now,
    });
    setName('');
    setPassphrase('');
    await load();
  }
  async function generate() {
    try {
      setError(undefined);
      if (!name.trim()) throw new Error('Give this SSH key a name.');
      await saveNativeKey(await TermforgeNative.generateEd25519Key('userPresence'), name);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'A protected SSH key could not be generated.',
      );
    }
  }
  async function importKey() {
    try {
      setError(undefined);
      if (!name.trim()) throw new Error('Give this SSH key a name before importing it.');
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) throw new Error('No key file was selected.');
      const response = await fetch(asset.uri);
      await saveNativeKey(
        await TermforgeNative.importEd25519Key(await response.text(), passphrase, 'userPresence'),
        name,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The SSH key could not be imported.');
    }
  }
  function remove(key: KeyMetadata) {
    Alert.alert(
      'Delete SSH key?',
      `Delete ${key.name} from this device? Servers using it will need another key assigned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await TermforgeNative.deleteKey(key.credentialRef);
                const db = await openMetadataDatabase();
                await new KeyRepository(db).remove(key.id);
                await load();
              } catch {
                setError('The SSH key could not be deleted.');
              }
            })();
          },
        },
      ],
    );
  }
  async function saveRename() {
    if (!renaming || !rename.trim()) {
      setError('Give this SSH key a name.');
      return;
    }
    try {
      const database = await openMetadataDatabase();
      await new KeyRepository(database).save({
        ...renaming,
        name: rename.trim(),
        updatedAt: new Date().toISOString(),
      });
      setRenaming(undefined);
      setRename('');
      await load();
    } catch {
      setError('The SSH key could not be renamed.');
    }
  }
  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <ScreenShell
        compact
        title="SSH keys"
        message="Private key material remains protected by the iPhone. Only an opaque reference and public metadata are stored here."
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Field label="Key name" value={name} onChangeText={setName} />
          <Field
            label="Import passphrase (if needed)"
            value={passphrase}
            secureTextEntry
            onChangeText={setPassphrase}
          />
          <View style={styles.actions}>
            <Action label="Generate Ed25519" onPress={() => void generate()} />
            <Action label="Import Ed25519" onPress={() => void importKey()} />
          </View>
          {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
        </View>
        {renaming ? (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Field label="Rename key" value={rename} onChangeText={setRename} />
            <View style={styles.actions}>
              <Action label="Save name" onPress={() => void saveRename()} />
              <Action
                label="Cancel"
                onPress={() => {
                  setRenaming(undefined);
                  setRename('');
                }}
              />
            </View>
          </View>
        ) : null}
        {keys.map((key) => (
          <View key={key.id} style={[styles.keyCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.name, { color: theme.text }]}>{key.name}</Text>
            <Text selectable style={{ color: theme.muted }}>
              {key.algorithm} · {key.protectionPolicy.replaceAll('-', ' ')}
            </Text>
            <Text selectable style={{ color: theme.accent }}>
              {key.fingerprint}
            </Text>
            <Text selectable style={[styles.publicKey, { color: theme.muted }]}>
              {key.publicKey}
            </Text>
            <Text style={[styles.publicHint, { color: theme.muted }]}>
              Select the public key to copy it into authorized_keys.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void TermforgeNative.copyText(key.publicKey).catch(() =>
                  setError('The public key could not be copied.'),
                );
              }}
            >
              <Text style={{ color: theme.accent }}>Copy public key</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void TermforgeNative.copyText(key.publicKey)
                  .then(() => TermforgeNative.shareClipboard())
                  .catch(() => setError('The public key could not be exported.'));
              }}
            >
              <Text style={{ color: theme.accent }}>Export public key</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setRenaming(key);
                setRename(key.name);
              }}
            >
              <Text style={{ color: theme.accent }}>Rename key</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => remove(key)}>
              <Text style={{ color: theme.danger }}>Delete key</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const theme = useTheme();
  const { label, ...input } = props;
  return (
    <View style={styles.field}>
      <Text style={{ color: theme.muted }}>{label}</Text>
      <TextInput
        {...input}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { borderColor: theme.muted, color: theme.text }]}
      />
    </View>
  );
}
function Action({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.action, { borderColor: theme.accent }]}
    >
      <Text style={{ color: theme.accent }}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 24, gap: 12 },
  card: { padding: 16, borderRadius: 12, gap: 12 },
  keyCard: { padding: 16, borderRadius: 12, gap: 7 },
  field: { gap: 5 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  action: { borderWidth: 1, borderRadius: 8, padding: 10 },
  name: { fontSize: 17, fontWeight: '700' },
  publicHint: { fontSize: 12 },
  publicKey: { fontSize: 11 },
});
