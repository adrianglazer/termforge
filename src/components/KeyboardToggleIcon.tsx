import { StyleSheet, View } from 'react-native';

/** A fixed-size keyboard/chevron glyph; its parent supplies the accessible label. */
export function KeyboardToggleIcon({ visible }: { visible: boolean }) {
  return (
    <View
      style={styles.icon}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.keyboard}>
        {[0, 1].map((row) => (
          <View key={row} style={styles.row}>
            {[0, 1, 2, 3, 4].map((key) => (
              <View key={key} style={styles.key} />
            ))}
          </View>
        ))}
        <View style={styles.space} />
      </View>
      <View style={[styles.chevron, { transform: [{ rotate: visible ? '225deg' : '45deg' }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 24, height: 30, alignItems: 'center', justifyContent: 'space-between' },
  keyboard: {
    width: 24,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#f9fafb',
    borderRadius: 3,
    padding: 3,
    gap: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  key: { width: 2, height: 2, backgroundColor: '#f9fafb' },
  space: { width: 10, height: 2, alignSelf: 'center', backgroundColor: '#f9fafb' },
  chevron: {
    width: 6,
    height: 6,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: '#f9fafb',
    marginBottom: 2,
  },
});
