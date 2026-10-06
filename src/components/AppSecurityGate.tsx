import { useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Text, View } from 'react-native';
import { TermforgeNative, type SecurityState } from '@/native/termforgeNative';
import {
  openMetadataDatabase,
  resumeMetadataStorage,
  suspendMetadataStorage,
} from '@/persistence/bootstrap';
import { KeyRepository } from '@/keys/repository';
import { SettingsRepository } from '@/settings/repository';

/** Locked screens unmount so editor/file/terminal data does not stay in React state. */
export function AppSecurityGate({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let revision = -1;
    let request = 0;
    const apply = (state: SecurityState) => {
      if (disposed || state.revision <= revision) return;
      revision = state.revision;
      const current = ++request;
      setReady(false);
      if (state.locked) {
        void suspendMetadataStorage();
        return;
      }
      void (async () => {
        try {
          await resumeMetadataStorage();
          const database = await openMetadataDatabase();
          const keys = new KeyRepository(database);
          for (const pending of await keys.pendingRemovals()) {
            await TermforgeNative.deleteKey(pending.credentialRef);
            await keys.remove(pending.id);
          }
          // Reconcile metadata without deleting orphaned secrets or silently
          // reassociating items from another installation.
          await TermforgeNative.credentialStates(
            (await keys.list()).map((key) => key.credentialRef),
          );
          const settings = await new SettingsRepository(database).get();
          await TermforgeNative.setAutoLockMinutes(settings.autoLockMinutes);
          if (!disposed && current === request) {
            setFailed(false);
            setReady(true);
          }
        } catch {
          if (!disposed && current === request) setFailed(true);
        }
      })();
    };
    const subscription = TermforgeNative.addListener('onSecurityState', apply);
    const lifecycle = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void TermforgeNative.securityState()
          .then(apply)
          .catch(() => {
            if (!disposed) setFailed(true);
          });
      }
      if (state === 'background') {
        ++request;
        setReady(false);
        void suspendMetadataStorage();
      }
    });
    void TermforgeNative.securityState()
      .then(apply)
      .catch(() => setFailed(true));
    return () => {
      disposed = true;
      ++request;
      subscription.remove();
      lifecycle.remove();
    };
  }, []);
  if (!ready)
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {failed ? (
          <Text style={{ color: '#fff', padding: 24 }}>
            Protected storage could not be opened. Unlock the device and reopen Termforge.
          </Text>
        ) : null}
      </View>
    );
  return children;
}
