# Startup ("splash") images on iOS

## How iOS picks one

Startup images are an iOS/iPadOS feature. macOS Dock web apps have no launch
image concept — there is nothing to generate for them.

Startup images use `<link rel="apple-touch-startup-image">` elements with
media queries for the device and orientation. Do not assume that iOS
re-evaluates appearance on every launch: WebKit bug 259328 reports that an
installation keeps its original light or dark startup image after system
appearance changes, in both directions. This establishes reported persistence,
not the internal selection algorithm or behavior on every iOS release.
Source: Stephen, [WebKit 259328](https://bugs.webkit.org/show_bug.cgi?id=259328).

Provide an image whose media conditions match the target device and orientation,
with raster dimensions matching the launch window. The web.dev PWA guide
requires exact window sizing and describes a white launch screen when no image
covers the user's context. Do not rely on an unmatched entry as a fallback;
verify the actual launch on the supported iOS build. Source: web.dev,
[Enhancements](https://web.dev/learn/pwa/enhancements).

Requirements:

- `apple-mobile-web-app-capable` must be `yes`. Without it, no startup image is
  shown at all — this is the single most common cause of "splash screens
  stopped working" after a framework upgrade.
- The links must be in the HTML of the page that was added to the home screen.
- The images must be fetchable **without cookies** (see below).

## Link template

```html
<link
  rel="apple-touch-startup-image"
  href="/splash/{width}/{height}/{dpr}?v1"
  media="(device-width: {width}px) and (device-height: {height}px) and (-webkit-device-pixel-ratio: {dpr}) and (orientation: {portrait|landscape})"
/>
```

`{width}`/`{height}` are **CSS points** in the media query. For landscape
entries, swap them: a 393×852 device gets a portrait entry with
`device-width: 393px, device-height: 852px` and a landscape entry with
`device-width: 852px, device-height: 393px`.

## Pixel maths

Image pixel dimensions = CSS points × device pixel ratio.

| Device (points) | DPR | Portrait image | Landscape image |
| :-------------- | :-- | :------------- | :-------------- |
| 393 × 852       | 3   | 1179 × 2556    | 2556 × 1179     |
| 402 × 874       | 3   | 1206 × 2622    | 2622 × 1206     |
| 820 × 1180      | 2   | 1640 × 2360    | 2360 × 1640     |

Get this wrong and iOS either rejects the image or stretches it.

## Design rules

- Aim to match the app's first rendered background. A saved app theme can
  differ from the appearance used for the installed splash, so dual images
  cannot guarantee a seamless handover. Source: Joe Bell; Stephen, WebKit
  259328, in [sources.md](sources.md).
- Centre the mark/wordmark and keep it well inside the safe area. The status
  bar, notch, and home indicator all overlay the splash and vary per device.
- Decorative framing generally only works in portrait — in landscape it either
  crops or looks stretched. It's fine to render decoration portrait-only.
- Don't put text you'll want to translate or update frequently in the splash;
  it's cached hard.

## What has to exist

Three artefacts, all derived from **one device table** so they can never drift
apart. Source: Joe Bell.

1. **The image set.** For every unique `width × height @ dpr` triple in the
   table, portrait and landscape PNGs for each appearance, sized points × dpr.
   With the table in [ios-devices.md](ios-devices.md), one appearance needs
   22 × 2 = 44 images; separate light and dark sets need 22 × 2 × 2 = 88.
2. **The link list.** Two `<link rel="apple-touch-startup-image">` elements per
   triple per appearance, each carrying the four-clause media query above
   (device-width, device-height, `-webkit-device-pixel-ratio`, orientation) and a cache-bust
   query on the `href`. For separate light/dark sets, also include
   `(prefers-color-scheme: light)` or `(prefers-color-scheme: dark)` and use
   distinct image URLs.
3. **The device table itself**, as the single source of truth that both of the
   above are generated from. Adding a device should be a one-line edit that
   produces a new pair of images and links for each appearance.

Each image is the background colour plus a centred mark. Decoration beyond that
generally only works in portrait — see the design rules above.

Two neutral ways to produce the set:

- **Static export at build time** — render the PNGs into your output directory
  and commit or generate them during the build. Simple and trivially
  cacheable; the cost is a pile of binaries.
- **An image endpoint** — serve `/splash/{width}/{height}/{dpr}`, rendering per
  size, prerendered or cached at the edge. Nothing binary enters the repo and
  new sizes need no rebuild of assets; the cost is a rendering path to keep
  working. Whichever you choose, validate the requested size against the device
  table so an unknown triple fails loudly instead of returning a blank image.

## Saved app themes

A `localStorage` override or `data-theme` attribute controls app rendering;
it is not itself a startup-image media feature. Setting the page's
`color-scheme` through CSS or a meta tag is not a documented way to override
its `prefers-color-scheme` queries. The CSSWG proposal to make the meta tag
change that query was retracted. Do not recommend this as a saved-theme splash
fix without an installed-device test. Source: CSSWG,
[issue 10249](https://github.com/w3c/csswg-drafts/issues/10249).

Default to preserving an existing light/dark set: it can match the system
appearance at installation, even though later theme changes can leave a
mismatch. For a new app with no startup artwork, start with one neutral set
unless matching installation appearance is a product requirement. This is a
design recommendation, not a verified cache workaround. Source: Joe Bell,
editorial design guidance in [sources.md](sources.md).

A neutral image set without an appearance clause avoids selecting different
artwork for light and dark. It is a design tradeoff: it may match neither app
background exactly, and branding changes can still leave stale artwork. It
does not track the saved theme. Source: Joe Bell, editorial design guidance in
[sources.md](sources.md).

## Cache busting

Treat startup artwork as persistent per Home Screen entry. Version image URLs
when artwork changes; a new URL identifies a new asset, but does not prove an
existing installation will replace its startup image. Remove and re-add is the
refresh procedure retained from production experience. Source: Joe Bell, in
[sources.md](sources.md).

### Open questions

The following have not been verified by this skill's device tests:

- Whether a synchronous script inserting only the saved theme's links, or
  rewriting their media attributes before installation, affects selection.
- Whether an installed-page reload, manifest change or versioned startup URL
  refreshes the installed image without reinstalling.
- Whether an OS update re-evaluates selection for an existing entry.

Keep these separate from the reported appearance persistence. Test each change
on its own installation and record the exact OS build and date before promoting
it to guidance. Source: Joe Bell, investigation scope in [sources.md](sources.md).

## Verification

- View the deployed HTML and count the emitted `apple-touch-startup-image`
  links: the total must equal unique triples × 2 orientations × appearance count.
- `curl -I` one image URL with **no cookies**: it must return `200` and
  `content-type: image/png`. A redirect to a sign-in page means the splash will
  silently never appear for signed-out installs.
- Add to home screen, kill the app, cold-launch, and watch the handover.
- For appearance selection, install in light, switch to dark before the first
  launch, then cold-launch. Repeat with a launch before the switch, and repeat
  both tests in reverse. Record the startup image separately from app rendering.
- For refresh experiments, change one input per installed entry and record both
  image requests and visible startup frames. A successful fetch is not proof
  of a refreshed splash. Compare with a fresh install as a positive control.
  Testing an OS update requires preserving the same entry across that update;
  separate fresh installs on two runtimes do not establish invalidation.

Source for the appearance reproduction: Stephen, WebKit 259328; additional
controls are an unexecuted test plan, in [sources.md](sources.md).

## Gotchas

- **Device aliases produce duplicate links.** Device tables are usually keyed
  by model name, and many names share one triple (iPhone 13, 13 Pro, 14, 15 and
  16 are all 390×844@3). Iterating over names emits one `<link>` per name —
  easily 100 links for ~44 unique sizes. Deduplicate by `width × height @ dpr`
  before emitting.
- Landscape entries double the count; that part is unavoidable.
- New devices need a new row and generated assets/links. URL versioning does
  not guarantee that existing installs acquire the new set.
- Splash images are unrelated to the manifest — Android uses `background_color`
  - icon + `name` instead, and needs none of this.

Device sizes: [ios-devices.md](ios-devices.md). Credits: [sources.md](sources.md).
