import { Pressable, StyleSheet, Text, View } from 'react-native';

type Tab = 'Terminal' | 'Files' | 'Forwards';

export function SessionToolbar({
  connection,
  active,
  onSelect,
  onDisconnect,
}: {
  connection: string;
  active: Tab;
  onSelect: (tab: Tab) => void;
  onDisconnect: () => void;
}) {
  return (
    <View style={styles.bar}>
      <Text
        style={styles.connection}
        numberOfLines={1}
        ellipsizeMode="tail"
        accessibilityLabel={connection}
      >
        {connection}
      </Text>
      {(['Terminal', 'Files', 'Forwards'] as const).map((tab) => (
        <Pressable
          key={tab}
          accessibilityRole="button"
          accessibilityLabel={tab}
          accessibilityState={{ selected: active === tab }}
          onPress={() => onSelect(tab)}
          style={({ pressed }) => [styles.touch, pressed && styles.pressed]}
        >
          <View style={[styles.button, active === tab && styles.selected]}>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={[styles.label, active === tab && styles.selectedLabel]}
            >
              {tab}
            </Text>
          </View>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Disconnect from server"
        onPress={onDisconnect}
        style={({ pressed }) => [styles.touch, styles.powerTouch, pressed && styles.pressed]}
      >
        <View
          style={[styles.button, styles.powerButton]}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={styles.powerRing} />
          <View style={styles.powerStem} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    backgroundColor: '#1f2937',
  },
  connection: { flex: 1, minWidth: 0, color: '#d1d5db', fontSize: 12, marginRight: 2 },
  touch: { minHeight: 44, minWidth: 44, flexShrink: 0, justifyContent: 'center' },
  button: {
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: '#111827',
  },
  selected: { borderColor: '#5eead4', backgroundColor: '#134e4a' },
  label: { color: '#d1d5db', fontSize: 12, fontWeight: '600' },
  selectedLabel: { color: '#5eead4' },
  pressed: { opacity: 0.65 },
  powerTouch: { width: 44 },
  powerButton: { borderColor: '#7f1d1d', backgroundColor: '#30151b', height: 32 },
  powerRing: {
    width: 17,
    height: 17,
    borderWidth: 2,
    borderRadius: 9,
    borderColor: '#f87171',
    borderTopColor: 'transparent',
  },
  powerStem: {
    position: 'absolute',
    top: 5,
    width: 2,
    height: 10,
    borderRadius: 1,
    backgroundColor: '#f87171',
  },
});
