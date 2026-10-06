import { ScrollView, View } from 'react-native';
import { AccessPanel } from '@/access/AccessPanel';
import { ScreenShell } from '@/components/ScreenShell';
import { useTheme } from '@/theme/ThemeProvider';

export default function AccessScreen() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScreenShell compact title="Access" message="Apple purchases. No Termforge account." />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <AccessPanel />
      </ScrollView>
    </View>
  );
}
