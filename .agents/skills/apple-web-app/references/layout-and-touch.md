# iOS layout and touch recipes

Use only the recipe needed for the observed symptom. Examples are plain CSS and
DOM and should be adapted to the existing scroll root and box sizing. For
audits, use [conformance-checklist.md](conformance-checklist.md).

## Viewport & safe areas

```css
:root {
  --safe-area-inset-top: env(safe-area-inset-top);
  --safe-area-inset-right: env(safe-area-inset-right);
  --safe-area-inset-bottom: env(safe-area-inset-bottom);
  --safe-area-inset-left: env(safe-area-inset-left);

  --header-height: calc(3.5rem + var(--safe-area-inset-top));
}
```

Rules:

- For an edge-to-edge iOS layout, use `viewport-fit=cover`; without it every
  inset is `0px` and your layout looks fine in the simulator and wrong on a
  notched phone.
- Mirror `env()` into variables **once**, in `:root`: one source of truth for
  every consumer, and the resolved value becomes readable from JS via
  `getComputedStyle`, which exposes the current computed value, not a signal
  that layout has settled. Express bar heights as `base + inset`, never as the
  inset alone. Source: Joe Bell.
- **Never assume the top inset is greater than zero.** It is `0px` on the SE,
  frequently `0px` in landscape, and was `0px` in standalone on iOS 26.1 due to
  a regression. Any code branching on "has a notch" must treat `0px` as a
  legitimate answer.
- Cold-launch reports favour `100vh` where `100dvh` initially reports the wrong
  height. Treat this as a workaround for a reproduced symptom, not a reason to
  replace a working viewport layout. For a matching fullscreen-canvas issue,
  evaluate `100vh`. Source: fozzedout.
- Don't ship `user-scalable=no` / `maximum-scale=1` to suppress double-tap zoom
  — it breaks pinch-zoom for low-vision users. Use `touch-action: manipulation`
  on the tappable elements instead.
- `interactive-widget` is unimplemented in WebKit (bug 259770); keyboard
  handling is a `visualViewport` job — see
  [overlays-and-keyboard.md](overlays-and-keyboard.md).
- **iPadOS 26 windowed mode**: home-screen apps open as resizable windows with
  system controls over the top-left corner, and `env()` does not report them.
  Keep primary controls out of that corner, or pad it (a community workaround
  uses ~64px) when the window is smaller than the screen. Source: Reinhart
  Previano K.; Apple Support.

## Standalone layout: scroll container & bars

```css
html,
body {
  height: 100%;
}
body {
  background: #f5f5f4; /* same colour as splash + manifest */
}

#root {
  height: 100%;
  min-height: 100vh;
  overflow-y: scroll;
  overscroll-behavior-y: contain;
  isolation: isolate;
}
@media not all and (display-mode: standalone) {
  #root {
    min-height: -webkit-fill-available;
  }
}

header {
  box-sizing: border-box;
  position: sticky;
  top: 0;
  height: calc(3.5rem + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
}

nav.bottom {
  position: fixed;
  inset: auto 0 0 0;
  padding-bottom: calc(env(safe-area-inset-bottom) + 0.5rem);
  transform: translateZ(0);
}
```

Rules:

- **Optional scroll-root pattern.** Preserve a working document or existing
  application scroll root; use this pattern when solving background bounce. One
  scrolling element gives you a readable scroll position and stops the document
  bouncing behind fixed bars; the `-webkit-fill-available` fallback matters only
  outside standalone. Source: Joe Bell.
- `overscroll-behavior` must be in a stylesheet that is parsed **before** the
  first `touchstart`; setting it from JS during a gesture is too late. Source:
  React Spectrum PR #8888.
- `isolation: isolate` on the scroll root keeps `z-index` sane once you add
  sticky bars, blurs and overlays.
- The home indicator auto-hides on iOS 26, but `env(safe-area-inset-bottom)`
  still reports its space — keep padding bottom bars.
- A translucent bar needs a translucent surface _and_ a blur behind it,
  otherwise content shows through crisply as it scrolls under. A progressive
  blur (stacked `backdrop-filter` layers with mask gradients) reads far more
  "native" than one flat blur; in standalone make it noticeably taller, because
  it also has to cover the status bar area. Source: Joe Bell.

**The cold-launch jump.** Production reports describe headers jumping while
safe-area values settle. Prefer a visible CSS-only layout that is usable at
inset `0px`. Source: Joe Bell; fozzedout (see [sources.md](sources.md)).

A non-empty computed inset (including `0px`) is not a layout-readiness signal.
Keep the app visible rather than waiting for a positive inset. If an existing
app-specific reveal gate is needed, retain a bounded timeout and cancel pending
animation frames on completion or teardown. Source: repository readiness review,
in [sources.md](sources.md).

## Optional touch and visual styling

```css
:where(*) {
  -webkit-tap-highlight-color: transparent;
}
body {
  text-size-adjust: 100%;
}
header,
nav,
button,
[role="tab"] {
  user-select: none;
  touch-action: manipulation;
}
/* Only media with an intentional replacement long-press gesture. */
.gesture-media {
  -webkit-touch-callout: none;
}
.long-list > * {
  content-visibility: auto;
}
:root {
  scroll-padding-top: var(--header-height);
}
@media (prefers-reduced-motion: no-preference) {
  html {
    scroll-behavior: smooth;
  }
}
```

Optional styling: suppress the grey tap flash only where another visible
interaction state exists; `user-select: none` on chrome only, never on body
text; `-webkit-touch-callout: none` on media stops the long-press save sheet,
which matters when a long press is your own gesture, as in a photo grid that
opens a lightbox (source: Firtman; Joe Bell for the photo-grid case);
`content-visibility: auto` keeps long grids smooth (source: Joe Bell);
`scroll-padding-top` stops anchors landing under a sticky header; wrap hover
styling in `@media (hover: hover)` so it never sticks on touch.

Source: Joe Bell; Firtman; React Spectrum; fozzedout. See
[sources.md](sources.md) for attribution and [ios-26-notes.md](ios-26-notes.md)
for version qualifications.
