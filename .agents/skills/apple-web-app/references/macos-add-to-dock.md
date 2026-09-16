# macOS web apps (Safari "Add to Dock")

Safari 17 / macOS Sonoma (2023-09) added **File → Add to Dock** (also in the
Share menu). Any site qualifies — a manifest is optional but honoured when
present. The app is saved to `~/Applications` and gets its own Dock icon, menu
bar and window. Source: WebKit blog 17.0; Apple Support 104996.

Per-app settings live in the web app's own Settings: name, URL, icon, "Show
navigation controls", "Show color in title bar", Privacy and Extensions.

## Install hints

Safari has no `beforeinstallprompt` on macOS. Any product hint should describe
File → Add to Dock (or the Share menu), not the iOS Add to Home Screen flow.
Since Safari 18, the browser's own dismissible "Open in web app" banner can
surface an already-installed app; do not add a redundant hint without a product
reason. Source: WebKit blog 17.0 and 18.0; Apple Support 104996.

## Manifest members on macOS

| Member             | Effect                                                                                                             |
| :----------------- | :----------------------------------------------------------------------------------------------------------------- |
| `name`             | App name in the Dock, menu bar and Launchpad                                                                       |
| `short_name`       | Parsed, but Apple documents only `name` for the label on macOS — treat any use as unverified                       |
| `display`          | `standalone` and `fullscreen` both hide the toolbar; `minimal-ui`, `browser` or no manifest show one               |
| `start_url`        | Loaded on launch                                                                                                   |
| `scope`            | Decides in-app vs external navigation; defaults to the origin of the page used to create the app                   |
| `id`               | Distinguishes several apps on one origin; used for Focus-mode sync; falls back to `start_url`                      |
| `icons`            | The Dock/Launchpad icon — see below                                                                                |
| `theme_color`      | See "Title bar colour" below                                                                                       |
| `background_color` | Reported to drive the title bar on Sonoma (Otto, 2023); on 26.6.2 the title bar reads `<body>` instead — see below |
| `shortcuts`        | File-menu and Dock-menu commands (Safari 17.4+)                                                                    |
| `categories`       | Launchpad folder naming (Safari 17.4+)                                                                             |
| `orientation`      | Not applicable                                                                                                     |

Source: WWDC23 session 10120; Thomas Steiner; Mark Otto; WebKit blog 17.4.

## Icons

- macOS reads the **manifest** `icons`, not `apple-touch-icon` (verified on
  macOS 26.6.2) and not `favicon.ico`. The manifest should be served as
  `application/manifest+json`.
- Forum 738535 reported an SVG with `sizes: any` preferred on Safari 17, but
  Safari 26.6.2 used the PNG even when the SVG was listed first. Ship opaque
  full-square PNGs at 512 and 1024; treat SVG as optional. PNG and WebP are
  accepted.
- `purpose: "maskable"` is honoured, and macOS applies its squircle mask.
- With no usable icon, Safari generates a monogram from the first letter of the
  title.
- Users can override the icon at add time and later in the app's Settings.
- On macOS 26.6.2 the icon is a flat rounded square with the system shadow
  everywhere — Dock, Finder, the Apps view, Spotlight, the Add to Dock preview
  and Safari's Open in App banner — with no Liquid Glass treatment (verified);
  Chrome PWAs on the same machine are glassed (home-assistant #3243).

Source: Apple Developer Forums 738535; Thomas Steiner; Apple Support 104996;
home-assistant discussion #3243; Joe Bell (verified macOS 26.6.2).

## Title bar colour

The history matters here, because the behaviour has changed twice:

- **Sonoma / Safari 17.** Apple said the site's theme colour "blends into the
  toolbar". In practice Mark Otto found `theme-color` and manifest `theme_color`
  ignored, with the title bar (under the "Show color in title bar" setting)
  taking `<body>`'s `background-color`; manifest `background_color` did work.
- **Safari 26 on macOS 26.** Safari's own window and title bars sample page
  colour much as on iOS: `<body>`'s background, or a `fixed`/`sticky` element
  touching the top edge — reported as ≥ 90% width on macOS (vs 80% on iOS) and
  around 6px tall.
- **Safari 26 on macOS 15** does not tint at all.

Users can turn tinting off: Safari → Settings → Tabs → "Show color in tab bar"
for Safari itself, and Settings → General → "Show color in title bar" for an
installed web app. Don't rely on the tint being visible.

On macOS 26.6.2, a Dock app's title bar is a **snapshot captured at Add to
Dock**. It matched the page background at install and ignored later `<body>` and
sticky-header background changes, including after relaunch. Safari's live
sampler therefore does not apply to Dock apps. The snapshot reads `<body>`'s
background colour — verified by installing with manifest `background_color` set
to red while `<body>` stayed cream; the title bar was cream. Manifest
`background_color` therefore does not drive the title bar on 26.6.2, which also
settles Mark Otto's 2023 `background_color` observation as no longer current.
Changing the title-bar colour requires removing and re-adding the app.

The existing recipe remains right for Safari itself and for the install-time
snapshot: give `<body>` a real background colour, and give any sticky header a
real background of its own rather than letting it inherit the page.

Source: WebKit blog 17.0; Mark Otto; andesco "Safari Color Tinting";
grooovinger; OSXDaily; Joe Bell (verified macOS 26.6.2).

## Cookies and storage

At Add to Dock, Safari **copies the site's cookies once** into the web app. From
then on the cookie jars are separate. Nothing else is copied — not
`localStorage`, not IndexedDB, not the cache.

For an app that already authenticates with cookies, this copy can preserve
sign-in at installation. Preserve the existing authentication architecture; this
behavior alone is not a reason to migrate it. For the iOS observation, see
[install-ux.md](install-ux.md). Website data can be cleared per app from its
Settings → Privacy.

Source: WebKit blog 17.0; WWDC23 session 10120; Apple Support 104996.

## Navigation and scope

- In-scope links stay inside the app.
- Out-of-scope links open in the user's default browser — verified on macOS
  26.6.2 for both `target="_blank"` and same-window navigation, with a
  third-party browser as default.
- OAuth flows are an exception and stay in the app.
- On macOS 26.6.2, `window.open()` opened a new Dock-app window.
- Since Safari 18 / macOS Sequoia, links clicked **outside** Safari that match
  an installed app's `scope` open in that app; inside Safari you get a
  dismissible "Open in web app" banner.

The forum 766767 report that all external links stay in-app did not reproduce on
macOS 26.6.2. Treat it as version-specific or configuration-specific; still test
your own links on older Safari 18 builds.

Source: WWDC23 session 10120; Thomas Steiner; WebKit blog 18.0; Apple Developer
Forums 766767; Joe Bell (verified macOS 26.6.2).

## Window and display modes

- `display: standalone` or `fullscreen` — no toolbar at all.
- Anything else — a toolbar with Back, Forward and Share. There is no reload
  button.
- The minimum window size is 336×186 CSS px. On macOS 26.6.2, size and position
  were **not** restored after quit/relaunch (the app reopened large); no
  manifest control over size is documented.
- Web apps participate in Cmd+Tab, Stage Manager, Mission Control, Launchpad and
  Spotlight like any other app.

Source: Thomas Steiner; WWDC23 session 10120; WebKit blog 17.0; Joe Bell
(verified macOS 26.6.2).

## Notifications, badging, shortcuts, extensions

- Notifications display the app's icon. Sound is **off by default on macOS** and
  on by default on iOS, so set `silent` explicitly rather than relying on the
  platform default.
- Dock badging uses the Badging API; its permission comes bundled with
  notification permission.
- `shortcuts` manifest entries become File-menu and Dock-menu commands, and
  users can bind keyboard shortcuts to them in System Settings (Safari 17.4+).
- Safari Web Extensions and Content Blockers work inside web apps, configured
  per app (Safari 18+).
- iCloud Keychain and passkey AutoFill work.
- **Not supported** as of Sonoma: File System Access, Web Share Target, and the
  Window Controls Overlay API. Re-check these on current macOS before relying on
  the absence. Source: Thomas Steiner.

Source: WWDC23 session 10120; WebKit blog 17.0, 17.4 and 18.0.

## Detection

Use `window.matchMedia("(display-mode: standalone)").matches`. This was wrong in
early Sonoma betas and fixed in beta 3 (WebKit bug 257806).
`navigator.standalone` is **undefined** on macOS — it is an iOS-only legacy
flag, so a detection helper that relies on it alone will report `false` inside a
Dock app. A `minimal-ui` app matches its own display-mode query.

## Debugging

Enable Safari → Settings → Advanced → "Show features for web developers", then
use Develop → _your Mac_ → _your web app_ to attach Web Inspector to a running
Dock app. Source: devtoolstips.org.

## Nothing to do on macOS

Each of these is load-bearing on iOS and inert here, so don't spend time on them
for a Mac-only target:

- `viewport-fit=cover` and every `env(safe-area-inset-*)` — a desktop window has
  no notch or home indicator, so all four insets are `0px`.
- `apple-mobile-web-app-capable`, `apple-mobile-web-app-title` and
  `apple-mobile-web-app-status-bar-style` — documented as iOS-only, with no
  reported effect on macOS. Harmless to leave in place for your iOS users.
- `apple-touch-startup-image` and the whole device table. No launch image
  concept is documented for macOS web apps, so **generate nothing**. (This is an
  absence of documentation rather than a documented "no".)
- Touch CSS: `-webkit-touch-callout`, `-webkit-tap-highlight-color`,
  `touch-action`.
- Share → Add to Home Screen copy and the install-hint gating model. The macOS
  flow and its wording are different, and Safari 18's own "Open in web app"
  banner already prompts users.

## Version timeline

| Version                         | Change                                                                                                            |
| :------------------------------ | :---------------------------------------------------------------------------------------------------------------- |
| Safari 17 / Sonoma 14 (2023-09) | Add to Dock introduced; manifest optional; `display-mode` bug fixed in beta 3                                     |
| Safari 17.4 (2024-03)           | `shortcuts` and `categories` honoured on macOS                                                                    |
| Safari 18 / Sequoia (2024-09)   | External in-scope link capturing; extensions and content blockers in web apps                                     |
| Safari 26 / Tahoe (2025-09)     | No web-app changes in the release notes; Liquid Glass tinting affects Safari's own chrome; Dock icons not glassed |

Source: WebKit blog 17.0, 17.4, 18.0; Safari release notes 18.0 and 26.0–26.6.

## Open questions

1. Whether Apple will ever apply Liquid Glass to Dock web app icons.
2. The Safari 18-era forum 766767 link behaviour on builds older than 26.6.2.

Full citations: [sources.md](sources.md).
