# Capture and preview handoff

Existing real iPhone captures support five finished screenshots: terminal,
workspace, files, servers and keys. Do not retake them solely to add more slots.
Suggested upload order: **terminal → workspace → files → servers → keys**. The
second image is landscape; Apple accepts mixed orientations, but previews or
screenshots with a differing ratio may appear in its separate closer-look area.
For an all-portrait sequence, capture a readable two-pane portrait workspace.

## Optional missing shots

The editable SVG compositions under `drafts/` are conspicuously marked CAPTURE
REQUIRED and must never be uploaded. Use the same charcoal/amber styling and
DejaVu font. After adding a genuine screenshot, compose with FFmpeg using the
existing `website/prepare-promo.py` layout: fit the capture proportionally within
1060 × 2294 on a 1320 × 2868 canvas, x=130/y=416; do not stretch it. Medium-display
export: 1179 × 2556. Use opaque PNG/JPEG, strip metadata, inspect at full size and
phone viewing size, then move only the validated composition into Apple media.

| Filename to supply                          | Slot and app state                                                                                   | Safe sample content                                                                                      | Orientation |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------- |
| `editor-capture.png`                        | Files → open a small UTF-8 test file in the remote editor; show readable text and real save controls | `notes.txt`, content `Termforge demo\nStatus: ready\n`; writable disposable `/home/admin/demo` directory | Portrait    |
| `snippets-capture.png`                      | Snippets list or editing screen; show a saved useful command, not fake successful output             | Name `System details`; command `uname -a`; no passwords, tokens, IPs or private paths                    | Portrait    |
| `workspace-portrait-capture.png` (optional) | A real two-pane workspace, one live harmless terminal per pane                                       | `pwd` and `uname -a`; owned demo host, user `admin`                                                      | Portrait    |

Use the exact App Store review/release candidate on an iPhone supported by the
app. Record version/build and device/OS in the handoff. Native captures are
1170 × 2532 in the supplied sources; larger exports are promotional canvases,
**not evidence of a native larger-device layout**. Full-resolution source captures
are preferable to screenshots downloaded from a website. Hide notifications and
use benign demo accounts. Retain unmodified originals outside public website
assets. Linux here has no Xcode/simulator/device capture tooling; no replacement
native capture was fabricated.

## Private IAP review evidence

Supply `trial-review.png` and `lifetime-review.png` from a compatible actual binary,
showing the access screen for each product. Retain the associated Apple sheets,
verified access and Restore Purchases results privately. Capture disclosure of
seven days, no automatic charge, local price and loss of remote functionality at
expiry. Use Xcode StoreKit facilities for an expiration/revocation test recording
if needed; the production binary must not contain a review bypass. Do not insert
mock purchase sheets into public screenshot artwork.

## Finished preview from supplied footage

`promo-assets/promo-app-store/app-preview/preview.mp4` is a 15-second portrait edit
of actual app use, with a silent stereo AAC track. Source is the supplied
`1791468217117748.MP4`; only previously sanitized ranges are retained. Playback is
2/3 speed for readability, not a responsiveness/performance claim.

| Output time | Original footage | Caption                    |
| ----------- | ---------------- | -------------------------- |
| 0–3 s       | 56–58 s          | Remote tools. Live output. |
| 3–9 s       | 64–68 s          | Browse remote files.       |
| 9–15 s      | 138–142 s        | Two panes. One workspace.  |

Persistent footer: `Full access requires trial or lifetime unlock.` No price,
Apple endorsement, generated UI, music or fabricated connection result appears.
Poster frame is 5 seconds; `poster.png` is a local reference for choosing that frame
in App Store Connect, not an additional public screenshot slot.

Regenerate with `python promo-assets/prepare-app-store.py`. Output: 886 × 1920,
H.264 High/Level 4.0 progressive, 30 fps, 10 Mbps target/CBR, AAC stereo/48 kHz
configured at 256 kbps, fast-start MP4. Apple specifies a 15–30 s duration and
500 MB maximum. Both large and medium Dynamic Island preview slots accept this
same resolution. The 10-second website MP4 is deliberately separate and is too
short for an Apple preview slot.

## Optional fuller 20-second recording

This is a later capture recipe, not a reason to delay the finished short preview:
0–4 s connect to the sanitized demo profile and inspect its verified fingerprint;
4–9 s run `uname -a` in a real terminal; 9–14 s switch to a real two-pane workspace;
14–20 s open and save the harmless `notes.txt` through SFTP. Captions: `Connect to
your server`, `Use your remote tools`, `Keep sessions together`, `Manage remote
files`. Include the same access footer. Record vertically with iPhone screen
recording, no microphone audio, personal notifications, secrets or production
files. Let each screen settle so text is readable; avoid loading waits. Export
with the same specifications and validate every retained frame before replacing
the short preview.
