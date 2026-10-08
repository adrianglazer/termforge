# App Store publishing materials

These materials describe the reviewed implementation. Publish only after the
signed candidate/device gates in [release-checklist.md](release-checklist.md)
pass. No store record, URL, screenshot or reviewer credential is invented here.
Task 11’s completed package and remaining owner inputs are linked below.

## Current materials package — 2026-10-08

The owner confirms version **0.1.0 (13)** includes the seven-day trial and lifetime
purchase options. Inclusion is confirmed; unreported purchase-test results remain
separate from this statement.

The owner reports version **0.1.0 (13)** is in App Store review. Task 11's local
materials are complete: see [package index](../release/app-store/README.md),
[paste-ready en-US fields](../release/app-store/en-US/), and
[submission worksheet](../release/app-store/submission-worksheet.md).
Screenshots remain under `promo-assets/promo-app-store`, with separate large and
medium sets. The owner will supply the public App Store URL once ready.

Owner's corrected commercial offer: **€14.99 lifetime unlock**, with Apple-localized
prices elsewhere; free download, explicitly acquired seven-day trial, no subscription
or automatic charge. Store copy uses localized purchase-sheet pricing instead of
a fixed dollar amount. Do not infer build 13's IAP/device acceptance from the older
build 4 archive. Task 11 records missing purchase captures and private review access
without inventing them. Historical release gates below still need actual evidence.

### Claims to exclude

Do not promise a local Linux shell, background-persistent connections, cloud sync,
MFA/keyboard-interactive authentication, RSA/ECDSA private-key imports, multiple or
key-authenticated bastion hops, SOCKS/agent/X11 forwarding, private-key export,
passphrase-encrypted generated keys, Secure Enclave private keys or universal
terminal/accessibility compatibility. See [security limitations](security.md).
Do not describe performance, security certification or current release acceptance
as verified until the candidate record supports those claims.

## Owner-supplied store details

Supply the existing App Store Connect numeric Apple ID and team, developer/legal
name, copyright, primary language, distribution regions, price and support contact.
Task 10 now implements the planned trial/lifetime model in source; registered
products and Apple purchase validation remain pending. Build 4 predates it and
cannot support the new offer. Follow [monetization](monetization.md) for the free
app, two non-consumables, €14.99 reference price (owner correction), localized prices, restore/review
metadata and owner-only commercial setup. Do not publish purchase claims until
the later compatible candidate and store configuration are validated.

Publish a stable HTTPS privacy policy and support page before public submission.
The support URL must offer a real contact method. A marketing URL is optional;
use an actual owner-controlled page. Real screenshots and graphics are complete in task 11; any private reviewer
server/access still needs owner input. Never put private credentials into this file.

## Privacy and compliance requirements

The policy must describe local SQLite metadata, Keychain credentials, user-selected
remote servers and transfers, temporary Files copies, user-controlled exports,
backup behavior and deletion/recovery limits. Explain that server operators and
chosen file providers have their own practices. Include the owner's contact,
effective date and update process. Do not claim that no data ever leaves the phone:
SSH/SFTP intentionally connects to the user's servers.

No backend, telemetry or tracking is configured in the reviewed source. Determine
App Store privacy answers from the final archive and all included SDKs; do not
pre-submit a “Data Not Collected” label solely from this document. Verify required
reason API/privacy manifests and SDK notices in the archive, and ensure the
published policy is available inside the app as required by Apple's review rules.
Task 10 includes offline-readable purchase terms/privacy/support links. Final
operator-approved full policy and real published HTTPS links remain a public-release gate
requiring the owner-supplied URL and a focused follow-up change.

Answer Apple's age-rating questionnaire for the actual app: a developer utility
with user-directed remote content and no curated social feed or in-app browser.
Let the current questionnaire determine the rating; do not invent a fixed rating.
SSH contains bundled cryptography. The existing encryption flag is `false`; the
existing processed TestFlight build 1 reports the same declaration. Preserve it
for this candidate; the owner must review its continued accuracy and documentation
before public release. This draft is not a new exemption determination.

## Screenshots

Capture the final signed candidate on a supported iPhone using disposable hosts,
usernames, files, public keys and harmless commands. Remove private hostnames,
IP addresses, terminal secrets, credentials and identifying file paths.

- Main server/workspace navigation with a representative saved layout.
- A live split-pane terminal showing readable text and accessory controls.
- SFTP browser/editor with a harmless sample file.
- Host fingerprint review or key management showing public material only.
- A representative settings/theme screen if it helps explain the product.

Use the sizes requested by App Store Connect's current iPhone screenshot slots;
check [Apple's specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).
There is no iPad screenshot requirement for the current iPhone-only configuration.
No mockups or earlier binaries establish the current candidate's behavior.

## Reviewer notes draft

Termforge is an SSH client for user-managed remote hosts. It has no Termforge
account or backend. Core network functions require a reachable SSH server.
The owner must provide a disposable reviewer server, limited account, verified
fingerprint and short connection steps through App Store Connect's private review
fields. Keep that host available during review and remove access afterward.
Use a public sample key or privately supplied disposable password; never include
personal servers or credentials in the repository.

For review: add the supplied host, verify its fingerprint, authenticate, open a
terminal and run the supplied harmless command; open SFTP and the sample text
file, then disconnect. Device authentication may be requested to unlock locally
protected keys/app data. Include exact steps based on the final binary and explain
that background/idle lock intentionally closes connections. Attach notes for
export compliance and any required reviewer setup. Public App Review submission
and release remain explicit owner actions.

Official references:
[metadata](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/),
[privacy details](https://developer.apple.com/app-store/app-privacy-details/),
[review guidelines](https://developer.apple.com/app-store/review/guidelines/),
[age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/),
[export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/).
