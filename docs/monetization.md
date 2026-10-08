# Trial and lifetime access

Task 10 is the commercial source of truth. Code/local website implementation is
complete; Apple compilation, registered product setup and actual purchase
validation remain release blockers. No commercial setting, public submission,
website deployment or EAS build was performed by task 10.

## Current owner correction — 2026-10-08

The owner confirms version **0.1.0 (13)** includes the seven-day trial and lifetime
purchase options. Inclusion is confirmed; unreported purchase-test results remain
separate from this statement.

The lifetime price is **€14.99**, not US $14.99. Other storefronts use Apple’s
localized prices. The owner reports version 0.1.0 (13) is in review; this does not
by itself verify its IAP configuration or purchase acceptance. Earlier task 10
implementation evidence below is historical. The final publishing package is in
[release/app-store](../release/app-store/README.md).

## Offer and product configuration

Free download. **7 days free. Full access. Pay once. No subscription.** The trial
must be explicitly acquired through Apple. No automatic charge at expiration;
buying immediately is allowed. Lifetime means a non-expiring Termforge unlock,
subject to Apple refunds/revocations, without a perpetual service/OS-support or
unrelated future-product promise. No account, backend or payment dependency.

Confirmed bundle: `com.adrianglazer.termforge` (`app.json`, task 08 archive).
Existing App Store Connect app: `6818173928`. Current records do not enumerate
IAPs, and no authenticated product-management connection is available in this
chat. **Identifiers below are implementation defaults, not verified registered
products.** Before setup, inspect existing products and reuse matching registered
IDs; update the two constants and local test configuration together if needed.
Report incompatible Family Sharing rather than silently changing it.

| Product | Identifier                              | Type           | Reference price | en-US display name | en-US description                            |
| ------- | --------------------------------------- | -------------- | --------------- | ------------------ | -------------------------------------------- |
| Trial   | `com.adrianglazer.termforge.trial7days` | Non-consumable | Free / Tier 0   | 7-day Trial        | Full access for 7 days. No automatic charge. |
| Unlock  | `com.adrianglazer.termforge.lifetime`   | Non-consumable | €14.99          | Lifetime Unlock    | Full Termforge access. Pay once.             |

Display names are within 30 characters; descriptions within 45. Other storefronts
use Apple's localized price points, not a hardcoded dollar amount. The app uses
`Product.displayPrice`; the Apple sheet provides the applicable price. Missing
products show unavailable and grant nothing. The free product must actually
have zero price and non-consumable type or the adapter rejects it.

Owner setup (prepared here; not executed):

1. Inspect existing IAP IDs, types, localizations, availability and Family Sharing.
   Keep app download price free. Configure both non-consumables above, with
   the owner’s €14.99 reference price and Apple-localized prices. Confirm the
   actual base region and localized schedule in App Store Connect. Owner selects
   territories/tax category and checks localized prices. No future increase.
2. Keep Family Sharing disabled initially for both. The adapter accepts purchased
   ownership only; sharing is not implemented or promised. Existing incompatible
   sharing configuration is a blocker requiring disposition.
3. Account Holder checks the latest Paid Apps Agreement and banking/tax status.
   Agreement must be Active for sandbox testing; do not infer status from an
   existing free app or a successful build. No account credentials enter source.
4. Confirm In-App Purchase capability on the existing App ID/signing profile.
   StoreKit uses the system framework in the existing inline Expo module; no
   new module pod, billing SDK, shared Keychain group or backend is required.
5. Add the en-US metadata above, owner-approved localizations and review-only
   screenshots of the **actual later binary** showing disclosures and Apple
   purchase sheets. Supply private reviewer contact and disposable SSH fixture
   access separately. No genuine IAP screenshots exist yet.
6. Attach the first non-consumable IAPs to the applicable new app version for
   review. Select the later monetization binary, not task 08 build 4. Public
   submission and commercial settings remain explicitly separate owner actions.

## Implementation and access rules

- `native/TermforgeNative/TermforgeAccessService.swift`: one main-actor access
  authority, product loading, verified expected non-consumable transactions,
  `Transaction.currentEntitlements`, trial history via `Transaction.all`, app-life
  `Transaction.updates`, and finishing handled verified transactions after delivery.
  Startup/foreground never call `AppStore.sync()`; only explicit Restore does.
- `TermforgeAccessModel.swift`: portable state/date/clock logic used by the actual
  native service. Loading/error/not started/expired deny remote work. Verified
  non-revoked lifetime ownership takes precedence over a trial or clock error.
- Trial start is the earliest verified original/purchase timestamp across current
  trial entitlement and history, including revoked trial acquisitions. Apple's
  original-purchase property identifies the original transaction; using history
  also prevents a refunded/reacquired trial from restarting its seven days when
  older verified history is available. Ownership alone never means active trial.
- Duration is exactly 604,800 seconds. `now >= start + duration` expires access;
  time zones and daylight saving only affect the displayed date. A wall time
  earlier than the verified start fails closed. Canceled/pending/unverified
  purchases deliver no trial. Purchase-in-progress leaves existing access intact.
- Every native creation/connect/retry, direct terminal input/queued input/resize,
  authenticated client lookup, forward reservation, host inspection and trust
  lease recheck uses native admission. This covers duplicated/restored sessions,
  snippets, SFTP CRUD/reads/writes/transfers, forwards and bastion routes regardless
  of JS visibility. Streaming loops and editor/upload commit boundaries recheck.
- Foreground, remote-operation boundaries, entitlement updates, a monotonic
  expiry task and a foreground watchdog recheck access. The UI warns within five
  minutes of expiry. At access loss, the registry's existing close path cancels
  pending authentication, transports, input/resize, transfers and forwards.
  Partial remote transfers may require inspection/retry; closing SSH does not
  guarantee that a remote process is killed. OS/main-thread scheduling can delay
  a timer; input and operation admission still rechecks at use.
- Expiry never deletes metadata, keys, local files or editor state. Existing
  terminal editor text remains mounted after the session closes, with explicit
  **Copy draft** (64 KiB clipboard limit) and **Save draft to Files** (2 MiB UTF-8)
  actions in `app/terminal.tsx`. The native export creates a protected temporary
  `.txt` file through existing bounded, expiring file capabilities; it accepts no
  caller path and is invalidated on app lock. User-selected Files copies leave
  the sandbox only through the explicit Apple export sheet.
  Local configuration recovery/export/delete and support/purchase/restore remain
  available, subject to task 07 device authentication and file protections.
  This task introduces no persistent editor-draft feature or new backup promise.
- `src/native/termforgeNative.ts` adds typed state/purchase/restore methods and
  events to the existing module. `src/domain/access.ts` is a UI projection only;
  it cannot authorize remote access. Event revisions reject stale snapshots.
  `src/access/` supplies the root status, paywall and shared settings/onboarding
  panel. `app/access-info.tsx` provides offline-readable terms/privacy/support;
  final legal/contact details and published URLs remain pending.

## Offline, clock state and limits

StoreKit's locally available verified lifetime entitlement works without the
product catalog; a price fetch failure alone never removes it. Genuine
revocations remove lifetime access when StoreKit supplies them. An independently
valid trial can then apply. A verified trial expires offline at its original
boundary. No locally verifiable transaction state grants no remote access:
connect/retry/restore, without inventing a new trial or inferring expired ownership
from a product transport error. Restore/new device under the same App Store
account uses Apple's original history; no cross-account recovery is promised.

`TermforgeAccessClockStorage.swift` retains only the last observed timestamp in
a non-synchronizing `AfterFirstUnlockThisDeviceOnly` Keychain item, separate from
passcode/user-presence-protected SSH credentials. It grants no entitlement. It
may survive removal/reinstall and is not exported. Clock storage failure blocks
trial access recoverably; verified lifetime access remains independent of it.
Monotonic elapsed time and a persisted high-water timestamp deter simple backward
jumps (120-second skew tolerance). Enable automatic date/time and retry; if a
past forward jump left an excessive high-water value, explicit successful online
Restore rechecks Apple transaction state and can re-anchor a corrected clock no earlier
than any known signed trial acquisition. A fresh account with no trial still
needs the explicit free-product purchase; clock recovery grants no access. There is no permanent suspicious-clock flag.

A signed acquisition is not a continuously trusted clock. The explicit recovery
path, OS tampering, erased protected state, unavailable history and different
Apple accounts limit abuse resistance. No-backend enforcement is not perfect;
this task adds no fingerprinting or licensing server. Offline revocation is
applied when Apple transaction state makes it available, not instantly worldwide.

## Local evidence and Apple validation handoff

2026-10-06, Node 24.4.1 (pnpm unavailable; existing npm lock/scripts retained):
73 JavaScript tests / 14 files, lint, types, repository formatting, native
provenance and bounded secret scan are checked in the task 10 execution record.
Eight new JS cases validate UI reconciliation/error/status and native admission
**source wiring**, including local draft recovery, not Apple execution. Nine portable Swift access tests execute
the production model under Swift 6.2.4 (23 tests including existing native suites). Any tooling
limitations are recorded together in task 10. Linux syntax parsing does not
prove StoreKit, Security, UIKit or Expo API compatibility.

Next consolidated candidate must complete these **pending release gates**:

| Gate                         | Focused acceptance                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Apple compile/signing        | Compile the changed inline sources against deployment iOS 17+, verify StoreKit capability/framework, privacy reasons and final archive.                                                                                                                                                                                                                                  |
| Xcode StoreKit configuration | Create a local configuration with the two non-consumables/zero-price trial, sharing off; never enable it for production. Verify success/cancel/pending/failure/missing products, transaction updates, refund/revocation and restore. Actual configuration execution is unavailable on Linux.                                                                             |
| Date/expiry                  | Portable tests inject transaction dates and clocks; no shipped override exists. On Apple test runner inject dates only in a test target using the same pure model. For integrated app smoke use test device time advancing past the original trial boundary and restore automatic time afterward. Subscription trial acceleration does not apply to this non-consumable. |
| Sandbox/TestFlight           | On one compatible later signed binary acquire both products, restore after reinstall/new device under the same sandbox account, confirm original dates, immediate unlock, catalog-failure/offline behavior and no startup sign-in loop. TestFlight ownership is sandbox ownership.                                                                                       |
| Native remote enforcement    | Keep a shell, forward, transfer and unsaved editor text active across expiry; verify native closure and all reconnect/snippet/SFTP/jump routes deny use while local copy/export/recovery/delete still work. Confirm warning, foreground recheck, device-clock correction/restore and revocation updates.                                                                 |
| Physical UI                  | Brief VoiceOver/Dynamic Type, purchase-sheet inactive/background security cover behavior, and expiration date/price localization check in the shared phone session.                                                                                                                                                                                                      |

Retain task 08 build 4 historical compiler/distribution evidence:
`e8ed6faa-1017-407a-a86c-f86ca237eba8`, 0.1.0/build 4. Its last recorded upload
status was queued; the owner now reports waiting for distribution. Neither that
report nor that pre-monetization artifact validates this native change. No
per-feature cloud build/upload is authorized by this implementation; batch it
with other ready changes into the next candidate under `tasks/README.md`.

## Website and task 11

All four `website/` pages and maintenance README use the same planned launch
model, US/localized price caveat, explicit trial start and restore/offline/expiry
rules. The static site has no checkout, trial activation, tracking or backend;
its independent nginx/Docker/Compose workflow and design are retained. App Store
links stay placeholders until a real public listing URL and release evidence
exist. Legal/operator/contact/media inputs remain visible drafts. Deployment and
`website/deploy.sh` were not invoked. Browser, link and container evidence is in
task 10, with historical task 09 evidence preserved.

Task 11 must use the product names/descriptions above and actual later-binary
screenshots, including the pre-acquisition disclosure, Apple sheet, active-trial
expiry and restore screens. Review notes should explain: start explicitly; all
features last 168 hours from the original verified acquisition; no auto-charge;
lifetime is one non-consumable; restore uses the same account; expiry closes
remote work while preserving local data. Do not use build 4 to illustrate the
new purchase flow or claim production purchase success. Final legal provisions,
real support/private-security contacts, privacy URLs, territories/agreements,
registered IDs and current distribution/device acceptance are owner inputs.

## Official Apple requirements checked 2026-10-06

- [App Review Guidelines §3.1.1](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase): free non-consumable duration-named trial and advance duration/access-loss/charge disclosures.
- [Transaction](https://developer.apple.com/documentation/storekit/transaction), [originalPurchaseDate](https://developer.apple.com/documentation/storekit/transaction/originalpurchasedate) and [currentEntitlements](https://developer.apple.com/documentation/storekit/transaction/currententitlements): verified transaction authority, original date, history/updates and revoked-product exclusion.
- [Explicit synchronization](<https://developer.apple.com/documentation/storekit/appstore/sync()>): restore action; do not use it on ordinary startup.
- [IAP setup](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases/) and [sandbox availability](https://developer.apple.com/documentation/technotes/tn3186-troubleshooting-in-app-purchases-availability-in-the-sandbox): active agreement, accurate banking/tax/product setup and capability checks.
- [IAP metadata](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information): 30-character display names, 45-character descriptions and review screenshots.
- [First IAP submission](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/): first IAPs of a type accompany the applicable new app version. No submission was made.
