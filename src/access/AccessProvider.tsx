import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { TermforgeNative } from '@/native/termforgeNative';
import { accessStatus, initialAccess, reconcileAccess, type AccessSnapshot } from '@/domain/access';
import { useTheme } from '@/theme/ThemeProvider';

const AccessContext = createContext({
  access: initialAccess,
  act: async (_action: 'trial' | 'lifetime' | 'restore' | 'retry') => {},
});
export const useAccess = () => useContext(AccessContext);

export function AccessProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState(initialAccess);
  const theme = useTheme();
  const accept = (next: AccessSnapshot) => setAccess((old) => reconcileAccess(old, next));
  const failed = () => setAccess((old) => ({ ...old, busy: false, outcome: 'bridgeUnavailable' }));
  useEffect(() => {
    const subscription = TermforgeNative.addListener('onAccessState', accept);
    void TermforgeNative.accessState().then(accept).catch(failed);
    return () => subscription.remove();
  }, []);
  async function act(action: 'trial' | 'lifetime' | 'restore' | 'retry') {
    try {
      const next = await (action === 'restore'
        ? TermforgeNative.restorePurchases()
        : action === 'retry'
          ? TermforgeNative.refreshAccess()
          : TermforgeNative.purchaseAccess(action));
      accept(next);
    } catch {
      failed();
    }
  }
  return (
    <AccessContext.Provider value={{ access, act }}>
      <View style={{ flex: 1 }}>
        {access.state !== 'lifetime' ? (
          <View style={{ padding: 12, gap: 4, backgroundColor: theme.surface }}>
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: access.warning ? theme.danger : theme.muted }}
            >
              {accessStatus(access)}
            </Text>
            <Link href="/access" style={{ color: theme.accent }}>
              Access &amp; purchases
            </Link>
          </View>
        ) : null}
        {children}
      </View>
    </AccessContext.Provider>
  );
}
