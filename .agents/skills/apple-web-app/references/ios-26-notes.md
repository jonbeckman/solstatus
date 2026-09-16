# iOS 26.x notes for standalone web apps

**Feature-detect, don't version-sniff.** Every entry below is a moving target:
Apple has fixed, re-broken and re-fixed several of these within point releases.
Write layouts that are correct whichever way the behaviour goes, and only reach
for a version check when there is genuinely no feature to test.

## Historical baselines

For projects explicitly supporting old iOS:

- iOS 11.2 and earlier: no manifest support; installation metadata uses the
  Apple tags. Zoom restrictions were ignored in Safari from iOS 10 but could
  still affect standalone; do not use them to suppress zoom.
- iOS 11.3: manifest support and `env(safe-area-inset-*)` form the historical
  baseline for the edge-to-edge recipe.
- Safari 15: `theme-color` was respected in browser UI; retain the meta where
  supporting browsers use it, despite Safari 26 sampling changes.

Source: Firtman; WebKit, retained historical guidance in
[sources.md](sources.md). These baselines were not retested during the
2026-09-05 instruction revision.

## iOS / Safari 26.0

- **`position: fixed` is clipped to the inner viewport.** Full-page backdrops
  and overlays stop covering the page once it scrolls. Fix: size the backdrop
  absolutely from `document.scrollingElement.scrollWidth/scrollHeight` and
  centre the dialog with `position: sticky`.
- **Fully opaque fixed overlays don't fill the viewport.** Any transparency at
  all (`opacity: 0.99`) restores correct behaviour. Source: Edoardo Lunardi.
- **`100dvh` leaves a gap** at the bottom on layouts with viewport-sized fixed
  containers. Source: Apple Developer Forums 800798 / 803987.
- **`<meta name="theme-color">` is ignored**; Safari samples page colour
  instead. See [theme-color-and-status-bar.md](theme-color-and-status-bar.md).
- **The home indicator auto-hides**, but `env(safe-area-inset-bottom)` still
  reports its space. Keep padding bottom bars.
- **Any Home Screen site opens as a web app**, with a per-site "Open as Web App"
  toggle. Sites that never opted into standalone can suddenly be running in it —
  safe-area handling is no longer optional for "we're not a PWA" sites.
- **`overscroll-behavior` must be in a stylesheet parsed before the first
  `touchstart`.** Applying it from JS mid-gesture has no effect.

## iOS 26.1

- **Status-bar regression in standalone:** with
  `apple-mobile-web-app-status-bar-style: black-translucent` the bar renders
  opaque and `env(safe-area-inset-top)` resolves to `0px`, so apps that assumed
  a positive inset lose their top padding and the layout collapses under the
  clock. WebKit bug 301994; widely reported (MacRumors thread 2470545), and
  observed in production (Joe Bell).
- **`100dvh` bottom gap fixed** — Safari 26.1 release notes, radar 158055568.
- In landscape the reported top inset can be `20pt` where earlier releases gave
  `0`. Source: fozzedout gist.

## iOS 26.2

- Status-bar/inset regression fixed (confirmed 2025-12); `black-translucent`
  behaves again.
- Do **not** leave a 26.1-shaped workaround hardcoded — it will over-pad here.

## Later releases (last reviewed 2026-09-04)

- **WebKit 301994 re-regressed**: reported again on 26.5.2 (a 62px gap) and on
  the iOS 27 public beta, and the bug is back in REOPENED with no engineer
  explanation. Treat "the layout must be correct when the top inset is `0px`" as
  the primary rule, not a footnote — this has now broken, been fixed, and broken
  again. Verified by Joe Bell on iOS 26.6.x (2026-09): `black-translucent`
  renders a transparent status bar on that build.
- WebKit bug 259770 (`interactive-widget=resizes-content`) is still open, so
  keyboard handling stays a `visualViewport` job.

Startup-image selection and refresh questions are tracked in
[splash-screens.md](splash-screens.md). These remain unverified; that work queue
is not evidence of an iOS 26 regression. Source: Joe Bell, investigation scope
in [sources.md](sources.md).

## iPadOS 26 windows

iPadOS 26 ships with **Windowed Apps** on by default (Settings → Multitasking &
Gestures; the alternatives are Full Screen Apps and Stage Manager). Home-screen
web apps open as resizable windows with macOS-style controls at the top-left and
a menu bar on swipe-down. Consequences reported for web apps:

- The window controls **overlay page content** — a top-left menu button ends up
  underneath them.
- `env(safe-area-inset-*)` does **not** report the controls or the window
  chrome, so the usual safe-area approach cannot see the problem.
- A black gap can appear between content and the window's top edge.
- The Window Controls Overlay API (`titlebar-area-*`) is unsupported on iPadOS,
  so the standard solution is unavailable.

Community workaround: detect "not full screen" by comparing
`window.innerWidth`/`innerHeight` against the `screen` dimensions captured at
load (the `screen` object is only set on initial load), then pad the top-left;
one report uses ~64px, which is that author's choice rather than a measured
control size. No fix was identified in the reviewed 26.1–26.6 notes; absence
from release notes does not prove the workaround is needed on another build.

Source: Apple Support 125309; Reinhart Previano K.; Framework7 forum 24776;
capacitor #8172.

## Cold-launch heights

Production and community reports describe incorrect initial `100dvh` heights and
a header jump while safe areas settle. `100vh` is a candidate workaround for
that reproduced symptom, not a universal replacement for `100dvh`. Source:
fozzedout gist; Joe Bell, in [sources.md](sources.md).

Prefer a visible layout valid at inset `0px`. A non-empty mirrored `env()` value
exposes a computed value, not proof that future layout changes are over. See
[layout-and-touch.md](layout-and-touch.md).

## Problem → fix → source

| Problem                                                   | Fix                                                                          | Source                                 |
| :-------------------------------------------------------- | :--------------------------------------------------------------------------- | :------------------------------------- |
| Backdrop doesn't cover scrolled page (26.0)               | Absolute backdrop sized to `scrollingElement`; sticky dialog                 | React Spectrum PR #8888                |
| Opaque overlay doesn't fill (26.0)                        | `opacity: 0.99`                                                              | Lunardi                                |
| `100dvh` gap (26.0)                                       | Use `100vh`; fixed in 26.1                                                   | Apple forums 800798; Safari 26.1 notes |
| Status bar tint ignores `theme-color` (26.0+)             | Give edge-touching fixed/sticky element a real background                    | Frain, Fiquitiva et al.                |
| Hidden overlay tints the status bar                       | `display: none`, not `opacity: 0`                                            | Frain                                  |
| Status bar opaque, top inset `0px` (26.1; back on 26.5.2) | Layout must be valid at inset `0px`; fixed in 26.2, re-regressed later       | WebKit 301994                          |
| Rubber-banding behind fixed bars                          | `overscroll-behavior-y: contain` in a stylesheet                             | React Spectrum PR #8888                |
| Keyboard covers focused field                             | `visualViewport` height variable + manual scroll                             | React Spectrum                         |
| iPad window controls cover top-left chrome (iPadOS 26)    | Pad when not full screen; `env()` won't tell you                             | Reinhart Previano K.                   |
| Header jumps on cold launch                               | Visible zero-inset layout; evaluate `100vh` if the height symptom reproduces | fozzedout; repo experience (Joe Bell)  |

Full citations: [sources.md](sources.md).
