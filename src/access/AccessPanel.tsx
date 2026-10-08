import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { useAccess } from '@/access/AccessProvider';
import { accessStatus, purchaseMessage } from '@/domain/access';
import { useTheme } from '@/theme/ThemeProvider';

export function AccessPanel() {
  const { access, act } = useAccess();
  const theme = useTheme();
  const message = purchaseMessage(access.outcome);
  const button = (
    title: string,
    action: 'trial' | 'lifetime' | 'restore' | 'retry',
    disabled = false,
  ) => (
    <ActionButton
      label={title}
      disabled={access.busy || disabled}
      onPress={() => void act(action)}
    />
  );
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
        {accessStatus(access)}
      </Text>
      {access.expiresAt ? (
        <Text style={{ color: theme.muted }}>
          Trial expiration: {new Date(access.expiresAt).toLocaleString()} (device time zone).
        </Text>
      ) : null}
      {access.state !== 'lifetime' ? (
        <>
          <Text style={{ color: theme.text }}>
            7 days free. Full access. Pay once. No subscription.
          </Text>
          <Text style={{ color: theme.muted }}>
            Free download. Your seven days begin only when Apple verifies the free trial
            acquisition, not when you install or restore. There is no automatic charge. You can buy
            lifetime access immediately.
          </Text>
          <Text style={{ color: theme.muted }}>
            When the trial ends, SSH, SFTP, snippets that run commands, forwards and jump-host
            routes stop, including active work. Transfers may be partial; closing SSH does not
            guarantee remote processes stop. Saved hosts, keys, settings and local drafts are kept.
            Local recovery, copy/export and deletion remain available after device authentication.
          </Text>
          <Text style={{ color: theme.text }}>
            Lifetime unlock:{' '}
            {access.displayPrice
              ? `${access.displayPrice} — one-time purchase`
              : 'localized price unavailable. Connect and retry before buying.'}
          </Text>
          {!access.expiresAt
            ? button(
                'Start 7-day Trial',
                'trial',
                !access.trialAvailable || !access.displayPrice || access.state === 'loading',
              )
            : null}
          {button(
            access.displayPrice
              ? `Buy Lifetime — ${access.displayPrice}`
              : 'Buy Lifetime — unavailable',
            'lifetime',
            !access.displayPrice,
          )}
          {access.storeError !== 'none' ? (
            <Text style={{ color: theme.muted }}>
              The App Store product catalog is unavailable or incomplete. Retry while online.
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={{ color: theme.muted }}>
          Your verified non-expiring unlock works with locally available Apple purchase state,
          including offline. Apple refunds or revocations remove access. Ongoing OS compatibility
          and unrelated future products are not promised.
        </Text>
      )}
      {button('Restore Purchases', 'restore')}
      {button('Retry App Store', 'retry')}
      {access.busy ? (
        <Text accessibilityLiveRegion="polite" style={{ color: theme.muted }}>
          Waiting for Apple…
        </Text>
      ) : null}
      {message ? (
        <Text accessibilityLiveRegion="polite" style={{ color: theme.text }}>
          {message}
        </Text>
      ) : null}
      <Text style={{ color: theme.muted }}>
        Restore with the same App Store account. Reinstallation or a new device does not restart the
        trial. Offline trials still expire. If no verified purchase state is available, connect and
        restore.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
        <Link href="/access-info?section=terms" style={{ color: theme.accent }}>
          Terms
        </Link>
        <Link href="/access-info?section=privacy" style={{ color: theme.accent }}>
          Privacy
        </Link>
        <Link href="/access-info?section=support" style={{ color: theme.accent }}>
          Support
        </Link>
        <Link href="/servers" style={{ color: theme.accent }}>
          View local data
        </Link>
      </View>
    </View>
  );
}
