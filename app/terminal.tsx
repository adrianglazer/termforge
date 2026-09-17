import { useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenShell } from '@/components/ScreenShell';
import { KeyRepository } from '@/keys/repository';
import { KnownHostRepository } from '@/known-hosts/repository';
import { decideHostTrust } from '@/known-hosts/trust';
import { ConnectionHistoryRepository } from '@/history/repository';
import { openMetadataDatabase } from '@/persistence/bootstrap';
import {
  type HostKey,
  NativeTerminalView,
  type RemoteEntry,
  type SessionState,
  type TransferProgress,
  TermforgeNative,
} from '@/native/termforgeNative';
import { ServerRepository } from '@/servers/repository';
import { SettingsRepository } from '@/settings/repository';
import { sessionManager } from '@/sessions/manager';
import { useTheme } from '@/theme/ThemeProvider';

type Form = {
  host: string;
  port: string;
  username: string;
  password: string;
  useJump: boolean;
  jumpHost: string;
  jumpPort: string;
  jumpUsername: string;
  jumpPassword: string;
};
type ImportedKey = Awaited<ReturnType<typeof TermforgeNative.importEd25519Key>>;
const initialForm: Form = {
  host: '',
  port: '2222',
  username: 'termforge',
  password: 'test',
  useJump: false,
  jumpHost: '',
  jumpPort: '22',
  jumpUsername: '',
  jumpPassword: '',
};
const terminalThemes = [
  { name: 'Default Dark', foreground: '#e5e7eb', background: '#000000' },
  { name: 'Default Light', foreground: '#111827', background: '#f9fafb' },
  { name: 'Solarized Dark', foreground: '#839496', background: '#002b36' },
  { name: 'Solarized Light', foreground: '#657b83', background: '#fdf6e3' },
  { name: 'Dracula', foreground: '#f8f8f2', background: '#282a36' },
  { name: 'Monokai', foreground: '#f8f8f2', background: '#272822' },
] as const;

export default function TerminalScreen() {
  const theme = useTheme();
  const safeArea = useSafeAreaInsets();
  const { serverId, paneId, snippet } = useLocalSearchParams<{
    serverId?: string;
    paneId?: string;
    snippet?: string;
  }>();
  const [form, setForm] = useState(initialForm);
  const [hostKey, setHostKey] = useState<HostKey>();
  const [jumpHostKey, setJumpHostKey] = useState<HostKey>();
  const [sessionId, setSessionId] = useState<string>();
  const [state, setState] = useState<SessionState['state']>('closed');
  const [error, setError] = useState<string>();
  const [authentication, setAuthentication] = useState<'password' | 'key'>('password');
  const [keyPassphrase, setKeyPassphrase] = useState('');
  const [importedKey, setImportedKey] = useState<ImportedKey>();
  const [showFiles, setShowFiles] = useState(false);
  const [remotePath, setRemotePath] = useState('/home/termforge');
  const [entries, setEntries] = useState<RemoteEntry[]>([]);
  const [fileSearch, setFileSearch] = useState('');
  const [fileSort, setFileSort] = useState<'name' | 'size'>('name');
  const [transfer, setTransfer] = useState<TransferProgress>();
  const [editor, setEditor] = useState<{ path: string; text: string; fingerprint: string }>();
  const [renameEntry, setRenameEntry] = useState<RemoteEntry>();
  const [renameValue, setRenameValue] = useState('');
  const [directoryName, setDirectoryName] = useState('');
  const [editorSearch, setEditorSearch] = useState('');
  const [editorReplace, setEditorReplace] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMatch, setSearchMatch] = useState({ index: 0, total: 0 });
  const [textComposerOpen, setTextComposerOpen] = useState(false);
  const [textComposer, setTextComposer] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [scrollback, setScrollback] = useState(10_000);
  const [accessoryPreset, setAccessoryPreset] = useState<'compact' | 'extended'>('extended');
  const [terminalThemeIndex, setTerminalThemeIndex] = useState(0);
  const [profileServerId, setProfileServerId] = useState<string>();
  const [historyStartedAt, setHistoryStartedAt] = useState<string>();
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardKind, setForwardKind] = useState<'local' | 'remote'>('local');
  const [forwardListenPort, setForwardListenPort] = useState('8080');
  const [forwardTargetHost, setForwardTargetHost] = useState('127.0.0.1');
  const [forwardTargetPort, setForwardTargetPort] = useState('80');
  const [forwards, setForwards] = useState<
    Array<{ id: string; kind: 'local' | 'remote'; summary: string }>
  >([]);
  const terminalTheme = terminalThemes[terminalThemeIndex] ?? terminalThemes[0];

  useEffect(() => {
    void (async () => {
      try {
        const database = await openMetadataDatabase();
        const settings = await new SettingsRepository(database).get();
        const index = terminalThemes.findIndex((item) => item.name === settings.theme);
        if (index >= 0) setTerminalThemeIndex(index);
        setFontSize(settings.terminalFontSize);
        setScrollback(settings.scrollbackLines);
        setAccessoryPreset(settings.accessoryPreset);
      } catch {
        // A terminal can still open with its safe built-in default if preferences are unavailable.
      }
    })();
  }, []);

  useEffect(() => {
    if (!serverId) return;
    void (async () => {
      try {
        const database = await openMetadataDatabase();
        const server = await new ServerRepository(database).get(serverId);
        if (!server) {
          setError('That saved server is no longer available.');
          return;
        }
        setForm({
          host: server.host,
          port: String(server.port),
          username: server.username,
          password: '',
          useJump: false,
          jumpHost: '',
          jumpPort: '22',
          jumpUsername: '',
          jumpPassword: '',
        });
        setProfileServerId(server.id);
        setAuthentication(server.authMethod === 'key' ? 'key' : 'password');
        if (server.jumpServerId) {
          const jump = await new ServerRepository(database).get(server.jumpServerId);
          if (jump)
            setForm((current) => ({
              ...current,
              useJump: true,
              jumpHost: jump.host,
              jumpPort: String(jump.port),
              jumpUsername: jump.username,
              jumpPassword: '',
            }));
        }
        if (server.authMethod === 'key') {
          const key = server.keyId
            ? await new KeyRepository(database).get(server.keyId)
            : undefined;
          if (!key) {
            setError('This profile needs an SSH key assigned before it can connect.');
            return;
          }
          setImportedKey({
            reference: key.credentialRef,
            algorithm: 'ed25519',
            publicKey: key.publicKey,
            fingerprint: key.fingerprint,
            protection:
              key.protectionPolicy === 'biometry-current-set'
                ? 'biometryCurrentSet'
                : 'userPresence',
          });
        }
      } catch {
        setError('The saved server profile could not be loaded.');
      }
    })();
  }, [serverId]);

  useEffect(() => {
    if (!snippet) return;
    setTextComposer(snippet);
    setTextComposerOpen(true);
  }, [snippet]);

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
    const subscription = TermforgeNative.addListener('onTransferProgress', (event) => {
      if (event.sessionId === sessionId) setTransfer(event);
    });
    return () => subscription.remove();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        void sessionManager.handleAppState('background');
        if (!paneId || !profileServerId) void TermforgeNative.disconnect(sessionId);
        setSessionId(undefined);
        setState('closed');
      }
    });
    return () => subscription.remove();
  }, [paneId, profileServerId, sessionId]);

  async function inspect() {
    setError(undefined);
    try {
      const inspected = await TermforgeNative.inspectHostKey(form.host.trim(), Number(form.port));
      const inspectedJump = form.useJump
        ? await TermforgeNative.inspectHostKey(form.jumpHost.trim(), Number(form.jumpPort))
        : undefined;
      const database = await openMetadataDatabase();
      const knownHost = await new KnownHostRepository(database).get(
        form.host,
        Number(form.port),
        inspected.algorithm,
      );
      const trust = decideHostTrust(knownHost, inspected);
      if (trust.status === 'changed') {
        setHostKey(undefined);
        setError(
          `Host key changed. Expected ${trust.knownHost.fingerprint}; received ${inspected.fingerprint}. Review the server identity in Known hosts before connecting.`,
        );
        return;
      }
      setHostKey(inspected);
      setJumpHostKey(inspectedJump);
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
        { text: 'Connect once', onPress: () => void connect(false) },
        { text: 'Trust and connect', onPress: () => void connect(true) },
      ],
    );
  }

  async function connect(saveTrust = false) {
    if (!hostKey) return;
    const startedAt = new Date().toISOString();
    try {
      if (saveTrust) {
        const database = await openMetadataDatabase();
        await new KnownHostRepository(database).save({
          host: form.host,
          port: Number(form.port),
          algorithm: hostKey.algorithm,
          publicKey: hostKey.key,
          fingerprint: hostKey.fingerprint,
          approvedAt: new Date().toISOString(),
        });
        if (form.useJump && jumpHostKey) {
          await new KnownHostRepository(database).save({
            host: form.jumpHost,
            port: Number(form.jumpPort),
            algorithm: jumpHostKey.algorithm,
            publicKey: jumpHostKey.key,
            fingerprint: jumpHostKey.fingerprint,
            approvedAt: new Date().toISOString(),
          });
        }
      }
      const id =
        paneId && profileServerId
          ? await sessionManager.create(paneId, profileServerId)
          : await TermforgeNative.createSession();
      setSessionId(id);
      setHistoryStartedAt(startedAt);
      if (form.useJump && jumpHostKey) {
        await TermforgeNative.connectPasswordViaJump(
          id,
          form.host.trim(),
          Number(form.port),
          form.username,
          form.password,
          hostKey.key,
          form.jumpHost.trim(),
          Number(form.jumpPort),
          form.jumpUsername,
          form.jumpPassword,
          jumpHostKey.key,
          80,
          24,
        );
      } else if (authentication === 'key' && importedKey) {
        await TermforgeNative.connectKey(
          id,
          form.host.trim(),
          Number(form.port),
          form.username,
          importedKey.reference,
          'Authenticate to use this SSH key.',
          hostKey.key,
          80,
          24,
        );
      } else {
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
      }
    } catch (caught) {
      if (profileServerId) {
        void saveHistory(profileServerId, startedAt, 'failed');
      }
      setError(caught instanceof Error ? caught.message : 'Connection failed.');
    }
  }

  async function importKey() {
    setError(undefined);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) throw new Error('No key file was selected.');
      const response = await fetch(asset.uri);
      const openSSH = await response.text();
      setImportedKey(
        await TermforgeNative.importEd25519Key(openSSH, keyPassphrase, 'userPresence'),
      );
      setKeyPassphrase('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The SSH key could not be imported.');
    }
  }

  async function refreshFiles() {
    if (!sessionId) return;
    try {
      setEntries(await TermforgeNative.listDirectory(sessionId, remotePath));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not list the remote directory.');
    }
  }

  async function download(name: string) {
    if (!sessionId) return;
    try {
      const result = await TermforgeNative.downloadFile(
        sessionId,
        joinRemotePath(remotePath, name),
      );
      setTransfer(undefined);
      Alert.alert(
        'Download complete',
        `${result.bytes} bytes\nSHA-256: ${result.sha256}\n\nThe download is in temporary app storage until you save it to Files.`,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Save to Files',
            onPress: () => {
              void TermforgeNative.saveFileToFiles(result.url).catch((caught: unknown) =>
                setError(
                  caught instanceof Error
                    ? caught.message
                    : 'The download could not be saved to Files.',
                ),
              );
            },
          },
        ],
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Download failed.');
    }
  }

  function openEntry(entry: RemoteEntry) {
    if (entry.isDirectory) {
      setRemotePath(joinRemotePath(remotePath, entry.name));
      setEntries([]);
    } else {
      void download(entry.name);
    }
  }

  function showFileInfo(entry: RemoteEntry) {
    Alert.alert(
      entry.name,
      `Type: ${entry.isDirectory ? 'directory' : 'file'}\nSize: ${entry.size ?? 'unknown'}\nPermissions: ${entry.permissions ?? 'unknown'}\n\nRemote changes and editor write-back require the next native SFTP capability update.`,
    );
  }
  async function openEditor(entry: RemoteEntry) {
    if (!sessionId || entry.isDirectory) return;
    try {
      const loaded = await TermforgeNative.readText(
        sessionId,
        joinRemotePath(remotePath, entry.name),
      );
      setEditor({
        path: joinRemotePath(remotePath, entry.name),
        text: loaded.text,
        fingerprint: loaded.fingerprint,
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'The remote text file could not be opened.',
      );
    }
  }
  async function renameRemote(entry: RemoteEntry) {
    if (!sessionId || !renameValue.trim() || renameValue.includes('/')) {
      setError('Enter a single replacement name without a slash.');
      return;
    }
    try {
      await TermforgeNative.renameRemote(
        sessionId,
        joinRemotePath(remotePath, entry.name),
        joinRemotePath(remotePath, renameValue.trim()),
      );
      setRenameEntry(undefined);
      setRenameValue('');
      await refreshFiles();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The remote entry could not be renamed.');
    }
  }
  function removeRemote(entry: RemoteEntry) {
    if (!sessionId) return;
    Alert.alert(
      `Delete ${entry.isDirectory ? 'directory' : 'file'}?`,
      `Remove ${entry.name} from the remote server?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                if (entry.isDirectory)
                  await TermforgeNative.removeRemoteDirectory(
                    sessionId,
                    joinRemotePath(remotePath, entry.name),
                  );
                else
                  await TermforgeNative.removeRemote(
                    sessionId,
                    joinRemotePath(remotePath, entry.name),
                  );
                await refreshFiles();
              } catch (caught) {
                setError(
                  caught instanceof Error
                    ? caught.message
                    : 'The remote entry could not be deleted.',
                );
              }
            })();
          },
        },
      ],
    );
  }
  async function createDirectory() {
    if (!sessionId || !directoryName.trim() || directoryName.includes('/')) {
      setError('Enter one directory name without a slash.');
      return;
    }
    try {
      await TermforgeNative.createRemoteDirectory(
        sessionId,
        joinRemotePath(remotePath, directoryName.trim()),
      );
      setDirectoryName('');
      await refreshFiles();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The directory could not be created.');
    }
  }
  async function saveEditor() {
    if (!sessionId || !editor) return;
    try {
      await TermforgeNative.writeText(sessionId, editor.path, editor.text, editor.fingerprint);
      setEditor(undefined);
      await refreshFiles();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'The remote text file could not be saved.',
      );
    }
  }

  const visibleEntries = entries
    .filter((entry) => entry.name.toLowerCase().includes(fileSearch.trim().toLowerCase()))
    .sort((left, right) => {
      if (left.isDirectory !== right.isDirectory) return left.isDirectory ? -1 : 1;
      if (fileSort === 'size') return Number(right.size ?? 0) - Number(left.size ?? 0);
      return left.name.localeCompare(right.name);
    });

  async function upload() {
    if (!sessionId) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) throw new Error('No upload file was selected.');
      const uploaded = await TermforgeNative.uploadFile(
        sessionId,
        asset.uri,
        joinRemotePath(remotePath, asset.name),
        false,
      );
      setTransfer(undefined);
      await refreshFiles();
      Alert.alert('Upload complete', `${uploaded.bytes} bytes\nSHA-256: ${uploaded.sha256}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Upload failed.');
    }
  }

  async function search(direction: 'next' | 'previous') {
    if (!sessionId) return;
    setSearchMatch(await TermforgeNative.searchTerminal(sessionId, searchTerm, direction, false));
  }

  async function disconnect() {
    if (sessionId) {
      if (paneId && profileServerId) await sessionManager.close(sessionId);
      else await TermforgeNative.disconnect(sessionId);
    }
    if (profileServerId && historyStartedAt) {
      await saveHistory(profileServerId, historyStartedAt, 'success');
    }
    setSessionId(undefined);
    setHostKey(undefined);
    setState('closed');
  }

  async function startForward() {
    if (!sessionId) return;
    const listenPort = Number(forwardListenPort);
    const targetPort = Number(forwardTargetPort);
    if (
      !Number.isInteger(listenPort) ||
      listenPort < 1 ||
      listenPort > 65535 ||
      !Number.isInteger(targetPort) ||
      targetPort < 1 ||
      targetPort > 65535 ||
      !forwardTargetHost.trim()
    ) {
      setError('Forwarding needs valid ports between 1 and 65535 and a target host.');
      return;
    }
    try {
      const id =
        forwardKind === 'local'
          ? await TermforgeNative.startLocalForward(
              sessionId,
              listenPort,
              forwardTargetHost.trim(),
              targetPort,
            )
          : await TermforgeNative.startRemoteForward(
              sessionId,
              listenPort,
              forwardTargetHost.trim(),
              targetPort,
            );
      setForwards((current) => [
        ...current,
        {
          id,
          kind: forwardKind,
          summary: `${listenPort} → ${forwardTargetHost.trim()}:${targetPort}`,
        },
      ]);
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The forward could not be started.');
    }
  }

  async function stopForward(forwardId: string) {
    if (!sessionId) return;
    try {
      await TermforgeNative.stopForward(sessionId, forwardId);
      setForwards((current) => current.filter((forward) => forward.id !== forwardId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The forward could not be stopped.');
    }
  }

  function changeFontSize(delta: number) {
    setFontSize((current) => {
      const next = Math.max(8, Math.min(32, current + delta));
      void (async () => {
        try {
          const database = await openMetadataDatabase();
          const repository = new SettingsRepository(database);
          const settings = await repository.get();
          await repository.save({
            ...settings,
            terminalFontSize: next,
            updatedAt: new Date().toISOString(),
          });
        } catch {
          // A temporary preference-write failure must not interrupt terminal input.
        }
      })();
      return next;
    });
  }

  async function saveHistory(
    serverId: string,
    startedAt: string,
    outcome: 'success' | 'failed' | 'cancelled',
  ) {
    try {
      const database = await openMetadataDatabase();
      await new ConnectionHistoryRepository(database).save({
        id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        serverId,
        startedAt,
        endedAt: new Date().toISOString(),
        outcome,
      });
    } catch {
      // History must never prevent session cleanup or expose connection content.
    }
  }

  if (sessionId) {
    return (
      <KeyboardAvoidingView
        style={styles.terminalPage}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.statusSafeArea,
            {
              paddingTop: safeArea.top,
              paddingLeft: safeArea.left,
              paddingRight: safeArea.right,
            },
          ]}
        >
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>
              {form.username}@{form.host} · {state}
            </Text>
            <View style={styles.sessionTools}>
              <Pressable accessibilityRole="button" onPress={() => setShowFiles(false)}>
                <Text style={showFiles ? styles.toolText : styles.toolActive}>Terminal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setShowFiles(true);
                  void refreshFiles();
                }}
              >
                <Text style={showFiles ? styles.toolActive : styles.toolText}>Files</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setForwardOpen((value) => !value)}
              >
                <Text style={forwardOpen ? styles.toolActive : styles.toolText}>Forwards</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" onPress={disconnect}>
              <Text style={styles.disconnect}>Disconnect</Text>
            </Pressable>
          </View>
        </View>
        {showFiles ? (
          <View style={styles.files}>
            <TextInput
              value={remotePath}
              onChangeText={setRemotePath}
              onSubmitEditing={refreshFiles}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.pathInput}
            />
            <TextInput
              value={fileSearch}
              onChangeText={setFileSearch}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Search this directory"
              placeholderTextColor="#6b7280"
              style={styles.pathInput}
            />
            <View style={styles.fileActions}>
              <Pressable
                onPress={() => {
                  const parent =
                    remotePath === '/' ? '/' : remotePath.replace(/\/[^/]+\/?$/, '') || '/';
                  setRemotePath(parent);
                  setEntries([]);
                  void TermforgeNative.listDirectory(sessionId, parent)
                    .then(setEntries)
                    .catch(() => setError('Could not list the parent directory.'));
                }}
              >
                <Text style={styles.toolActive}>Up</Text>
              </Pressable>
              <Pressable onPress={refreshFiles}>
                <Text style={styles.toolActive}>Refresh</Text>
              </Pressable>
              <Pressable
                onPress={() => setFileSort((current) => (current === 'name' ? 'size' : 'name'))}
              >
                <Text style={styles.toolActive}>Sort: {fileSort}</Text>
              </Pressable>
              <Pressable onPress={upload}>
                <Text style={styles.toolActive}>Upload</Text>
              </Pressable>
            </View>
            <View style={styles.renameBar}>
              <TextInput
                value={directoryName}
                onChangeText={setDirectoryName}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="New directory"
                placeholderTextColor="#6b7280"
                style={styles.forwardInput}
              />
              <Pressable onPress={() => void createDirectory()}>
                <Text style={styles.toolActive}>Create directory</Text>
              </Pressable>
            </View>
            {transfer ? (
              <Text style={styles.fileMeta}>
                Transferring {transfer.remotePath}: {transfer.bytes}/{transfer.total} bytes
              </Text>
            ) : null}
            {renameEntry ? (
              <View style={styles.renameBar}>
                <TextInput
                  value={renameValue}
                  onChangeText={setRenameValue}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="New name"
                  placeholderTextColor="#6b7280"
                  style={styles.forwardInput}
                />
                <Pressable onPress={() => void renameRemote(renameEntry)}>
                  <Text style={styles.toolActive}>Rename</Text>
                </Pressable>
                <Pressable onPress={() => setRenameEntry(undefined)}>
                  <Text style={styles.disconnect}>Cancel</Text>
                </Pressable>
              </View>
            ) : null}
            <ScrollView>
              {visibleEntries.map((entry) => (
                <View key={entry.name} style={styles.fileRow}>
                  <Pressable onPress={() => openEntry(entry)} style={styles.fileMain}>
                    <Text style={styles.fileName}>
                      {entry.isDirectory ? '▸ ' : ''}
                      {entry.name}
                    </Text>
                    <Text style={styles.fileMeta}>
                      {entry.isDirectory ? 'directory' : (entry.size ?? '—')} ·{' '}
                      {entry.permissions ?? '—'}
                    </Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => showFileInfo(entry)}>
                    <Text style={styles.toolActive}>Info</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setRenameEntry(entry);
                      setRenameValue(entry.name);
                    }}
                  >
                    <Text style={styles.toolActive}>Rename</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => removeRemote(entry)}>
                    <Text style={styles.disconnect}>Delete</Text>
                  </Pressable>
                  {!entry.isDirectory ? (
                    <Pressable accessibilityRole="button" onPress={() => void openEditor(entry)}>
                      <Text style={styles.toolActive}>Edit</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <>
            {searchOpen ? (
              <View style={styles.searchBar}>
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  onSubmitEditing={() => void search('next')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Find in terminal"
                  placeholderTextColor="#6b7280"
                  style={styles.searchInput}
                />
                <Pressable onPress={() => void search('previous')}>
                  <Text style={styles.toolActive}>↑</Text>
                </Pressable>
                <Pressable onPress={() => void search('next')}>
                  <Text style={styles.toolActive}>↓</Text>
                </Pressable>
                <Text style={styles.fileMeta}>
                  {searchMatch.index}/{searchMatch.total}
                </Text>
                <Pressable
                  onPress={() => {
                    setSearchOpen(false);
                    setSearchTerm('');
                    setSearchMatch({ index: 0, total: 0 });
                    void TermforgeNative.searchTerminal(sessionId, '', 'next', false);
                  }}
                >
                  <Text style={styles.disconnect}>Close</Text>
                </Pressable>
              </View>
            ) : null}
            {textComposerOpen ? (
              <View style={styles.composerBar}>
                <TextInput
                  value={textComposer}
                  onChangeText={setTextComposer}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Compose Unicode text"
                  placeholderTextColor="#6b7280"
                  style={styles.searchInput}
                />
                <Pressable
                  disabled={!textComposer}
                  onPress={() => {
                    void TermforgeNative.sendText(sessionId, textComposer);
                    setTextComposer('');
                  }}
                >
                  <Text style={styles.toolActive}>Send</Text>
                </Pressable>
                <Pressable onPress={() => setTextComposerOpen(false)}>
                  <Text style={styles.disconnect}>Close</Text>
                </Pressable>
              </View>
            ) : null}
            {forwardOpen ? (
              <View style={styles.forwardPanel}>
                <View style={styles.forwardKinds}>
                  <Pressable onPress={() => setForwardKind('local')}>
                    <Text style={forwardKind === 'local' ? styles.toolActive : styles.toolText}>
                      Local
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setForwardKind('remote')}>
                    <Text style={forwardKind === 'remote' ? styles.toolActive : styles.toolText}>
                      Remote
                    </Text>
                  </Pressable>
                </View>
                <TextInput
                  value={forwardListenPort}
                  onChangeText={setForwardListenPort}
                  keyboardType="number-pad"
                  placeholder={forwardKind === 'local' ? 'Local port' : 'Remote port'}
                  placeholderTextColor="#6b7280"
                  style={styles.forwardInput}
                />
                <TextInput
                  value={forwardTargetHost}
                  onChangeText={setForwardTargetHost}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Target host"
                  placeholderTextColor="#6b7280"
                  style={styles.forwardInput}
                />
                <TextInput
                  value={forwardTargetPort}
                  onChangeText={setForwardTargetPort}
                  keyboardType="number-pad"
                  placeholder="Target port"
                  placeholderTextColor="#6b7280"
                  style={styles.forwardInput}
                />
                <Pressable onPress={() => void startForward()}>
                  <Text style={styles.toolActive}>Start {forwardKind} forward</Text>
                </Pressable>
                <Text style={styles.forwardHint}>
                  Listeners are loopback-only. SOCKS is unavailable. Forwards close when this
                  session closes.
                </Text>
                {forwards.map((forward) => (
                  <View key={forward.id} style={styles.forwardRow}>
                    <Text style={styles.statusText}>
                      {forward.kind}: {forward.summary}
                    </Text>
                    <Pressable onPress={() => void stopForward(forward.id)}>
                      <Text style={styles.disconnect}>Stop</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <NativeTerminalView
              style={styles.terminal}
              sessionId={sessionId}
              fontSize={fontSize}
              scrollback={scrollback}
              foregroundColor={terminalTheme.foreground}
              backgroundColor={terminalTheme.background}
            />
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="always"
              style={styles.keyBar}
              contentContainerStyle={styles.keyBarContent}
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
                .filter(([, key]) => accessoryPreset === 'extended' || !key.startsWith('f'))
                .map(([label, key]) => (
                  <Pressable
                    key={key}
                    onPress={() => void TermforgeNative.sendKey(sessionId, key)}
                    style={styles.keyButton}
                  >
                    <Text style={styles.keyText}>{label}</Text>
                  </Pressable>
                ))}
              <Pressable onPress={() => setSearchOpen(true)} style={styles.keyButton}>
                <Text style={styles.keyText}>Find</Text>
              </Pressable>
              <Pressable
                onPress={() => setTextComposerOpen((value) => !value)}
                style={styles.keyButton}
              >
                <Text style={styles.keyText}>Unicode</Text>
              </Pressable>
              <Pressable
                onPress={() => void TermforgeNative.pasteClipboard(sessionId)}
                style={styles.keyButton}
              >
                <Text style={styles.keyText}>Paste</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  void TermforgeNative.shareClipboard().catch((caught: unknown) =>
                    setError(
                      caught instanceof Error
                        ? caught.message
                        : 'Copy terminal text before sharing it.',
                    ),
                  )
                }
                style={styles.keyButton}
              >
                <Text style={styles.keyText}>Share</Text>
              </Pressable>
              <Pressable
                onPress={() => void TermforgeNative.clearScrollback(sessionId)}
                style={styles.keyButton}
              >
                <Text style={styles.keyText}>Clear history</Text>
              </Pressable>
              <Pressable onPress={() => changeFontSize(-1)} style={styles.keyButton}>
                <Text style={styles.keyText}>A−</Text>
              </Pressable>
              <Pressable onPress={() => changeFontSize(1)} style={styles.keyButton}>
                <Text style={styles.keyText}>A+</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setTerminalThemeIndex((value) => (value + 1) % terminalThemes.length)
                }
                style={styles.keyButton}
              >
                <Text style={styles.keyText}>{terminalTheme.name}</Text>
              </Pressable>
            </ScrollView>
          </>
        )}
        {editor ? (
          <View style={styles.editorOverlay}>
            <Text style={styles.statusText}>{editor.path} · unsaved</Text>
            <View style={styles.editorFind}>
              <TextInput
                value={editorSearch}
                onChangeText={setEditorSearch}
                placeholder="Find"
                placeholderTextColor="#6b7280"
                style={styles.forwardInput}
              />
              <TextInput
                value={editorReplace}
                onChangeText={setEditorReplace}
                placeholder="Replace"
                placeholderTextColor="#6b7280"
                style={styles.forwardInput}
              />
              <Pressable
                onPress={() => {
                  if (editorSearch)
                    setEditor({
                      ...editor,
                      text: editor.text.split(editorSearch).join(editorReplace),
                    });
                }}
              >
                <Text style={styles.toolActive}>Replace all</Text>
              </Pressable>
            </View>
            <TextInput
              value={editor.text}
              onChangeText={(text) => setEditor({ ...editor, text })}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.editorInput}
            />
            <Text style={styles.forwardHint}>
              Saving writes a temporary sibling then replaces the remote file. A changed remote
              fingerprint blocks the save.
            </Text>
            <View style={styles.editorActions}>
              <Pressable onPress={() => void saveEditor()}>
                <Text style={styles.toolActive}>Save</Text>
              </Pressable>
              <Pressable onPress={() => setEditor(undefined)}>
                <Text style={styles.disconnect}>Discard</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <ScreenShell
        title="Connect"
        message="Inspect and approve the server identity before your password is used."
        compact
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
          <View style={styles.jumpToggle}>
            <Text style={{ color: theme.text }}>Connect through jump host</Text>
            <Switch
              value={form.useJump}
              onValueChange={(useJump) => {
                setForm({ ...form, useJump });
                setHostKey(undefined);
                setJumpHostKey(undefined);
              }}
            />
          </View>
          {form.useJump ? (
            <View style={styles.jumpFields}>
              <Field
                label="Jump host"
                value={form.jumpHost}
                onChangeText={(jumpHost) => setForm({ ...form, jumpHost })}
              />
              <Field
                label="Jump port"
                value={form.jumpPort}
                keyboardType="number-pad"
                onChangeText={(jumpPort) => setForm({ ...form, jumpPort })}
              />
              <Field
                label="Jump username"
                value={form.jumpUsername}
                onChangeText={(jumpUsername) => setForm({ ...form, jumpUsername })}
              />
              <Field
                label="Jump password"
                value={form.jumpPassword}
                secureTextEntry
                onChangeText={(jumpPassword) => setForm({ ...form, jumpPassword })}
              />
            </View>
          ) : null}
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
          <View style={styles.authRow}>
            <Action
              label="Password"
              onPress={() => setAuthentication('password')}
              selected={authentication === 'password'}
            />
            <Action
              label="SSH key"
              onPress={() => setAuthentication('key')}
              selected={authentication === 'key'}
            />
          </View>
          {authentication === 'password' ? (
            <Field
              label="Password"
              value={form.password}
              secureTextEntry
              onChangeText={(password) => setForm({ ...form, password })}
            />
          ) : importedKey ? (
            <View style={styles.keySummary}>
              <Text selectable style={{ color: theme.accent }}>
                {importedKey.fingerprint}
              </Text>
              <Action label="Replace key" onPress={() => setImportedKey(undefined)} />
            </View>
          ) : (
            <View style={styles.keySummary}>
              <Field
                label="Key passphrase (leave empty if none)"
                value={keyPassphrase}
                secureTextEntry
                onChangeText={setKeyPassphrase}
              />
              <Action label="Choose encrypted Ed25519 key" onPress={importKey} />
            </View>
          )}
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
                disabled={
                  !form.username ||
                  (form.useJump
                    ? !form.password ||
                      !form.jumpHost ||
                      !form.jumpUsername ||
                      !form.jumpPassword ||
                      !jumpHostKey
                    : authentication === 'password'
                      ? !form.password
                      : !importedKey)
                }
              />
            </>
          ) : (
            <Action
              label="Inspect server identity"
              onPress={inspect}
              disabled={
                !form.host ||
                !Number(form.port) ||
                (form.useJump && (!form.jumpHost || !Number(form.jumpPort)))
              }
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
  selected,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          borderColor: theme.accent,
          backgroundColor: selected ? theme.background : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
      ]}
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
  authRow: { flexDirection: 'row', gap: 8 },
  keySummary: { gap: 10 },
  jumpToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jumpFields: { gap: 10 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  button: { borderWidth: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  terminalPage: { flex: 1, backgroundColor: '#000' },
  terminal: { flex: 1 },
  statusSafeArea: { backgroundColor: '#000' },
  statusBar: {
    minHeight: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusText: { color: '#e5e7eb', fontSize: 12, flexShrink: 1 },
  sessionTools: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 'auto',
  },
  toolText: { color: '#d1d5db', fontSize: 12 },
  toolActive: { color: '#5eead4', fontWeight: '600', fontSize: 12 },
  files: { flex: 1, backgroundColor: '#030712', padding: 12, gap: 10 },
  forwardPanel: { backgroundColor: '#111827', padding: 10, gap: 8 },
  forwardKinds: { flexDirection: 'row', gap: 16 },
  forwardInput: {
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 6,
    color: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  forwardHint: { color: '#9ca3af', fontSize: 11 },
  forwardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  editorOverlay: {
    position: 'absolute',
    inset: 12,
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  editorInput: {
    flex: 1,
    color: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 6,
    padding: 8,
    textAlignVertical: 'top',
    fontFamily: 'Courier',
  },
  editorActions: { flexDirection: 'row', gap: 18 },
  editorFind: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  renameBar: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pathInput: {
    borderColor: '#4b5563',
    borderWidth: 1,
    borderRadius: 8,
    color: '#f9fafb',
    padding: 10,
  },
  fileActions: { flexDirection: 'row', gap: 20 },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomColor: '#1f2937',
    borderBottomWidth: 1,
  },
  fileMain: { flex: 1, gap: 3 },
  fileName: { color: '#f9fafb', flex: 1 },
  fileMeta: { color: '#9ca3af' },
  keyBar: { flexGrow: 0, backgroundColor: '#111827' },
  keyBarContent: { gap: 6, paddingHorizontal: 8, paddingVertical: 6 },
  keyButton: {
    borderColor: '#4b5563',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  keyText: { color: '#f9fafb' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    backgroundColor: '#111827',
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    backgroundColor: '#111827',
  },
  searchInput: {
    flex: 1,
    color: '#f9fafb',
    borderColor: '#4b5563',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  disconnect: { color: '#fda4af', fontSize: 12 },
  error: { color: '#fb7185', padding: 8 },
});

function joinRemotePath(directory: string, name: string): string {
  return `${directory.replace(/\/$/, '')}/${name}`;
}
