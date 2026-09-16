# Install UX on iOS and macOS

## The flow

There is no install prompt on iOS. The user must:

1. Open the site in **Safari** — this is the Safari flow; Chrome and Firefox on
   iOS have their own menus (see below), in-app browsers can't install at all.
2. Tap the Share button.
3. Scroll to **Add to Home Screen**.
4. Confirm.

On iOS 26 any site added this way opens as a web app by default, and there is a
per-site "Open as Web App" toggle in the Share sheet / site settings that the
user can turn off. So you get standalone mode more often than before — but the
user can also opt out of it, and your layout has to survive both.

`beforeinstallprompt` does not exist on iOS. Anything you show is a _hint_
pointing at the Share sheet, not a button that installs.

## Gating rules

A hint that appears on first paint for everyone is spam. Show it only when all
of these hold:

- The browser is Safari on iOS. Chrome and Firefox on iOS have been able to add
  to the Home Screen since iOS 16.4, but their menus differ from Safari's, so
  Safari-specific copy would be wrong there — which is why the snippet below
  targets Safari only. Broaden it only if you also write per-browser copy.
  In-app browsers (Facebook, Instagram, Google) can't install at all.
- The app is not already running standalone.
- The user has shown engagement — a second visit, or a meaningful interaction on
  this one.
- They haven't dismissed it before (persist that forever, not per-session).

```js
let installHintVisitRecorded = false;

function recordInstallHintVisit() {
  // Call once when a new top-level document loads. The guard also protects
  // against duplicate initialization within that document.
  if (installHintVisitRecorded) return;
  installHintVisitRecorded = true;

  const visits = Number(localStorage.getItem("install-hint-visits") ?? "0");
  localStorage.setItem("install-hint-visits", String(visits + 1));
}

function shouldShowInstallHint({ meaningfulInteraction = false } = {}) {
  const ua = navigator.userAgent;

  // iPadOS reports a desktop UA, so fall back to touch points.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!isIOS) return false;

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (isStandalone) return false;

  // Safari only: in-app browsers can't install at all, and Chrome/Firefox
  // reach Add to Home Screen through a different menu than the copy describes.
  if (/CriOS|FxiOS|GSA|FBAN|FBAV|Instagram/.test(ua)) return false;

  if (localStorage.getItem("install-hint-dismissed") === "1") return false;

  const visits = Number(localStorage.getItem("install-hint-visits") ?? "0");
  return visits >= 2 || meaningfulInteraction;
}

function dismissInstallHint() {
  localStorage.setItem("install-hint-dismissed", "1");
}
```

Here, one visit means one new top-level document load, including a reload.
Same-document navigation, such as SPA route changes, does not count as a new
visit in this recipe. Call `recordInstallHintVisit()` during page startup
**before** the first `shouldShowInstallHint()` check. Keep recording separate
from rendering and eligibility checks. The in-memory guard makes duplicate
startup calls in the same document harmless. The visit count persists across
browser sessions, while dismissal remains permanent. Pass
`meaningfulInteraction: true` only for a deliberate action your product already
treats as engagement.

Engagement and persisted dismissal are product defaults for this recipe. Source:
community skills, in [sources.md](sources.md).

## Copy

Say what they get, then how, in that order. Illustrate the Share glyph rather
than describing it.

- "Add this to your Home Screen for a full-screen, app-like version. Tap Share,
  then Add to Home Screen."
- Avoid the word "install" — nothing is installed, and iOS users don't expect a
  website to install anything.
- Give it an obvious dismiss control, and honour it permanently.

## Storage & state

- **A standalone app has its own cookie and storage jar,** but Safari copies the
  site's cookies into it **once** at install (verified on iOS 26.6 by Joe Bell;
  also reported by fozzedout) — a user signed in in Safari launches the
  installed app signed _in_, and the jars diverge from there. Other storage
  (localStorage, IndexedDB) is not copied. If the existing authentication uses
  cookies, account continuity may benefit; this is not a reason to change an
  application's authentication architecture.
- iOS evicts standalone app state, and suspended apps get killed. Browser
  storage is best-effort, so restore recoverable UI state (scroll position,
  draft input, filter state) from existing persistent storage on launch, and
  save irreplaceable state to the server. Source: WebKit storage policy.

## Navigation without browser chrome

Standalone mode removes Safari's Back button. Provide an in-app Back or close
control wherever a user can navigate away from the entry screen. The iOS edge
swipe only goes back after the app has built in-app history; it cannot replace
that control. Source: fozzedout.

An out-of-scope link opened from the standalone app appears in an in-app browser
with a **Done** control. Do not add a redundant app-level close control to that
browser-owned surface. Source: Firtman.

- **External links never open the installed app on iOS** — there is no deep-link
  association, so a link from Mail or Messages opens Safari. `scope` only
  decides whether navigations _inside_ the app stay in the app or hand off to
  the in-app browser. Source: Firtman (behaviour since iOS 12.2).

## macOS

For the Add to Dock flow, install hints, account continuity and navigation
controls, read [macos-add-to-dock.md](macos-add-to-dock.md). Use that
platform-specific guidance for a Mac target.

Credits: [sources.md](sources.md).
