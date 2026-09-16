# Head tags and icons

For iOS/iPadOS installation metadata and icon delivery. For a Mac-only task, use
[macos-add-to-dock.md](macos-add-to-dock.md) instead.

## Head tags & manifest

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Your App" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#f5f5f4" />
<link rel="apple-touch-icon" href="/apple-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```

This example targets an iOS edge-to-edge app; preserve the existing display and
status-bar choices unless the requested change needs another mode.

Rules:

- **Startup images require the `apple-` prefixed capable tag.** The unprefixed
  `mobile-web-app-capable` does not enable startup images; Safari only shows
  them when `apple-mobile-web-app-capable` is present. Frameworks that emit only
  the standard tag will silently kill your splash screens — check the rendered
  HTML, not your source. Source: Firtman; see [sources.md](sources.md) for a
  documented case.
- **The home-screen label** comes from the manifest `short_name` (then `name`)
  since iOS 11.3. `apple-mobile-web-app-title` still wins on older versions and
  is a useful fallback when those versions are supported. Source: Firtman.
- **iOS ignores much of the manifest**: `background_color`, `orientation`,
  `maskable` icons, and (as of 26.1) `theme_color` for home-screen apps. Use CSS
  and the applicable `apple-*` tags; not every manifest field has an Apple
  equivalent. Source: Firtman.
- **iOS only accepts PNG icons.** SVG and WebP manifest icons are skipped.
- The three `apple-mobile-web-app-*` metas are iOS-only: no documented effect on
  macOS, and harmless to leave in place. Source: WebKit blog.
- iOS 26 opens any site added to the Home Screen as a web app (there is now a
  per-site "Open as Web App" toggle), so sites that never opted in can suddenly
  find themselves in standalone mode. The manifest is still honoured for
  `display`, `start_url`, `name` and icons. Source: WebKit blog; Firtman.

## Manifest choices

When a manifest is part of the product, preserve its intended `name`,
`short_name`, `start_url`, `scope`, `id` and display mode. `standalone` is a
common app choice, not an audit requirement for every site. Set intentional
`background_color` and `theme_color` values for supporting browsers; use the
actual first-rendered body background as the splash design target. A cached
startup image may differ after a theme change; see
[splash-screens.md](splash-screens.md). Source: community skills; Firtman;
Joe Bell; Stephen, WebKit 259328, in [sources.md](sources.md).

## Icons

- `apple-touch-icon`: one **180×180 opaque square PNG**. iOS applies its own
  mask and shadow — don't pre-round it, and don't ship transparency (it
  composites on black).
- Manifest icons: PNG, at minimum 192 and 512, `purpose: "any"`. Add a separate
  `purpose: "maskable"` icon with safe-zone padding for Android; iOS ignores it.
- Preferred asset workflow: render sizes from **one vector mark at build time**
  onto an opaque background, rather than hand-exporting each. One artwork source
  means the sizes can never drift apart.
- Keep icon and splash artwork visually consistent. Aim to match the splash
  to the first-rendered `<body>` background, while allowing for the saved-theme
  and cache limitations in [splash-screens.md](splash-screens.md).
  Source: Joe Bell; Stephen, WebKit 259328, in [sources.md](sources.md).
- Icons are fetched **without cookies**. If they 302 to a sign-in page, iOS
  falls back to a screenshot of the page. Source: Joe Bell.
- iOS caches icons per home-screen entry: after changing one you must remove and
  re-add the app to see the new artwork.

For Mac icon configuration and observed format selection, use
[macos-add-to-dock.md](macos-add-to-dock.md).

Source: Firtman; Joe Bell; Apple Developer Forums 738535. Full attribution:
[sources.md](sources.md).
