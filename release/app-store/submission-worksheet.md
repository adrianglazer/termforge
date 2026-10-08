# Submission worksheet — en-US — 8 October 2026

The owner reports that Termforge is already in App Store review. This task does
not change that submission. Use this worksheet for checking existing fields or
for a later update, without withdrawing or resubmitting the current version.

## Identity and commercial details

| Field                                          | Value / evidence                                                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| App / version                                  | Termforge / 0.1.0 (13), owner-confirmed as in review                                                  |
| Bundle ID                                      | `com.adrianglazer.termforge`                                                                          |
| Existing Apple ID                              | `6818173928` (task 08 record); not used to invent a public listing URL                                |
| Primary language                               | English (U.S.)                                                                                        |
| Primary category                               | Proposed: Developer Tools; check the selected category in the store                                   |
| Secondary category                             | Proposed: Utilities, if useful; optional                                                              |
| Copyright                                      | 2026 Adrian Krzysztof Glazer                                                                          |
| Legal operator                                 | Adrian Krzysztof Glazer                                                                               |
| VAT / registration                             | ESZ3681468R / Z3681468R                                                                               |
| Postal address                                 | Calle Canarias, 6-6-43, 03130 Santa Pola, Alicante, Spain                                             |
| Public email                                   | adrian.glazer@gmail.com                                                                               |
| App license                                    | Apple's Standard EULA; retain the default rather than entering website terms as a custom EULA         |
| App download                                   | Free; full remote functionality requires an explicitly acquired trial or lifetime unlock              |
| Lifetime price                                 | Owner correction: **€14.99**, with Apple-localized prices elsewhere; no fixed USD equivalent          |
| Refunds                                        | Apple handles requests/eligibility; no separate direct developer refunds, subject to mandatory rights |
| Territories, tax category, agreements, banking | Check existing owner-selected settings; not inferred from a submitted app                             |

## Web destinations

The website source has real contact details, privacy and terms dated 8 October 2026. Intended destinations are listed below. The web tool could not access these
pages on 8 October; this is **not** proof of an outage, nor verification of live
content. Confirm public HTTPS access and that deployment serves the updated files.
No external metadata was edited, and no deployment was performed.

| Field                    | Intended destination                | Check before pasting                                            |
| ------------------------ | ----------------------------------- | --------------------------------------------------------------- |
| Support URL              | https://termforge.glazer.es/support | Loads without login and displays the supplied email             |
| Marketing URL (optional) | https://termforge.glazer.es/        | Loads the current landing page                                  |
| Privacy Policy URL       | https://termforge.glazer.es/privacy | Loads the finalized policy; verify in-app link too              |
| Website terms            | https://termforge.glazer.es/terms   | Links Apple's Standard EULA and refund process                  |
| App Store link           | Owner will provide after review     | No guessed URL; website buttons currently lead to review status |

## App privacy

Reviewed source has no developer account service, backend, analytics, advertising,
tracking or remote diagnostic uploader. Server metadata remains local; SSH/SFTP
sends data to user-selected hosts. Apple purchases are checked on device.
**Proposed answer: Data Not Collected**, conditional on the submitted archive and
all bundled SDKs actually matching these practices. Task 08 inspected 11 privacy
manifests declaring no tracking/collection in build 4; that historical archive is
not evidence for an unidentified later build.

Do not list locally processed SSH usernames/keys as developer-collected data just
because the app stores them. Do disclose any data a developer/SDK actually retains
off device. Voluntary Gmail support and website infrastructure processing are
explained separately in the policy; any applicable Apple disclosure exception must
meet all of Apple's criteria. Publication of the App Privacy answers is an owner
step; the current label has not been inspected here.

## Age rating and content

Answer the current questionnaire from the final app, rather than setting a guessed
rating. Source supports: a developer utility, user-selected remote content, no
curated social feed, advertising, gambling, medical advice, or in-app web browser.
It does not provide user-to-user chat, a public content feed, parental controls or
age-assurance features. SSH terminal access to arbitrary remote output is **not**
the same as a developer-controlled content catalog; review Apple's definitions
when answering messaging/user-generated-content/unrestricted-web-access questions.
Check the binary before choosing frequency answers, and let Apple calculate the
rating. Marketing artwork itself contains no age-restricted material.

## Encryption / export compliance

SSH bundles cryptography. `ITSAppUsesNonExemptEncryption=false` is the existing
source declaration and was recorded in earlier processed archives. Preserve
historical evidence; it does **not** determine the correct legal answer for every
future build. The Account Holder must confirm the actual algorithms/distribution,
answer Apple's encryption questions, and supply any required documentation.
Use `docs/release-checklist.md` and `docs/dependency-security-review.md`; do not
claim compliance complete just because this flag exists.

## Private review access and contact

The public contact is Adrian Krzysztof Glazer / adrian.glazer@gmail.com. The owner
has declined to publish a phone number. If Apple's private reviewer contact field
requires one, that remains an owner-only store field; do not invent or publish it.
There is no Termforge app sign-in. SSH credentials are separate from an app login.

For reviewers who cannot use their own server, provide a disposable, reachable SSH
host, limited account, temporary password or key, exact verified host fingerprint,
and a sample writable directory via **App Store Connect's private review fields or
review attachment**. Restrict the account, remove sensitive files, keep it reachable
during review, then revoke access. Do not commit credentials or create a public
server for this materials task. Attach `en-US/review-notes.txt` only after confirming
it matches the reviewed build and supplying any needed private access details.

## IAP setup and review-only captures

| Product         | Implementation ID                       | Type                       | Copy                       |
| --------------- | --------------------------------------- | -------------------------- | -------------------------- |
| 7-day Trial     | `com.adrianglazer.termforge.trial7days` | Non-consumable, zero price | `en-US/iap-trial-*.txt`    |
| Lifetime Unlock | `com.adrianglazer.termforge.lifetime`   | Non-consumable             | `en-US/iap-lifetime-*.txt` |

IDs are source defaults; registered IDs/types/prices and review attachment status
have not been inspected. Follow task 10 / `docs/monetization.md`. No subscription,
automatic charge, secret reviewer bypass, or trial restart is advertised.

For each IAP's review screenshot, capture the actual compatible candidate showing
its access screen and duration/price/feature-loss disclosures. Also retain evidence
of Apple's acquisition/purchase sheet, verified resulting access, same-account
restore, expiration and revocation. These are **private IAP review evidence**, not
invented public screenshot art. A compatible Xcode StoreKit test build can provide
expiration evidence without waiting seven days; no production clock override or
new EAS build is part of this task. See `capture-checklist.md`.

## Final owner checklist / missing inputs

- [x] Owner confirmed submitted version 0.1.0, build 13.
- [x] Owner confirms build 13 includes the seven-day trial and lifetime purchase options.
- [ ] Record purchase, restore, expiration and revocation validation results.
- [ ] Confirm capture/build match; the provided captures have no embedded build ID.
- [ ] Check registered IAPs and supply actual purchase/review screenshots if needed.
- [ ] Confirm private reviewer host/access and any required private contact fields.
- [ ] Check public support/privacy URLs, current deployment and in-app policy link.
- [ ] Check current privacy/age/encryption answers against the submitted archive.
- [ ] Upload the correct display set; keep previews/posters and creative slots separate.
- [ ] Optional: supply editor/snippet captures to expand the existing five-shot set.
- [ ] Supply the public App Store URL after approval, then update website buttons.

Material preparation can be complete while these store/release checks remain open.
Reuse task 08's release checklist; do not mark physical security, Apple purchases,
or the existing submission as verified by copy or graphic validation.
