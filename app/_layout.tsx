import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
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
        <AppViewport />
      </ThemeProvider>
    </AppSecurityGate>
  );
}

/** Keep the access banner and every route inside the device's safe area. */
function AppViewport() {
  const theme = useTheme();
  const pathname = usePathname();
  return (
    <SafeAreaView
      edges={
        pathname === '/terminal' || pathname === '/servers' || pathname === '/'
          ? ['top', 'left', 'right']
          : ['top', 'left', 'right', 'bottom']
      }
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <AccessProvider>
        <AppBoundary>
          <StatusBar style={theme.background === lightColors.background ? 'dark' : 'light'} />
          <Stack
            screenOptions={{
              header: ({ navigation, route }) => {
                const canGoBack = navigation.canGoBack();
                if (!canGoBack && (route.name === 'servers' || route.name === 'index')) return null;
                return (
                  <View
                    style={{
                      backgroundColor: theme.background,
                      paddingTop: 8,
                      paddingHorizontal: 24,
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={canGoBack ? 'Go back' : 'Back to servers'}
                      onPress={() =>
                        canGoBack ? navigation.goBack() : navigation.replace('servers')
                      }
                      style={{
                        alignSelf: 'flex-start',
                        minWidth: 44,
                        minHeight: 44,
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: theme.accent }}>‹ Back</Text>
                    </Pressable>
                  </View>
                );
              },
            }}
          />
        </AppBoundary>
      </AccessProvider>
    </SafeAreaView>
  );
}
