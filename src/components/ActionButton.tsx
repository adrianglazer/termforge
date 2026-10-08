import { Pressable, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function ActionButton({
  label,
  onPress,
  danger = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const color = danger ? theme.danger : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        borderWidth: 1,
        borderColor: color,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
        maxWidth: '100%',
      })}
    >
      <Text style={{ color, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
