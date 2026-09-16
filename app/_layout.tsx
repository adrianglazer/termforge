import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppBoundary } from '@/components/AppBoundary';
import { ThemeProvider } from '@/theme/ThemeProvider';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppBoundary>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </AppBoundary>
    </ThemeProvider>
  );
}
