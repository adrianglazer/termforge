import { useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  path: string;
  onPath: (value: string) => void;
  onBrowse: (path: string) => void;
  remotePath: string;
  search: string;
  onSearch: (value: string) => void;
  sort: 'name' | 'size';
  onSort: () => void;
  onUpload: () => void;
  directoryName: string;
  onDirectoryName: (value: string) => void;
  onCreate: () => Promise<boolean>;
};

export function SftpToolbar(props: Props) {
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  async function create() {
    if (saving) return;
    setSaving(true);
    try {
      if (await props.onCreate()) {
        setCreating(false);
        Keyboard.dismiss();
      }
    } finally {
      setSaving(false);
    }
  }
  return (
    <View style={styles.group}>
      <View style={styles.row}>
        <Tool
          icon="↑"
          label="Parent directory"
          disabled={props.remotePath === '/'}
          onPress={() => props.onBrowse(props.remotePath.replace(/\/[^/]+\/?$/, '') || '/')}
        />
        <TextInput
          accessibilityLabel="Remote directory path"
          value={props.path}
          onChangeText={props.onPath}
          onSubmitEditing={() => props.onBrowse(props.path)}
          returnKeyType="go"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, styles.path]}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.row}
      >
        <Tool icon="↻" label="Refresh directory" onPress={() => props.onBrowse(props.path)} />
        <Tool
          icon="search"
          label={searching ? 'Close directory search' : 'Search directory'}
          selected={searching || Boolean(props.search)}
          onPress={() => {
            setSearching(!searching);
            if (searching) props.onSearch('');
          }}
        />
        <Tool
          icon="↕"
          label={`Sort by ${props.sort === 'name' ? 'size' : 'name'}`}
          text={props.sort === 'name' ? 'Name' : 'Size'}
          onPress={props.onSort}
        />
        <Tool icon="↑" label="Upload file" text="Upload" onPress={props.onUpload} />
        <Tool
          icon="folder"
          label="New folder"
          selected={creating}
          onPress={() => setCreating(!creating)}
        />
      </ScrollView>
      {searching || props.search ? (
        <TextInput
          accessibilityLabel="Search this directory"
          placeholder="Search this directory"
          placeholderTextColor="#9ca3af"
          value={props.search}
          onChangeText={props.onSearch}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      ) : null}
      {creating ? (
        <View style={styles.row}>
          <TextInput
            accessibilityLabel="New folder name"
            placeholder="Folder name"
            placeholderTextColor="#9ca3af"
            value={props.directoryName}
            onChangeText={props.onDirectoryName}
            onSubmitEditing={() => void create()}
            returnKeyType="done"
            autoFocus
            editable={!saving}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, styles.path]}
          />
          <Tool
            label="Create folder"
            text={saving ? '…' : 'Create'}
            disabled={saving || !props.directoryName.trim()}
            onPress={() => void create()}
          />
          <Tool
            icon="×"
            label="Cancel new folder"
            disabled={saving}
            onPress={() => {
              setCreating(false);
              props.onDirectoryName('');
              Keyboard.dismiss();
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
function Tool({
  icon,
  label,
  text,
  onPress,
  disabled = false,
  selected = false,
}: {
  icon?: string;
  label: string;
  text?: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        selected && styles.selected,
        { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
      ]}
    >
      {icon ? (
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {icon === 'search' ? (
            <View style={styles.searchIcon}>
              <View style={styles.lens} />
              <View style={styles.handle} />
            </View>
          ) : icon === 'folder' ? (
            <View style={styles.folder}>
              <View style={styles.folderTab} />
              <Text style={styles.plus}>+</Text>
            </View>
          ) : (
            <Text style={styles.icon}>{icon}</Text>
          )}
        </View>
      ) : null}
      {text ? (
        <Text numberOfLines={1} style={styles.label}>
          {text}
        </Text>
      ) : null}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  group: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#e5e7eb',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    fontSize: 14,
  },
  path: { flex: 1, minWidth: 0 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#111827',
  },
  selected: { borderColor: '#5eead4', backgroundColor: '#134e4a' },
  label: { color: '#5eead4', fontSize: 12, fontWeight: '600' },
  icon: { color: '#5eead4', fontSize: 22, lineHeight: 26 },
  searchIcon: { width: 21, height: 21 },
  lens: { width: 15, height: 15, borderWidth: 1.7, borderColor: '#5eead4', borderRadius: 8 },
  handle: {
    position: 'absolute',
    left: 14,
    top: 12,
    width: 2,
    height: 9,
    backgroundColor: '#5eead4',
    transform: [{ rotate: '-45deg' }],
  },
  folder: {
    width: 22,
    height: 17,
    borderWidth: 1.5,
    borderColor: '#5eead4',
    borderRadius: 3,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderTab: {
    position: 'absolute',
    top: -5,
    left: 1,
    width: 9,
    height: 4,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: '#5eead4',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  plus: { color: '#5eead4', fontSize: 16, lineHeight: 17 },
});
