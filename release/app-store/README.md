# Termforge App Store package — en-US

**Materials preparation complete — 8 October 2026.** Owner reports version
**0.1.0 (13)** is in App Store review. This package prepares local copy and media;
it does not modify the existing submission, upload anything, or deploy the site.
Historical build 4 records are retained as history, not proof about build 13.

The owner's latest price decision is **€14.99** for the lifetime unlock, with
Apple-localized prices elsewhere. This overrides the older US $14.99 task text.
Store fields avoid a fixed price and point to Apple's localized purchase sheet.
Positioning: free download, explicitly acquired seven-day full-access trial,
one-time lifetime unlock, no subscription, no automatic charge.

## Paste-ready fields

Each `en-US/*.txt` contains only the field value, with no Markdown wrapper, count
notes, or placeholder contact details. Counts include all spaces, punctuation and
internal newlines; there is no trailing newline. All initial copy is English.

| File                           | Characters | UTF-8 bytes | Maximum         |
| ------------------------------ | ---------: | ----------: | --------------- |
| `name.txt`                     |          9 |           9 | 30 characters   |
| `subtitle.txt`                 |         30 |          30 | 30 characters   |
| `promotional-text.txt`         |        158 |         158 | 170 characters  |
| `description.txt`              |       2314 |        2314 | 4000 characters |
| `keywords.txt`                 |         76 |          76 | 100 bytes       |
| `review-notes.txt`             |       2473 |        2473 | 4000 characters |
| `iap-trial-name.txt`           |         11 |          11 | 30 characters   |
| `iap-trial-description.txt`    |         44 |          44 | 45 characters   |
| `iap-lifetime-name.txt`        |         15 |          15 | 30 characters   |
| `iap-lifetime-description.txt` |         32 |          32 | 45 characters   |

`field-counts.json` records machine-checked counts. No What's New file is supplied
for the initial 0.1.0 listing; no update history was invented. Add that field only
for a real subsequent update, describing its actual changes.

Copy reflects reviewed SSH/SFTP, split-pane workspace, snippet, key and forwarding
implementation. It does not promise background-persistent sessions, a local Linux
shell, unsupported key types/platforms, cloud sync, certification, or flawless
security. The owner confirms build 13 includes the seven-day trial and lifetime
purchase options. Registered IAP IDs and purchase/restore/expiration test results
remain separate checks.
Do not replace existing review metadata merely to make it match newer source.

## Media locations and upload order

The authoritative Apple media stays where the owner requested:
**`promo-assets/promo-app-store/`**. `ready/` contains relative directory symlinks
to the validated media there, avoiding duplicate binary copies. Follow those
links to select actual files; when copying or archiving the package, dereference
symlinks or include the `promo-assets` directory. No raw source or draft is linked
into `ready/`.

| Ready folder                        | Contents / purpose                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `large-display/`                    | Five JPEGs: 1320 × 2868 portrait, 2868 × 1320 workspace                                       |
| `medium-display/`                   | Same five JPEGs: 1179 × 2556 portrait, 2556 × 1179 workspace                                  |
| `app-preview/preview.mp4`           | Optional 15 s, 886 × 1920 portrait Apple preview; 18,523,877 bytes                            |
| `app-preview/poster.png`            | Reference for choosing the video's 5 s poster frame, not a screenshot slot                    |
| `header/header.png`                 | 3840 × 1646 opaque PNG for Apple's separate Header creative slot                              |
| `search-results/search-results.png` | 1920 × 1280 opaque PNG for the separate Search Results creative slot                          |
| `icon/icon.png`                     | Existing 1024 × 1024 opaque icon reference; the submitted app bundle manages the listing icon |

Recommended screenshot order: **terminal, workspace, files, servers, keys**.
Use the large set for the large display slot and the medium set for the medium
slot. Do not upload both sizes into the same slot, or put Header/Search Results
art in screenshot slots. There is no iPad set because the app is iPhone-only.

Five finished shots are stronger than a sixth fabricated UI screen. Optional
editor and snippet compositions live in `drafts/`, clearly marked CAPTURE REQUIRED;
[capture-checklist.md](capture-checklist.md) gives exact screens, sample data,
orientation, filenames, composition instructions and private IAP capture needs.
The large screenshots are promotional canvases composed from genuine 1170 × 2532
captures, not claims of capture on a larger native display. Actual app UI was not
AI-generated. The owner authorized exact FFmpeg redaction/resizing/text overlays.
The key screen's transient error notice was removed at the owner's request.

## Website and reusable graphics

The existing optimized demo and screenshot/feature images remain in
`website/assets/media/`; the 10 s website video is not an Apple preview.
New social artwork: `promo-assets/web-social/social-preview.jpg`, 1200 × 630,
kept outside Apple's upload media. It reuses the existing icon, decorative
background, and redacted genuine UI. Canonical/OG URL integration and publication
remain website launch work once the owner confirms the destination.

## Sources, reproduction and rights

- Raw owner captures/recording: `promo-assets/promo/` (never public website files).
- Screenshot and website compositions: `website/prepare-promo.py`.
- Header/Search Results source: `promo-assets/creative-source/`, prompt and provenance in its README; compose with `promo-assets/prepare-creative.py`.
- New preview, poster, social graphic and editable slots: `promo-assets/prepare-app-store.py`.
- Existing brand source: `assets/icon.png`, 1024px RGB PNG, reused without redesign.
- Typeface: system DejaVu Sans/Bold, distributed under its permissive font license; no paid fonts or music were added. Preview audio is generated silence.
- ImageGen was used only for the previously prepared decorative background, not app UI, device UI, or purchase dialogs.

`asset-manifest.csv` lists all 30 prepared Apple/website/social/draft assets, with
purpose, locale, dimensions, format, file size, duration, SHA-256, provenance,
readiness and replacement instructions. Source originals and editable recipes are
retained separately. “Ready-media” means validated format/content preparation;
it does not establish Apple approval or the unidentified capture/build match.

## Validation performed

- All 10 text fields fit checked limits; keyword bytes, uniqueness and prohibited
  branding repetition checked. No unsupported platform/security or fixed-dollar
  price claims were added. IAP wording matches current task 10 product names.
- All 28 raster/video exports decode cleanly; dimensions, opaque pixel formats,
  file sizes and the 15 s video's codec/profile/level/progressive/30 fps and AAC
  stereo/48 kHz stream were verified. Two draft SVGs parse and have explicit labels.
- Large screenshots inspected individually and in a small phone-like montage;
  medium set inspected in a matching montage. Full-resolution crops supplement
  tool-scaled overview inspection. Captions, bounds, alignment, redacted paths and
  prompts are readable; terminal body text naturally becomes small in overview.
- Header, Search Results, social artwork and preview poster inspected. Video
  decoded throughout, with 30 evenly spaced visual samples plus native-resolution
  redaction-area checks; this is not a claim of manual inspection of all 450 frames.
- Real support/privacy/marketing URLs were attempted with the web tool but were
  inaccessible to that tool; public deployment and live link validation remain
  owner checks. Local policies have real contact details and no legal placeholders.
- Material-specific validation and `git diff --check` pass. App tests, native builds,
  StoreKit execution and physical security checks were not rerun for this content
  task; these assets and docs do not change app functionality.

Recheck after edits: `python release/app-store/validate.py`. It refreshes counts
and the manifest, validates all media, and checks that `ready/` links resolve only
to final Apple assets. Source/capture replacement needs fresh visual QA too.

## Owner handoff and remaining inputs

See [submission-worksheet.md](submission-worksheet.md) for categories, company,
URLs, privacy, age rating, encryption, private reviewer access and IAP checklist.
Still needed: purchase/restore/expiration validation records; genuine IAP review captures;
any required private reviewer access/contact; live website/policy verification;
final archive-based compliance checks; and the App Store listing link after review.
Editor/snippet captures are optional improvements, not missing required media.
Do not interrupt the current review or infer that in-review status proves those
release checks passed.

## Official references checked 8 October 2026

- [Version field limits](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/)
- [App name/subtitle and policy fields](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/)
- [IAP field limits](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information/)
- [Review Guidelines 2.3 and 3.1.1](https://developer.apple.com/app-store/review/guidelines/)
- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [Preview specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications/)
- [Creative asset specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications/)
- [App privacy definitions](https://developer.apple.com/app-store/app-privacy-details/)
- [Age rating questionnaire](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/)
- [Export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/)
- [Standard EULA](https://www.apple.com/legal/internet-services/itunes/dev/stdeula/)
- [Apple refund handling](https://support.apple.com/en-us/118223)
