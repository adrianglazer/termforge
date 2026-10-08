# Termforge website

Self-contained static landing/support site. No framework, JavaScript, package
installation, compilation, app source, credentials, or external service is needed.
Copy this directory alone to preview or serve it. Hosting and public deployment
are outside task 09. The owner reports the app is in App Store review as of 8 October 2026.
Public availability and the listing URL remain pending. Company/contact details, euro pricing, and
owner-supplied promotional media are filled in. Privacy and terms were updated on
8 October 2026 using the owner’s instructions and Apple’s standard app license.

## Preview

Use the independent localhost Docker preview below. The nginx configuration
serves the landing page at `/` and supporting pages at `/support`, `/privacy`,
and `/terms`, while permanently redirecting old `.html` URLs and supporting-page
trailing slashes. Query strings are preserved. Redirects are relative so they
preserve public HTTPS behind Cloudflare instead of exposing an internal HTTP port.

Files remain plain static HTML with relative links/assets. The supplied nginx
configuration serves the site at the domain root. A basic Python static server
does not implement these clean-URL routes; other hosting must provide equivalent
routing/redirects to preview or publish the complete site.

Historical task 09 clean-URL validation passed against its nginx container: all
four pages, 14 legacy/trailing-slash redirects with and without query strings, 107 relative
page/asset links and fragment targets, and missing/private-file 404 responses.

## Docker with Traefik

`compose.yaml` routes `termforge.glazer.es` through an existing Traefik instance,
using its Docker provider and shared external `proxy` network, as in the supplied
other-project frontend example. Cloudflare handles public HTTPS; the existing
Cloudflare tunnel reaches Traefik's HTTP `web` entrypoint, which forwards to nginx
on container port 8080. There are no Traefik TLS labels, certificate resolvers,
or directly published website ports. The container is named `termforge-website`
and uses image `termforge-website:latest`.

From this directory on the intended deployment host:

```sh
docker compose up --build -d
```

The intended URL is <https://termforge.glazer.es/>. This configuration change does
not establish that the site is deployed or that its public TLS/DNS is working.
The external `proxy` network must already exist and include Traefik. Configure
the existing Cloudflare tunnel's public hostname `termforge.glazer.es` to reach
that Traefik `web` origin, preserving the hostname for the Host routing rule.
Compose does not create or reconfigure Traefik, the tunnel, DNS, or certificates.
No environment overrides are needed for the supplied setup.

To stop and remove this site's container
(the external network and Traefik remain managed separately):

```sh
docker compose down
```

For an independent localhost preview without Traefik, use this directory as the
entire build context:

```sh
docker build -t termforge-website:local .
docker run --rm --name termforge-website-preview \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --cap-drop ALL --security-opt no-new-privileges:true \
  -p 127.0.0.1:8091:8080 termforge-website:local
```

This preview binds only to the local machine and has no Traefik routing labels.
Open <http://127.0.0.1:8091/> and stop with Ctrl+C. The Traefik Compose command
above is for deployment; running it on a publicly reachable configured proxy
can expose the website, whose public availability still requires confirmation.
The nginx server runs as `nginx` on port 8080, with a healthcheck, read-only site
files, and temporary runtime data under `/tmp`. No volumes or app directories are
mounted. The base image is pinned to the digest observed during validation;
review/update the pin and rebuild periodically. Initial builds need registry
access. Only the four HTML pages, CSS, assets, and server config enter the build;
`.dockerignore` uses an allowlist and Dockerfile copies explicit paths. README,
Compose, app data, repository metadata, and credentials are not served.

Default access logging is off; nginx error logs go to stderr and can include
request details. The Traefik/hosting provider can keep separate logs; review the
privacy policy against the actual deployment. Public HTTPS is handled by
Cloudflare, with HTTP routing from the tunnel through Traefik to nginx. Tunnel/DNS
provisioning and public deployment were not performed by this configuration edit.
The server's content
policy allows local styles/images/media and no scripts, forms, or embeds.

## Files and editing

- `index.html`: product story, workflow, features, demo/gallery, FAQ, availability.
- `support.html`: getting started, troubleshooting, redacted reports, contact slots.
- `privacy.html`, `terms.html`: privacy policy and terms linking Apple’s Standard EULA.
- `styles.css`: shared palette, layout, phone breakpoints, focus and reduced motion.
- `assets/brand.png`, `assets/favicon.png`: resized copies of the existing app icon.
- `Dockerfile`, `.dockerignore`, `nginx.conf`: independent static container.
- `compose.yaml`: existing-Traefik deployment routing; use the raw Docker preview
  above when a proxy network is unavailable.

Edit plain HTML/CSS directly. Shared headers/footers and metadata are deliberately
present in each page so navigation works without templates or JavaScript. Keep
them consistent. No source generator or parent-directory build is required.

## Replacement points

- Search **`APP_STORE_URL`** in all four pages. Six destinations currently lead
  to `./#availability` or `#availability` (four headers, hero, closing).
  Replace every destination with the same owner-verified HTTPS App Store URL.
  Update action labels, availability/FAQ copy, and draft footer only after public
  status is confirmed. Do not derive a listing URL from an internal numeric ID.
  If desired, obtain an official Apple badge and follow its usage guidelines;
  the current text actions are intentionally not unofficial badges.
- Search **`SUPPORT_EMAIL`**, **`ISSUE_TRACKER_URL`**, **`SECURITY_CONTACT`** and
  visible `[OWNER INPUT…]` text. Add real working destinations, or omit the
  optional tracker. Keep sensitive security reports routed privately. Add `mailto:`
  links only when actual email addresses are supplied; there is no delivery form.
- Privacy and terms include the supplied operator/contact details and an effective
  date of 8 October 2026. They describe local app storage, voluntary Gmail support,
  configured Cloudflare delivery, developer/user responsibilities, and refunds
  handled by Apple. Keep the default Standard EULA in App Store Connect; do not
  enter this explanatory website page as a custom EULA. Check the final archive’s
  SDK practices and the actual hosting/log configuration before publication.
- Search **`PRODUCTION_DOMAIN`**, **`CANONICAL_URL`**, **`SOCIAL_IMAGE_URL`** in
  each `<head>`. After selecting the real HTTPS domain and path, add the appropriate
  per-page canonical link and `og:url`, plus a real absolute `og:image` URL and
  `og:image:alt`. Prepare a local 1200×630 social image from approved branding/media.
  Unique titles/descriptions, Open Graph text, social card type, and favicon are
  already present. No guessed public URL, rating, or structured data exists. Pricing is the confirmed task 10 decision, explicitly marked as the planned launch model.

## Promotional media

The owner supplied five iPhone screenshots and a vertical screen recording on
2026-10-08. The home page now uses processed media from `assets/media/`.

- Hero: redacted terminal screenshot.
- Gallery: terminal, landscape workspace, SFTP browser, and SSH-key promotional screenshots.
- Demo: silent 10-second highlight reel using source ranges 56–58, 64–68, and 138–142 seconds.
  It shows live process output, SFTP browsing, and two terminal panes. Connection setup,
  personal file contents, and loading waits are omitted. It plays on request with
  a text description and a reduced-motion fallback.
- `../promo-assets/promo-app-store/medium-display/`: JPEG promotional exports at 1179×2556 (portrait) and
  2556×1179 (landscape), matching the owner's selected iPhone with Dynamic Island
  (medium display) upload slot. `large-display/` preserves the separate 1320×2868
  and 2868×1320 exports for the large-display slot. These are prepared files,
  not evidence of App Store upload/approval.
- `../promo-assets/promo-app-store/medium-display/keys.jpg`: edited SSH-key promotional capture.
  The owner requested removal of the transient error message; the rest of the
  captured interface is preserved. The website uses this edited screenshot in its
  connection gallery.

The supplied username is replaced with `admin`; IP addresses, hostnames, and
personal profile labels are hidden. Opaque masks are baked into every processed
asset. Metadata and silent audio are removed. Originals in `../promo-assets/promo/` remain untouched, outside the website
directory and Docker build context. nginx also denies the old `/assets/promo/`
path if that folder is accidentally mounted into the server.

To regenerate these **specific** source captures, with FFmpeg and DejaVu fonts:

```sh
python3 website/prepare-promo.py
```

Run from the repository root. The script invokes FFmpeg for the exact redaction,
text overlays, resizing, JPEG/WebP encoding, and video editing; it does not redraw
app UI. Video uses H.264, `-preset slow -crf 29`, 15 fps, 540-pixel width,
`-pix_fmt yuv420p`, `-an`, `-map_metadata -1`, and `-movflags +faststart`.
Website screenshots use WebP at quality 78; App Store exports use JPEG quality 5.
Do not reuse the masks for a different recording or screenshot without rechecking
positions and reviewing every output. Review dimensions, legibility, redaction,
and current app accuracy before submitting.

Sources: [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
and [App Review Guidelines, §2.3](https://developer.apple.com/app-store/review/guidelines/).

## Claim provenance (repository context, not runtime dependencies)

Reviewed on 2026-10-06: `instructions.md`, `app.json`, tasks 03–08, task 04
progress/native verification, `docs/ssh.md`, `docs/terminal-engine.md`,
`docs/security.md`, `docs/app-store.md`, and `docs/release-checklist.md`, with current
terminal/settings, workspace/session, SFTP/editor, key, storage/export, logging,
native credential, and lock implementation.

The newest task 08 record has signed version 0.1.0/build 4, with upload still
queued at its last observation (2026-10-06 14:26 UTC / 16:26 Warsaw). This task
does not poll release services or infer public availability. Earlier accepted
terminal/SFTP evidence and portable tests are distinguished from pending
current-candidate physical checks. Forwarding/bastion implementation is described
with that explicit evidence limit. No unresolved safeguard, perfect erasure,
security certification, background persistence, or unsupported platform is advertised.

The owner selected Apple’s [Standard EULA](https://www.apple.com/legal/internet-services/itunes/dev/stdeula/)
for the app license. The website explains app responsibilities without adding a
custom license or liability cap. It does not promise or prohibit Apple refunds;
mandatory consumer rights remain intact. Apple’s own privacy policy applies to
Apple services; Termforge’s policy describes its separate data practices.

## Prelaunch checklist

- [x] Apply owner instructions to privacy/terms, company details, date, and Standard EULA choice.
- [x] Use supplied email for support/security/privacy and document voluntary correspondence.
- [ ] Verify hosting/provider logging and retention settings against the policy.
- [ ] Confirm current app release/device/security/notice and StoreKit gates, registered IAPs, localized prices and public availability.
- [ ] Real HTTPS App Store URL everywhere; adjust availability, actions, footer and FAQ.
- [x] Fill media slots with redacted owner-supplied screenshots and a silent edited recording.
- [ ] Review current-candidate media before Store submission.
- [ ] Set production domain, per-page canonical/OG URLs and real social image.
- [ ] Publish privacy/support on stable HTTPS URLs through a separately authorized task;
      add the real policy link inside the app through a focused app follow-up.
- [ ] Recheck every link, 320/390/768/1440 px layouts, keyboard/FAQ, contrast, images,
      console, reduced motion, no JavaScript, and Docker after final replacements.

Validation results and remaining launch blockers are recorded in task 09. The
follow-up Traefik configuration was checked using `docker compose config`:
external `proxy` network, HTTP `web` router, backend port 8080, and no TLS labels
or published website ports. No live route, tunnel, DNS, certificate, or proxy
network was changed during configuration validation.
Nothing in this checklist authorizes deployment, an external account, or App Store
submission.

## Upload the image to the deployment host

`deploy.sh` follows the supplied other-project script: it builds only
`termforge-website:latest` from this directory, saves/compresses it, uploads the
archive to the SSH alias `adrian`, and runs `docker load` there. Run it from any
working directory:

```sh
./website/deploy.sh
```

Or run `./deploy.sh` from this directory. It needs local Docker, gzip, mktemp,
OpenSSH tools, configured SSH access to `adrian`, and permission to use remote
Docker. Local and remote temporary archives are cleaned up on exit, including
partial uploads; cleanup failures do not hide the original failure status.

As in the reference, this script uploads/loads the image only. Keep `compose.yaml`
on the deployment host, then start or update the service from its directory:

```sh
docker compose up -d --no-build --pull never
```

The remote host needs the existing external `proxy` network, Traefik `web`
entrypoint, and Cloudflare tunnel configuration described above. The script does
not transfer source/configuration or restart services. `deploy.sh` and its
temporary archives are excluded by the Docker build-context allowlist.

Validation: Bash syntax and isolated mocked build/save/upload/load success and
failure flows were checked. ShellCheck is unavailable locally. Preparation did
not execute the script against `adrian` or perform a deployment.

## Task 10 pricing and purchase copy — 2026-10-06

Authoritative decision: [task 10](../tasks/10-gpt-6.1-sol-monetization.md), with
implementation and release setup in [monetization](../docs/monetization.md).
This directory remains independently copyable; those relative documentation
links are repository maintenance references, not served website links.

The planned launch model is free download; an explicitly started seven-day
trial with every feature; then **€14.99 once** for a non-expiring lifetime
unlock. No subscription or automatic charge. Buying immediately is allowed.
The app's original verified Apple trial acquisition starts exactly 168 hours;
reinstall/restore under the same account never restarts it. Every remote entry
point is gated, and expiry interrupts active sessions, forwards and transfers.
Local data/drafts remain available under existing authentication. Apple handles
purchases, applicable refunds/revocations and restoration; locally available
verified access works offline, while trials retain their original expiry.

Copy locations: `index.html` hero, prominent `#pricing`, purchase FAQs and closing
availability/action copy; `support.html#purchases`; `terms.html#commercial`;
`privacy.html#purchases`. Each distinguishes the app from this static website,
which does not start trials or take payment. €14.99 is never described as a
worldwide fixed price: other storefronts use Apple's localized prices and the
Apple purchase sheet supplies the applicable price. Update these locations,
app panels and task 11 store materials together if the owner changes the offer.

The existing signed task 08 candidate predates StoreKit access enforcement. The
owner reports waiting for distribution; purchase validation needs a later
compatible binary. Keep planned-offer wording, pending App Store links until release evidence, actual Apple validation
and a real public listing URL exist. No account, commercial setup, Family Sharing,
refund guarantee, public URL or successful production purchase is invented.

Task 10 checks: all four pages at 320/390/768/1440 px have no horizontal overflow
or missing images; keyboard skip/focus and native FAQ expansion pass; no console
warnings/errors. Content has no scripts, and nginx sends `script-src 'none'`.
JavaScript-disable/reduced-motion emulation is unavailable in the browser API;
plain HTML disclosures and CSS remain inspectable. The standalone Docker image
build passes from `website/`, with source-identical served pages, 115 relative
page/asset links and fragments, 14 redirects and eight missing/private-file 404s.
Compose configuration and independent serving are retained. The task 10 record
contains final check results and release blockers. No deployment, Traefik/Cloudflare
change or execution of `deploy.sh` occurred.
