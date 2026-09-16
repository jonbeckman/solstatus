# Status bar & theme colour

## `apple-mobile-web-app-status-bar-style`

Only applies in standalone (home-screen) mode, and only when
`apple-mobile-web-app-capable` is `yes`.

| Value                 | Bar appearance                    | Page draws under it | `env(safe-area-inset-top)` |
| :-------------------- | :-------------------------------- | :------------------ | :------------------------- |
| `default` (or absent) | Opaque, system/white              | No                  | `0px`                      |
| `black`               | Opaque black                      | No                  | `0px`                      |
| `black-translucent`   | Transparent; clock over your page | **Yes**             | Real inset                 |

`black-translucent` is the only "fullscreen" option — and the name is
misleading: it does not make the bar black, it removes it and hands you the
pixels. Choosing it means every top-anchored element needs
`padding-top: env(safe-area-inset-top)`.

## Safari 26 colour sampling (community observations)

Safari 26 stopped honouring `<meta name="theme-color">` for the top and bottom
system areas. Instead it samples the page:

1. Look for an element with `position: fixed` or `position: sticky` that touches
   the top edge of the viewport: at least ~80% of the viewport width, at least
   ~3px tall, and within ~4px of the edge.
2. Take that element's `background-color` (or the effective colour behind its
   `backdrop-filter`) as the top tint.
3. Repeat for the bottom edge (tolerance ~3px). The bottom tint only applies
   when the page uses `viewport-fit=cover`.
4. If no element qualifies, use `<body>`'s background colour.
5. If `<body>` is transparent, use `<html>`'s.
6. If that is also transparent, fall back to white (or black in dark mode).

Source: Ben Frain; Jahir Fiquitiva; Ben Nasedkin; Pavel Larionov, in
[sources.md](sources.md). Treat the numbers as approximate — they are derived
from community reverse engineering, not documentation, and have shifted between
point releases.

### Pitfalls

- **`opacity: 0` elements are still sampled.** An invisible full-width overlay
  parked at the top will tint the status bar. Hide it with `display: none` (or
  `visibility: hidden` plus removal from the edge).
- A header that "looks" coloured because the page behind it is coloured has no
  `background-color` of its own, so sampling falls through to `<body>`. That is
  fine if they match — and breaks the moment you add dark mode.
- Elements with `backdrop-filter` sample as blurred/translucent; the resulting
  tint is not exactly your brand colour.
- `theme_color` in the manifest is **not** applied to home-screen apps as of
  26.1. The manifest value is still worth setting for Android.

## Recipes

### A. Solid coloured bar

```css
body {
  background: #f5f5f4;
}
header {
  position: sticky;
  top: 0;
  background: #f5f5f4;
  padding-top: env(safe-area-inset-top);
}
```

Both the sampled header and the body fallback are the same colour, so the tint
is correct whichever branch Safari takes.

### B. Blurred translucent bar

Give the status-bar strip its own blurred layer, so content scrolling under it
stays legible:

```css
body::before {
  content: "";
  position: fixed;
  inset: 0 0 auto 0;
  height: env(safe-area-inset-top);
  z-index: 1000;
  backdrop-filter: blur(12px);
  mask-image: linear-gradient(to bottom, #000 60%, transparent);
  pointer-events: none;
}
```

Source: Daniel Pietzsch. Note this element also becomes the sampling target —
which is usually what you want.

For a softer result, stack several `backdrop-filter` layers with increasing blur
radii and gradient masks (a "progressive blur") rather than one hard edge.

### C. Light and dark

Drive the real colours from `prefers-color-scheme` (that is what Safari 26
samples) and keep a `theme-color` media array for Chrome:

```css
body {
  background: #f5f5f4;
}
@media (prefers-color-scheme: dark) {
  body {
    background: #1c1917;
  }
}
```

```html
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f5f5f4" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1c1917" />
```

## macOS

For Safari browser tinting versus an installed Dock app's title-bar snapshot,
read [macos-add-to-dock.md](macos-add-to-dock.md). It records the Mac-specific
thresholds, settings and tested versions; do not apply iOS sampling thresholds
to Mac. Source: Joe Bell; Mac tinting sources in [sources.md](sources.md).

## Make the layout robust when the top inset is `0px`

`env(safe-area-inset-top)` is legitimately `0` on non-notched devices, often in
landscape, and was `0` in standalone throughout iOS 26.1 (WebKit 301994). So:

- Express bar height as `base + env(safe-area-inset-top)`, never as
  `env(safe-area-inset-top)` alone.
- Don't branch on `inset > 0` to decide "is this a modern iPhone".
- Check the design at inset `0px` (Safari on desktop, responsive design mode) as
  well as with a notch.

Source: Joe Bell.

Version-specific behaviour: [ios-26-notes.md](ios-26-notes.md). Credits:
[sources.md](sources.md).
