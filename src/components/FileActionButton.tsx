import { Pressable, StyleSheet, Text, View } from 'react-native';

type Action = 'info' | 'rename' | 'delete' | 'edit';
const labels: Record<Action, string> = {
  info: 'Information about',
  rename: 'Rename',
  delete: 'Delete',
  edit: 'Edit contents of',
};

export function FileActionButton({
  action,
  name,
  onPress,
}: {
  action: Action;
  name: string;
  onPress: () => void;
}) {
  const color = action === 'delete' ? '#fda4af' : '#5eead4';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${labels[action]} ${name}`}
      onPress={onPress}
      style={styles.button}
    >
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {action === 'delete' ? (
          <View style={styles.trash}>
            <View style={[styles.handle, { borderColor: color }]} />
            <View style={[styles.lid, { backgroundColor: color }]} />
            <View style={[styles.bin, { borderColor: color }]} />
          </View>
        ) : action === 'info' ? (
          <View style={[styles.circle, { borderColor: color }]}>
            <Text style={[styles.info, { color }]}>i</Text>
          </View>
        ) : action === 'rename' ? (
          <View style={styles.rename}>
            <Text style={[styles.letter, { color }]}>A</Text>
            <View style={[styles.cursor, { borderColor: color }]} />
          </View>
        ) : (
          <Text style={[styles.pencil, { color }]}>✎</Text>
        )}
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  circle: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { fontSize: 14, lineHeight: 17, fontWeight: '700' },
  rename: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  letter: { fontSize: 18 },
  cursor: {
    width: 5,
    height: 20,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
  },
  pencil: { fontSize: 26, lineHeight: 30 },
  trash: { width: 20, height: 22, alignItems: 'center' },
  handle: {
    width: 8,
    height: 4,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  lid: { width: 20, height: 1.5 },
  bin: {
    width: 14,
    height: 16,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});
