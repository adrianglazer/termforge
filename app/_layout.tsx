import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppSecurityGate } from '@/components/AppSecurityGate';
import { AppBoundary } from '@/components/AppBoundary';
import { AccessProvider } from '@/access/AccessProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { lightColors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <AppSecurityGate>
      <ThemeProvider>
        <AccessProvider>
          <AppViewport />
        </AccessProvider>
      </ThemeProvider>
    </AppSecurityGate>
  );
}

/** Paint the system-bar area while keeping every route below it, even when scrolling. */
function AppViewport() {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <AppBoundary>
        <StatusBar style={theme.background === lightColors.background ? 'dark' : 'light'} />
        <Stack screenOptions={{ headerShown: false }} />
      </AppBoundary>
    </SafeAreaView>
  );
}
