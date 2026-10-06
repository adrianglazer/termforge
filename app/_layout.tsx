import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppSecurityGate } from '@/components/AppSecurityGate';
import { AppBoundary } from '@/components/AppBoundary';
import { ThemeProvider } from '@/theme/ThemeProvider';

export default function RootLayout() {
  return (
    <AppSecurityGate>
      <ThemeProvider>
        <AppBoundary>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
        </AppBoundary>
      </ThemeProvider>
    </AppSecurityGate>
  );
}
