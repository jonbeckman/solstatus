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

## Safari 26 colour sampling

Safari 26 does not honour `<meta name="theme-color">` for the status bar above
the page or the address bar below it (Safari's default bottom tab layout). It
colours each bar from the page, and WebKit's source states the rule. For the top
and bottom edges separately:

1. Hit-test one point: the horizontal centre of the edge, 4px inside it. Only
   `position: fixed` and `position: sticky` elements and their contents are
   hit; other page content, including `absolute` elements outside them, never
   is. CSS `pointer-events` is ignored, except in the retry in item 9.
2. Walk up from the hit element to the first fixed or sticky ancestor (or the
   element itself) that qualifies. Nothing beneath the hit element is
   considered, so a narrow fixed element at the centre point hides a
   qualifying one below it. `opacity` below 0.1, `visibility: hidden`, and
   elements with no background, no `backdrop-filter` and no children are
   skipped; an empty `::before` or `::after` counts as a child, and empty
   images, video, canvas and iframes are not skipped either.
3. A qualifying element spans at least 90% of the viewport width, measured
   after 4px is trimmed from each side (about 347px of a 393px viewport).
4. Its `background-color` is used when its border box is more than 10px in
   both dimensions. A smaller one is sampled from a 2px strip 4–6px inside the
   edge, so an edge bar needs to be about 6px deep to count. The element's own
   `opacity` is not applied to the colour; below 0.1 it is skipped instead.
5. A colour with alpha below 0.75 is blended over the page background colour —
   not over the pixels actually beneath it. So is a dimming layer: a fixed
   element covering at least 90% of the viewport both ways, with a translucent
   background and no children.
6. With nothing qualifying, Safari paints no tint: page content scrolls
   visibly under the status bar and the address bar. The page background —
   `<body>`'s `background-color` (it won over `<html>`'s with both set);
   `<html>`'s, then white or black, when `<body>` is transparent — shows only
   where there is no document under the bar: above it at scroll 0, below it at
   the end of the page, and in overscroll. "Page background" elsewhere in this
   file means this fallback; those results came from plain or short pages,
   where content and body colour matched. A short page that never scrolls
   under a bar keeps that bar the page background, which is why an absolute
   dim (item 1) leaves both bars undimmed. Source: Joe Bell (iOS Simulator
   26.5 23F77, 2026-10-15; Simulator only); Kevin Clark's demo, in
   [sources.md](sources.md).
7. A full-viewport overlay keeps the edge's existing colour when one is already
   set. A dialog opened over a page whose sticky header tints the top leaves
   the status bar at the header's colour above the dimmed page.
8. A `::backdrop` (native `<dialog>`, popover) counts as a dimming layer.
9. A skipped element still ends the search, because nothing beneath the hit
   element is considered. An empty full-screen fixed layer above the dim
   therefore leaves each bar the colour it already had: the page background if
   the layer and the dim appear together, the dim if the layer arrives later.
   The exception is a `pointer-events: none` layer, which makes Safari retry
   honouring `pointer-events`; the retry reaches the dim only if the dim takes
   pointer events.
10. `viewport-fit=cover` is not needed: the address bar took the dim without
    it.

Source: WebKit `LocalFrameView::fixedContainerEdges`; Joe Bell (iOS Simulator
26.5 23F77 and 27.0 24A434, 2026-09-22; verified iPhone 17 Pro, iOS 27.0,
2026-09-23); the `<html>` fallback chain from Fiquitiva and Nasedkin, in
[sources.md](sources.md). Earlier community measurements (Frain; Fiquitiva;
Larionov) found the same shape; their ~80% width, ~3px height, "`opacity: 0`
is still sampled" and "the bottom tint needs `viewport-fit=cover`" claims do
not match the source or these runs. On an iPhone 17 Pro
with iOS 27.0 these matched the Simulator: the fixed/absolute split, width
(92% used, 80% not), depth (6px used, 4px ignored), the centred pill, a fixed
dim over a sticky header (item 7), a native `<dialog>` on a plain page, and
the opacity and `pointer-events` cases. A native `<dialog>` over a sticky
header kept the header's colour in the Simulator, as items 7 and 8 predict,
but was not tried on the device. No iOS 26 device was checked.

### Pitfalls

- **Paint dims with `position: fixed`.** An absolutely positioned backdrop is
  never hit, however large, so both bars stay at the page background above a
  dimmed page.
- **Keep narrow fixed UI off the centre of an edge.** A floating toolbar, a
  toast or a framework dev toolbar fixed at `bottom: 0` takes that bar over
  and leaves it at the page background. Raise it at least 4px or keep it off
  the centre line.
- **An empty full-screen fixed layer above a dim hides it** (item 9). A
  transparent press-target backdrop over a separately painted dim, a portal
  root or a toast container all qualify. Give the layer an empty
  pseudo-element (`::after { content: "" }`) so Safari samples the pixels
  under it, which are the dim, or give it no size.
- **Sticky headers keep the status bar colour when a dialog opens** (item 7).
  While the dialog is open, show a full-width fixed strip at the top edge, more
  than 10px deep (24px tested), with the dim's background: it is an ordinary
  candidate, so it replaces the stored colour. The status bar then shows the dim
  over the page background, not over the header; give the strip the header colour with the
  dim already applied, opaque, if the two must match.
- **A full-screen fixed gradient turns both bars solid.** A decorative
  `position: fixed; inset: 0` layer painted with `background-image` has a
  transparent `background-color`, so it is hit and blended over the page
  background (item 5): both bars become the page background colour and the
  gradient never reaches them. This is the usual cause of "my gradient doesn't
  reach the bars". Put full-width fixed edge strips above it (recipe E).
  Source: Joe Bell (iOS Simulator 26.5 23F77, 2026-10-15; Simulator only).
- **Different `<html>` and `<body>` backgrounds leave a hairline.** A 1px line
  of the `<html>` colour showed at the document's bottom edge at the end of
  the page and mid-bounce. Colouring only `<body>` removed it. Source: Joe Bell
  (iOS Simulator 26.5 23F77, 2026-10-15; Simulator only).
- **An edge strip revealed only at the end of the page sticks.** A bottom strip
  faded in by scroll (opacity 0 → 1) or translated in from off-screen fixed
  the end of the page, but once it had been sampled the address bar kept its
  colour mid-page and content no longer showed under it. The opacity case is
  item 9 (below 0.1 the strip is skipped and ends the search); the translated
  strip is no longer hit at all, yet the bar kept the colour. Keep the strip
  in place from the start and change its colour instead (recipe E). Source:
  Joe Bell (iOS Simulator 26.5 23F77, 2026-10-15; Simulator only).
- `display: none` remains the safe way to park an overlay. `opacity` below 0.1
  and `visibility: hidden` are skipped in the source, and `opacity: 0.05` was
  skipped on iOS 27.0, but Frain observed `opacity: 0` sampled earlier in 26.x.
- A header that "looks" coloured because the page behind it is coloured has no
  `background-color` of its own, so sampling falls through to `<body>`. That is
  fine if they match — and breaks the moment you add dark mode.
- Elements with `backdrop-filter` are reported to Safari as multiple colours,
  so the tint is not exactly your brand colour.
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
.status-blur {
  position: fixed;
  inset: 0 0 auto 0;
  height: env(safe-area-inset-top);
  z-index: 1000;
  backdrop-filter: blur(12px);
  mask-image: linear-gradient(to bottom, #000 60%, transparent);
  pointer-events: none;
}
```

```html
<div class="status-blur" aria-hidden="true"></div>
```

Source: Daniel Pietzsch, who used `body::before`. Use a real element: a fixed
full-width `body::before` or `::after` strip was not sampled, and the bar fell
back to the page background, while a `<div>` with identical CSS was sampled.
A pseudo-element on an element that is itself fixed was not tried. Source:
Joe Bell (iOS Simulator 26.5 23F77, 2026-10-15; Simulator only).

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

### D. A dim that reaches the status bar and address bar

The page viewport stops short of the screen in a Safari tab — 714pt of 874 on
an iPhone 17 Pro — and the status bar above it and the address bar below it are
Safari's. A dialog's dim only reaches them through edge sampling, so it has to
be the element sampling finds:

```css
.dim {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.2);
}
```

- `position: fixed`, never `absolute`: an absolute dim, however tall, dims the
  page and leaves both bars at the page background.
- `inset: 0` alone sizes it; `min-height: 100dvh` or a page-height variable
  adds nothing to the bars.
- Nothing narrower than 90% fixed on the centre of either edge above it, and no
  empty full-screen fixed layer above it; if one has to stay, give it an empty
  `::after`.
- `viewport-fit=cover` makes no difference to either bar.
- A page whose sticky header already tints the top keeps that tint: add the
  edge strip from Pitfalls while the dialog is open.
- Fades work, but the bars do not fade with them: sampling ignores `opacity`
  from 0.1 up, so each bar switches colour as the fade crosses 0.1.

Source: WebKit; Joe Bell (iOS Simulator 26.5 23F77 and 27.0 24A434,
2026-09-22; verified iPhone 17 Pro, iOS 27.0, 2026-09-23), in
[sources.md](sources.md).

### E. Scroll-changing top and bottom colours over a fixed background

A fixed full-screen background never reaches the bars by itself (Pitfalls).
Put a full-width fixed strip at each edge, coloured from registered custom
properties that a scroll-driven animation changes; Safari samples the strips,
so both bars follow the scroll with no JavaScript:

```html
<style>
  @property --top    { syntax: "<color>"; inherits: true; initial-value: #c98a5a; }
  @property --bottom { syntax: "<color>"; inherits: true; initial-value: #b4603a; }
  @keyframes edges {
    0%   { --top: #c98a5a; --bottom: #b4603a; }
    50%  { --top: #b4603a; --bottom: #6e2a24; }
    100% { --top: #6e2a24; --bottom: #2a1512; }
  }
  :root {
    --edge-top: max(12px, env(safe-area-inset-top));
    --edge-bottom: max(12px, env(safe-area-inset-bottom));
    --fade: 96px;
    --gutter: calc(var(--fade) / 0.75);
    animation: edges linear both;
    animation-timeline: scroll(root);
  }
  body { margin: 0; background-color: var(--bottom); }
  .scene { position: fixed; inset: 0; background: linear-gradient(var(--top), var(--bottom)); }
  .edge, .fade { position: fixed; left: 0; right: 0; z-index: 10; pointer-events: none; }
  .edge-top    { top: 0;    height: var(--edge-top);    background-color: var(--top); }
  .edge-bottom { bottom: 0; height: var(--edge-bottom); background-color: var(--bottom); }
  .fade { height: var(--fade); }
  .fade-top    { top: var(--edge-top);       background: linear-gradient(var(--top), transparent); }
  .fade-bottom { bottom: var(--edge-bottom); background: linear-gradient(transparent, var(--bottom)); }
  main { position: relative; padding: calc(var(--edge-top) + var(--gutter)) 24px calc(var(--edge-bottom) + var(--gutter)); }
</style>
<div class="scene" aria-hidden="true"></div>
<div class="edge edge-top" aria-hidden="true"></div>
<div class="fade fade-top" aria-hidden="true"></div>
<div class="fade fade-bottom" aria-hidden="true"></div>
<div class="edge edge-bottom" aria-hidden="true"></div>
<main>…</main>
```

- The strips are what Safari samples: they sit above `.scene` at both edge
  centres, are more than 10px deep, and use an opaque `background-color`.
- Each fade starts where its strip ends, so the hit point 4px inside the edge
  lands on the strip, never on a gradient with a transparent
  `background-color`.
- Only `<body>` is coloured, which avoids the `<html>` hairline, and its colour
  tracks the bottom strip so overscroll at the bottom matches. Overscroll at
  the top shows the same `--bottom` colour above the document (item 6), not
  `--top`; top overscroll was not tested.
- The strips stay in place for the whole scroll; only their colour changes.
- Updating `--top` and `--bottom` from a registered `@property` with
  `animation-timeline: scroll(root)` changed both bars in the Simulator and on an iPhone 17 with iOS 27.0.1.
- On fast flings the status bar can keep the previous colour for a frame or
  two while the strip has moved on, leaving a faint edge; still open in
  [ios-26-notes.md](ios-26-notes.md).

Design preference, not platform behaviour: the fades soften where content is
cut off under each strip. On an iPhone 17 a linear 96px fade read best, against
in-out-quad (54, 72 and 96px), in-out-cubic (96px) and out-cubic (54px). The
content gutter is the fade divided by 0.75, so the fade covers three quarters
of it and never sits over text at rest.

Source: Joe Bell and Josh Puckett, from Puckett's edge-strip technique and demo, with the fade suggested by Joe Bell; Joe Bell (iOS Simulator 26.5 23F77, 2026-10-15; iPhone 17, iOS 27.0.1, Safari tab, 2026-10-15), in [sources.md](sources.md).

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
