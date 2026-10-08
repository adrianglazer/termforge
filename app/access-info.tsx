import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { ScreenShell } from '@/components/ScreenShell';
import { useTheme } from '@/theme/ThemeProvider';

const information = {
  terms: {
    title: 'Purchase terms',
    text: 'The free download offers an explicitly started 7-day full-function trial through Apple, then a one-time lifetime unlock at the localized price shown by the App Store. Buying immediately is allowed. No subscription or automatic charge. The original verified trial acquisition starts exactly 168 hours of access; restore or reinstall does not restart it. Expiration stops active and new remote work, including transfers and forwards; remote processes may continue. Local hosts, keys, settings and drafts remain available under the existing device authentication policy. Lifetime means a non-expiring Termforge unlock, subject to Apple refunds and revocations; it does not promise perpetual OS support or unrelated future products. Apple handles billing and applicable refunds under its terms and mandatory consumer rights. No refund guarantee is made here. Final operator details, legal terms and published policy URLs remain owner-review release prerequisites.',
  },
  privacy: {
    title: 'Purchase privacy',
    text: 'Apple processes purchases and payment information. Termforge uses verified StoreKit transaction product identifiers, acquisition dates and revocation/ownership state on device to determine access. StoreKit manages locally available transaction history; the app does not send it to a Termforge server or store an isPro flag. A device-only, non-synchronizing Keychain item holds the last observed time to detect simple clock rollback. This item may survive app removal and never grants access. SSH credentials retain separate passcode/device-authentication protection. Local metadata, drafts and files keep their existing protection and deletion rules; trial expiry deletes none of them. No account, analytics or licensing backend is introduced. User-selected SSH hosts, Apple and Files providers receive data needed for their operations. App removal does not remove Apple purchase history, remote files, exported files or necessarily Keychain items. Final operator/privacy contact and published full policy remain release prerequisites.',
  },
  support: {
    title: 'Purchase support',
    text: 'Use Access, Welcome or Settings to start the trial, buy lifetime access or Restore Purchases. Settings shows the precise trial expiration in your device time zone. The App Store sheet gives the applicable localized purchase price. A canceled or pending purchase does not start a trial; pending approval is delivered through Apple updates. If products or verification are unavailable, connect to the internet and retry or restore with the original App Store account. Existing lifetime access is independent of price loading. Offline verified access works, but the trial still expires. For a clock warning, enable automatic date and time in iOS Settings, correct the clock and retry. If the warning persists, Restore Purchases while online to recheck Apple purchase state and recover clock state; there is no permanent lockout flag. Refunds/revocations can remove lifetime access; a separately valid trial may remain. At expiry remote work stops and partial transfers may need inspection; local draft recovery remains accessible. Purchases cannot be restored across different Apple accounts. Support and private-security contact destinations are pending owner input. A report should contain only app/build, iPhone/iOS, redacted error code and reproduction steps. Never send Apple credentials, payment details, private keys, passwords or unredacted terminal/file content.',
  },
};
export default function AccessInfoScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const info = information[section === 'privacy' || section === 'support' ? section : 'terms'];
  const theme = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <ScreenShell
        compact
        title={info.title}
        message="Purchase information · final legal and contact review pending."
      />
      <View style={{ padding: 24 }}>
        <Text style={{ color: theme.text, lineHeight: 25 }}>{info.text}</Text>
      </View>
    </ScrollView>
  );
}
