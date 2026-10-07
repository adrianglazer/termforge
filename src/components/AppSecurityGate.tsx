import { useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { TermforgeNative } from '@/native/termforgeNative';
import { suspendMetadataStorage } from '@/persistence/bootstrap';
import { initializeProtectedData } from '@/security/initialize';
import { createSecurityStartup, type StartupStatus } from '@/security/startup';

/** Locked screens unmount so editor/file/terminal data does not stay in React state. */
export function AppSecurityGate({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<StartupStatus>({ kind: 'waiting' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const startup = createSecurityStartup({
      active: AppState.currentState === 'active',
      changed: setStatus,
      suspend: suspendMetadataStorage,
      initialize: initializeProtectedData,
    });
    const refresh = () => {
      void TermforgeNative.securityState().then(startup.apply).catch(startup.snapshotFailed);
    };
    const subscription = TermforgeNative.addListener('onSecurityState', startup.apply);
    const lifecycle = AppState.addEventListener('change', (state) => {
      startup.activity(state);
      if (state === 'active') refresh();
    });
    refresh();
    return () => {
      startup.dispose();
      subscription.remove();
      lifecycle.remove();
    };
  }, [retry]);
  if (status.kind !== 'ready')
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 24 }}>
        {status.kind === 'failed' ? (
          <>
            <Text style={{ color: '#fff', marginBottom: 16 }}>
              Termforge could not finish opening protected data. Keep the app open and tap Retry.
              Your saved data has not been reset.
            </Text>
            <Text selectable style={{ color: '#aaa', marginBottom: 16 }}>
              Startup check: {status.stage}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRetry((value) => value + 1)}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: '#60a5fa' }}>Retry</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    );
  return children;
}
