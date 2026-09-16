# Sources & credits

Format: **Author — Title (date) — URL** — what this skill took from it.

## Production experience

- **Joe Bell — a production home-screen web app (2025, private)** — the
  splash-set architecture (one
  device table driving both the image set and the `<link>` list, deduplicated by
  `width × height @ dpr`, cache-busted by query), the safe-area CSS variable
  mirror pattern and `base + inset` bar heights, the standalone scroll container
  and the historical cold-launch reveal gate (a non-empty mirror
  was used as a heuristic; it does not establish layout readiness), progressive-blur translucent
  bars, the icon/splash/`<body>` colour-matching rule, and "auth must never
  redirect the manifest, icons or splash images". Rules carrying
  "Source: Joe Bell" in this skill come from production experience, not from
  published writing. Device-verified on 2026-09-04 with
  an iPhone on iOS 26.6.x: cookies are copied once at Add to Home Screen (the
  app launches signed in), and `black-translucent` gives a transparent status
  bar on that build. Also verified 2026-09-04 on macOS 26.6.2 / Safari
  26.6.2 with a third-party browser as the default: the Dock title bar is an
  install-time snapshot; manifest icons beat `apple-touch-icon`; the PNG was
  used over an SVG listed first; no Liquid Glass on the Dock icon; the minimum
  window is 336×186 and size is not restored on relaunch; out-of-scope links
  (both `_blank` and same-window) open the default browser while `window.open`
  stays in the app. Second run the same day: the title-bar snapshot reads
  `<body>` background, not manifest `background_color`; the Apps view and
  Spotlight show the same flat icon as the Dock.
- **Joe Bell — a production Tailwind v4 app (2025, private)** — the Tailwind
  v4 reference's spellings come from the same production app.
- **Tailwind CSS — v4 documentation (`@utility`, `@custom-variant`, `--value()`)** —
  https://tailwindcss.com/docs — syntax for the Tailwind v4 reference.

## iOS PWA behaviour

- **Maximiliano Firtman — "Progressive Web Apps on iOS" (2023-06)** —
  https://firt.dev/notes/pwa-ios/ — startup images require both
  `apple-touch-startup-image` links and `apple-mobile-web-app-capable`; the
  home-screen label comes from manifest `short_name`/`name` since iOS 11.3 with
  `apple-mobile-web-app-title` as the fallback; iOS ignores manifest
  `background_color` and `orientation`; PNG icons only; `black-translucent` as
  the fullscreen mode; standalone apps have a separate storage jar (cookies
  are copied once at install, per device verification) and lose state;
  external links never open the installed app, and `scope` only governs
  in-app navigation — out-of-scope links open an in-app browser with a Done
  button rather than leaving the app (behaviour since iOS 12.2); standalone
  offers no browser back button, so the app must provide its own navigation.
- **Maximiliano Firtman — "PWA design tips" (2018-12)** —
  https://firt.dev/pwa-design-tips/ — `overscroll-behavior-y: contain`,
  `user-select: none`, `-webkit-touch-callout: none`,
  `-webkit-tap-highlight-color`, and the general "make it not feel like a web
  page" list.
- **Maximiliano Firtman — post on X (2025-06)** —
  https://x.com/firt/status/1932167455016976853 — iOS 26 opening Home Screen
  sites as web apps; no install prompt on iOS.
- **Revert to Saved (2025-06-13)** —
  https://reverttosaved.com/2025/06/13/ — the home indicator auto-hiding on
  iOS 26 while the bottom safe-area inset persists.

## Apple / WebKit

- **WebKit blog — "Updates to Storage Policy" (2023)** —
  https://webkit.org/blog/14403/updates-to-storage-policy/ — storage is
  best-effort and can be evicted.
- **WebKit blog — "News from WWDC25: Web technology coming this fall"
  (2025-06)** — https://webkit.org/blog/16993/ — iOS 26 web app behaviour and
  the Home Screen changes.
- **WebKit blog — "WebKit in Safari 26.0" (2025-09)** —
  https://webkit.org/blog/17333/ — Safari 26.0 feature and behaviour changes.
- **WebKit blog — "WebKit in Safari 26.1" (2025-11)** —
  https://webkit.org/blog/17541/ — "Fixed a bottom gap appearing on layouts with
  viewport-sized fixed containers on iOS" (radar 158055568).
- **WebKit bug 301994** — https://bugs.webkit.org/show_bug.cgi?id=301994 — the
  26.1 standalone regression: opaque status bar and `env(safe-area-inset-top)`
  resolving to `0`.
- **WebKit bug 259770** — https://bugs.webkit.org/show_bug.cgi?id=259770 —
  `interactive-widget=resizes-content` unimplemented.
- **Apple Developer Forums (2025-09)** —
  https://developer.apple.com/forums/thread/800798 and
  https://developer.apple.com/forums/thread/803987 — the `100dvh` bottom gap on
  iOS 26.0.
- **MacRumors forum thread (2025-11)** —
  https://forums.macrumors.com/threads/ios-26-1-pwa-full-screen-broken.2470545/
  — corroborates the 26.1 status-bar regression in the wild.

## iOS 26 theme colour

The sampling algorithm is community reverse engineering, not Apple
documentation; thresholds are approximate.

- **r/webdev thread `1ni74bd`** —
  https://www.reddit.com/r/webdev/comments/1ni74bd/ — the pointer that started
  this section. It could not be fetched from the environment this skill was
  written in, so it is cited as a pointer only; every claim taken from it is
  corroborated by the sources below.
- **Ben Frain — "iOS 26 Safari theme color: tab tinting with fixed position
  elements" (2025-11-16)** —
  https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/
  — Safari 26 ignoring `theme-color`; edge-touching fixed/sticky element
  sampling; `opacity: 0` elements still being sampled (use `display: none`).
- **Jahir Fiquitiva — "Safari toolbar" (2026-03-02)** —
  https://jahir.dev/blog/safari-toolbar — sampling thresholds (width ≥ ~80%,
  height ≥ ~3px, within ~4px of the top / ~3px of the bottom) and the
  `<body>` → `<html>` → white/black fallback chain.
- **Ben Nasedkin — "iOS 26 Safari toolbar colors"** —
  https://nasedk.in/blog/ios26-safari-toolbar-colors/ — corroboration of the
  fallback chain.
- **Pavel Larionov — "Safari 26, Liquid Glass and the web" (2026-05-13)** —
  https://1ar.io/updates/safari-26-liquid-glass-web/ — the
  `viewport-fit=cover` requirement for the bottom tint.
- **thatdevpro — "HTML meta theme-color"** —
  https://www.thatdevpro.com/reference/html-meta-theme-color/ — current status
  of the meta tag across browsers.
- **Danny Moerkerke — post on X (2025-11)** —
  https://x.com/dannymoerkerke/status/1995944519632912570 — manifest
  `theme_color` not applying to home-screen apps on 26.1.

## Overlays, modals, keyboard

- **Adobe React Spectrum — PR #8888 (Devon Govett, merged 2025-09-22)** —
  https://github.com/adobe/react-spectrum/pull/8888 — and follow-up
  https://github.com/adobe/react-spectrum/pull/8922; current code in
  `packages/react-aria/src/overlays/usePreventScroll.ts`,
  `packages/react-aria/src/utils/useViewportSize.ts`,
  `packages/react-aria-components/src/Modal.tsx`,
  `packages/@adobe/react-spectrum/src/overlays/Underlay.tsx` and the Spectrum 2
  `Modal.tsx` — the whole overlay recipe: absolute backdrop sized from
  `scrollingElement`, sticky-centred dialog, `--visual-viewport-height`
  (including the `blur` refresh and the `scale` multiplication),
  `overscroll-behavior` injected via `<style>` before `touchstart`,
  `focus({ preventScroll: true })` plus manual scrolling, allowing two-finger
  and text-selection drags, `padding-bottom: 100vh` for takeovers, container
  queries, `isolation: isolate`.
- **MUI — issue #46953** — https://github.com/mui/material-ui/issues/46953 —
  independent confirmation of the iOS 26 `position: fixed` clipping.
- **Edoardo Lunardi — "Safari 26 and the strange case of fixed overlays"
  (2025-09-21)** —
  https://www.edoardolunardi.dev/blog/safari-26-and-the-strange-case-of-fixed-overlays
  — fully opaque fixed overlays failing to fill the viewport on iOS 26.0, and
  the `opacity: .99` workaround.

## Status bar & viewport heights

- **"fozzedout" — gist (2026-08)** —
  https://gist.github.com/fozzedout/5e77925381991a9570151550992baf14 — `100vh`
  being the only reliable height on a cold standalone start, `100dvh` reporting
  wrongly until layout settles, the `env()` probe technique, and the 26.1
  landscape 20pt top inset, and the edge-swipe back gesture only working once
  the standalone app has in-app history. Also reports a one-time cookie copy on
  iOS install — now confirmed (see Joe Bell entry).
- **Daniel Pietzsch — "How to create a blurry status bar for PWAs on iOS"
  (2025-09-18)** —
  https://danielpietzsch.com/articles/how-to-create-a-blurry-status-bar-for-pwas-on-ios
  — the blurred status-bar strip via `body::before { position: fixed;
height: env(safe-area-inset-top); backdrop-filter; mask }`.

## macOS web apps

- **WebKit blog — "WebKit Features in Safari 17.0" (2023-09)** —
  https://webkit.org/blog/14445/webkit-features-in-safari-17-0/ — Add to Dock,
  the one-time cookie copy, manifest customisation, iCloud Keychain, Cmd+Tab
  and the rest of the OS integration.
- **Apple — WWDC23 session 10120, "What's new in web apps" (2023-06)** —
  https://developer.apple.com/videos/play/wwdc2023/10120/ — `display`, `scope`
  and `id` behaviour, cookies versus `localStorage`, notification `silent`
  defaults differing between macOS and iOS, badging permission, and the
  macOS-versus-iOS scope rules.
- **WebKit blog — "WebKit Features in Safari 17.4" (2024-03)** —
  https://webkit.org/blog/15063/ — `shortcuts` and `categories` on macOS.
- **WebKit blog — "WebKit Features in Safari 18.0" (2024-09)** —
  https://webkit.org/blog/15865/webkit-features-in-safari-18-0/ — external
  link capturing by `scope`, and extensions/content blockers inside web apps.
- **Apple Support — "Use Safari web apps on Mac"** —
  https://support.apple.com/en-us/104996 — requirements, isolation from
  Safari, and the per-app Settings options; see also the Safari User Guide
  General settings page,
  https://support.apple.com/en-kg/guide/safari/ibrwcb937bc5/mac.
- **Thomas Steiner — "Web Apps on macOS Sonoma 14 Beta" (2023-06-07)** —
  https://blog.tomayac.com/2023/06/07/web-apps-on-macos-sonoma-14-beta/ —
  icons including maskable and the squircle mask, toolbar rules, scope and the
  OAuth exception, `window.open`, and the unsupported APIs.
- **Mark Otto — "macOS web apps" (2023-10-01)** —
  https://markdotto.com/blog/macos-web-apps — the title bar taking `<body>`'s
  background rather than `theme_color`, display-mode behaviour, and gotchas;
  the install-time snapshot behaviour is consistent with his `<body>`
  observation; his `background_color` finding did not hold on 26.6.2.
- **Apple Developer Forums thread 738535 (2023-11)** —
  https://developer.apple.com/forums/thread/738535 — manifest icons only, SVG
  `sizes: any` preferred, 512 and 1024 recommended; SVG preference not
  reproduced on Safari 26.6.2 (Joe Bell).
- **Apple Developer Forums thread 766767 (2024-10)** —
  https://developer.apple.com/forums/thread/766767 — unanswered report that
  since Safari 18.0 external links stay inside the Dock app, contradicting the
  documented out-of-scope rule; not reproduced on macOS 26.6.2 (Joe Bell).
- **WebKit bug 257806** — https://bugs.webkit.org/show_bug.cgi?id=257806 —
  `display-mode: standalone` fixed in Sonoma beta 3.
- **andesco — "Safari Color Tinting" README** —
  https://github.com/andesco/safari-color-tinting — the macOS 90%-width
  sampling rule and the Settings toggles.
- **grooovinger — "Define the Theme Color for Safari 26" (2026-02-27)** —
  https://grooovinger.com/notes/2026-02-27-safari-26-header-background —
  macOS 26 sampling thresholds, and Safari 26 on macOS 15 not tinting.
- **OSXDaily — "How to Disable Safari Color Tinting on macOS Tahoe"
  (2025-10-30)** —
  https://osxdaily.com/2025/10/30/disable-safari-color-tinting-macos/ — Tahoe
  tinting window and title bars from the top of the page, and the toggle.
- **home-assistant discussion #3243 (2026-03-18)** —
  https://github.com/orgs/home-assistant/discussions/3243 — Tahoe Dock icons
  for Safari web apps not receiving Liquid Glass.
- **MacRumors — "Here's How Web Apps Work in macOS Sonoma" (2023-06-14)** —
  https://www.macrumors.com/2023/06/14/how-web-apps-work-macos-sonoma/ —
  corroboration on theme colour, cookies and badges.
- **devtoolstips.org — "Debug your Safari Web Apps on macOS" (2023-06)** —
  https://devtoolstips.org/tips/en/debug-safari-mac-webapps/ — reaching Web
  Inspector for a Dock app via the Develop menu.
- **Apple — Safari release notes** —
  https://developer.apple.com/documentation/safari-release-notes — 18.0: links
  opening directly in web apps on macOS (124736521) and extensions in web apps
  (131119823); 26.0: any website can become a web app on iOS (142604875); no
  macOS web-app changes anywhere in 26.x.

## iPadOS 26 windows

- **Apple Support — "Multitask on iPad with iPadOS 26"** —
  https://support.apple.com/en-us/125309 — Windowed Apps, Full Screen Apps and
  Stage Manager modes, the window controls and menu bar, Slide Over's return
  in 26.2.
- **Reinhart Previano K. — "PWA in iPadOS 26 is a joke" (2025-09-19)** —
  https://dev.to/reinhart1010/pwa-in-ipados-26-is-a-joke-38g1 — window
  controls overlaying content, the black gap, `env()` not reporting the
  chrome, and Window Controls Overlay being unsupported (tested on 26.0
  23A341).
- **Framework7 forum thread 24776 (2025)** —
  https://forum.framework7.io/t/resizable-app-window-on-ipados-26/24776 — the
  screen-size-at-load detection and the ~64px left padding workaround.
- **ionic-team/capacitor issue #8172** —
  https://github.com/ionic-team/capacitor/issues/8172 — corroboration that the
  controls overlap web content with no offset mechanism.

## Framework evidence

Cited only as evidence for the "emit the `apple-` capable tag yourself" rule —
this skill is framework-agnostic.

- **Next.js documentation** — https://nextjs.org/docs — and
  **vercel/next.js issue #74524** —
  https://github.com/vercel/next.js/issues/74524 — a widely used framework that
  emits only `mobile-web-app-capable` from its PWA metadata API, silently
  disabling startup images until the `apple-` prefixed tag is added by hand.

## Device data

- **ios-resolution.com** — https://www.ios-resolution.com/ — the point sizes
  and DPRs in [ios-devices.md](ios-devices.md), checked 2026-09-04 (iPhone 17e
  at 390×844@3, announced 2026-03-11; iPhone 18 unannounced at time of
  writing).

## Community skills reviewed

Both are overwhelmingly about service workers, Workbox and
`beforeinstallprompt`, i.e. outside this skill's scope. Borrowed only the
items listed.

- **`alinaqi/maggy` — `pwa-development`** (skills.sh) —
  https://github.com/alinaqi/maggy, `skills/pwa-development/SKILL.md`.
- **`curiositech/some_claude_skills` — `pwa-expert`** (skills.sh) —
  https://github.com/curiositech/some_claude_skills,
  `.claude/skills/pwa-expert/SKILL.md`.

Borrowed from those two: the
`matchMedia('(display-mode: standalone)').matches || navigator.standalone`
detection snippet; "there is no `beforeinstallprompt` on iOS, so show manual
Add to Home Screen instructions"; "delay the install hint until engagement and
persist the dismissal"; and the manifest field checklist.

## Example corrections (2026-09-05)

- **Repository snippet review and Node regression tests (2026-09-05)** —
  maintainer tests in `tests/apple-web-app-snippets.test.mjs` exercise the
  documented JavaScript. Visit recording is separate from install-hint
  eligibility. Overlay synchronization initializes immediately, removes its
  listeners, cancels pending blur frames and updates the layout-height fallback
  on resize. These checks are code evidence, not Safari/device verification.
- **Repository readiness-claim review (2026-09-05)** — a computed inset of
  `0px` is non-empty even when layout can change later; reading that value
  cannot establish that safe-area layout has settled. Removed the polling
  example rather than promoting it as a readiness API. The older production
  observation is retained above; no new OS build was tested.

## Startup appearance review (2026-09-15)

- **Stephen — WebKit bug 259328 (2023-07-18)** —
  https://bugs.webkit.org/show_bug.cgi?id=259328 — reports startup images
  retaining the installation's appearance after system light/dark changes in
  both directions. Read as NEW on 2026-09-15. The report fields say Safari 17
  and iOS 16; they are not a tested support matrix. Used to replace the
  unconditional claim of selection at every launch.
- **CSSWG — "[mediaqueries] Effect of `<meta name=color-scheme>` on the
  `(prefers-color-scheme)` MQ" (opened 2024-04-25)** —
  https://github.com/w3c/csswg-drafts/issues/10249 — resolved to close with no
  change on 2026-01-21; closed as retracted on 2026-06-12. Page color-scheme
  is not an established startup-selection override.
- **web.dev — "Enhancements" (updated 2024-09-20)** —
  https://web.dev/learn/pwa/enhancements — exact launch-window image sizing,
  media-specific variants and a white launch screen when no startup image
  covers the user's context. Restores missing coverage guidance without the
  earlier unsupported blanket claims about no scaling or the fallback colour
  matching the app background. This published guidance was not retested on
  iOS 26 in this revision.
- **Joe Bell — startup-theme investigation (2026-09-15, editorial review)** —
  this repository's startup reference — appearance-aware image/link counts,
  neutral artwork tradeoff, preserving existing light/dark sets by default,
  starting new artwork with a neutral set unless the product requires matching
  installation appearance, and the unexecuted installation/refresh test plan.
  Production feedback reports a dark-installed splash remaining dark after a
  system switch to light and refreshing on reinstall. Exact OS/Safari build
  was not supplied, so this is not promoted as a new device-verified finding.
  No new Simulator or hardware tests ran for this revision. Script timing,
  manifest/reload/URL invalidation and OS-update behavior remain unverified.
