import { ScrollView, View } from 'react-native';
import { AccessPanel } from '@/access/AccessPanel';
import { ScreenShell } from '@/components/ScreenShell';
import { useTheme } from '@/theme/ThemeProvider';

export default function AccessScreen() {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <ScreenShell compact title="Access" message="Apple purchases. No Termforge account." />
      <View style={{ padding: 24 }}>
        <AccessPanel />
      </View>
    </ScrollView>
  );
}
