# Overlays, modals & the keyboard on iOS

## Why this is hard

iOS 26 clips `position: fixed` to the **inner** viewport rather than the layout
viewport. A backdrop that used to cover everything now covers only the visible
window, and reveals page content as soon as the user scrolls or the keyboard
resizes the viewport. Adobe's React Spectrum worked out a portable fix (PR
#8888, follow-up #8922); MUI hit the same problem (#46953). What follows is that
approach, generalised.

## 1. Page dimensions as custom properties

```js
function syncPageSize() {
  const el = document.scrollingElement ?? document.documentElement;
  document.documentElement.style.setProperty("--page-width", `${el.scrollWidth}px`);
  document.documentElement.style.setProperty("--page-height", `${el.scrollHeight}px`);
}
```

`startOverlayViewportSync()` below calls this on open and window resize. Call it
separately after content changes that alter page height.

## 2. Visual viewport height

```js
const nonTextInputTypes = new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset",
]);

function willOpenKeyboard(element) {
  return (
    (element instanceof HTMLInputElement &&
      !nonTextInputTypes.has(element.type)) ||
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
}

function syncViewport() {
  const vv = window.visualViewport;
  if (!vv || vv.scale > 1) return;
  // Multiplying by scale converts visual pixels back to layout pixels.
  const height = vv.height * vv.scale;
  document.documentElement.style.setProperty(
    "--visual-viewport-height",
    `${height}px`,
  );
}

function syncLayoutViewportHeight() {
  const height = document.documentElement.clientHeight;
  document.documentElement.style.setProperty(
    "--visual-viewport-height",
    `${height}px`,
  );
}

function startOverlayViewportSync() {
  const vv = window.visualViewport;
  let blurFrame;

  const handleBlur = (event) => {
    if (window.visualViewport?.scale > 1) return;
    if (!willOpenKeyboard(event.target)) return;
    if (blurFrame !== undefined) cancelAnimationFrame(blurFrame);
    blurFrame = requestAnimationFrame(() => {
      blurFrame = undefined;
      if (!willOpenKeyboard(document.activeElement)) {
        syncLayoutViewportHeight();
      }
    });
  };
  const handleWindowResize = () => {
    syncPageSize();
    if (!vv) syncLayoutViewportHeight();
  };

  syncPageSize();
  if (vv && vv.scale <= 1) syncViewport();
  else if (!vv) syncLayoutViewportHeight();

  vv?.addEventListener("resize", syncViewport);
  vv?.addEventListener("scroll", syncViewport);
  window.addEventListener("resize", handleWindowResize);
  window.addEventListener("blur", handleBlur, true);

  return () => {
    vv?.removeEventListener("resize", syncViewport);
    vv?.removeEventListener("scroll", syncViewport);
    window.removeEventListener("resize", handleWindowResize);
    window.removeEventListener("blur", handleBlur, true);
    if (blurFrame !== undefined) cancelAnimationFrame(blurFrame);
  };
}
```

`blur` fires before the keyboard-dismiss animation finishes. If its target would
have opened the keyboard, wait one frame to see whether focus moves to another
keyboard-opening element; if it does not, set the layout viewport height early
rather than wait for `visualViewport`'s resize. Both paths ignore updates while
`visualViewport.scale > 1`, so a pinch-zoomed dialog does not chase the user.
Call `startOverlayViewportSync()` when the first overlay opens and call its
returned cleanup function when the last overlay closes. Call `syncPageSize()`
after an open overlay's content changes its page dimensions. Source: React
Spectrum; listener lifecycle adapted during this repository's snippet review.

## 3. Backdrop: absolute, page-sized

```css
.backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--page-width, 100%);
  height: var(--page-height, 100%);
  isolation: isolate;
}
```

## 4. Dialog: sticky, centred on the visual viewport

```css
.dialog {
  position: sticky;
  top: calc(var(--visual-viewport-height, 100vh) / 2);
  transform: translateY(-50%);
  max-height: calc(var(--visual-viewport-height, 100vh) - 2rem);
}
```

Sticky positioning inside the absolutely-sized backdrop tracks scrolling without
relying on `fixed`.

## 5. Scroll locking

Inject the rule from a `<style>` element so it is in the cascade before any
`touchstart`:

```js
const style = document.createElement("style");
style.textContent = "@layer { * { overscroll-behavior: contain } }";
document.head.prepend(style);
```

Prepending the `<style>` makes its anonymous `@layer` the first (and therefore
lowest-precedence) layer, so page styles still win where they matter. Remove the
element when the last overlay closes. Source: React Spectrum.

## 6. `touchmove` prevention

If you also prevent `touchmove` to stop background scroll, let these through:

- `event.touches.length > 1` — two-finger pinch-zoom must keep working.
- Drags that start inside a text input, `contenteditable`, or a `range` input
  (text selection and slider dragging both arrive as `touchmove`).
- Anything inside a scrollable region of the dialog itself.

## 7. Focus without scroll jumps

```js
element.focus({ preventScroll: true });
```

Then scroll it into view yourself once `--visual-viewport-height` reflects the
keyboard. Letting the browser do it produces a scrolled-and-clipped layout,
because the browser scrolls the _layout_ viewport.

## 8. Fullscreen takeovers

For a sheet or lightbox that should cover everything, add
`padding-bottom: 100vh` to the scroll container. It guarantees the surface
extends past the inner viewport no matter how the browser clips.

## 9. Container queries for dialog breakpoints

Size dialog internals with `@container`, not media queries: the dialog's own
width, not the viewport's, is what determines its layout, and the visual
viewport changes under it when the keyboard appears.

## 10. `isolation: isolate`

Put it on the backdrop and on your scroll root. Stacking contexts around sticky
bars, `backdrop-filter` and portals are otherwise unpredictable.

## iOS 26.0-only bugs

- A fully opaque fixed overlay may not fill the viewport; `opacity: 0.99` fixes
  it (Lunardi).
- `100dvh` leaves a bottom gap (Apple forums 800798/803987); fixed in Safari
  26.1 (radar 158055568).

## Lightbox notes

For a photo lightbox or any full-bleed media takeover:

- Pad the toolbar/close button with `env(safe-area-inset-top)` so it clears the
  notch, and captions with `env(safe-area-inset-bottom)` so they clear the home
  indicator. Most lightbox libraries hardcode a flat padding — override it.
  Source: Joe Bell.
- Set `-webkit-touch-callout: none` on the image, otherwise a long press opens
  the system save/share sheet instead of your own gesture.
- Drop drop-shadow filters on toolbar buttons if they sit over a blurred
  surface; on iOS they cost a lot of compositing for little effect.
- Check the library's own full-screen container against the 26.0 opaque-fixed
  bug above.

Credits: [sources.md](sources.md).
