---
name: apple-web-app
description: "Use when implementing, debugging, or auditing iPhone/iPad Add to Home Screen or macOS Safari Add to Dock web app UI: safe areas, status bar, theme colour, keyboard, manifest, icons, splash screens, or installed navigation. Not for service workers, offline caching, or push."
metadata:
  source: hand-maintained by Joe Bell; derived from a production home-screen web app plus credited external sources
  reviewed: "2026-09-04 against iOS 26.x, macOS 26 / Safari 26"
  upstream: "https://github.com/joe-bell/skills/tree/main/skills/apple-web-app"
  version: "2026-09-15.2"
---

# Apple web app UI

## Choose the scope

Use this skill for installed iOS/iPadOS home-screen apps and macOS Safari Add to
Dock UI. Service workers, offline caching, background sync and push
implementation belong elsewhere.

Infer the platform, requested outcome and existing architecture from the task
and project. Ask only when a missing detail materially changes the solution.
Apply guidance relevant to that platform and symptom. Preserve working layout,
authentication and product choices unless they cause the requested issue. User
instructions take precedence over this skill's defaults.

- **Implement or debug:** read the matching reference, make the focused change,
  and check its affected behavior and likely regressions.
- **Audit:** use the
  [conformance checklist](references/conformance-checklist.md) for all
  applicable recommendations. Report findings before modifying the site unless
  the user has also asked for fixes.
- **Maintain this skill:** follow [maintenance.md](references/maintenance.md).
  Ordinary site work does not require a skill update or upstream handoff.

## Read only relevant references

| Platform or problem                                            | Reference                                                                                                                             |
| :------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| Mac Dock icons, title bar, display mode, navigation or storage | [macos-add-to-dock.md](references/macos-add-to-dock.md)                                                                               |
| iOS head tags, manifest integration or icons                   | [head-and-icons.md](references/head-and-icons.md)                                                                                     |
| iOS safe areas, scroll roots, cold launch or touch styling     | [layout-and-touch.md](references/layout-and-touch.md)                                                                                 |
| iOS status bar, tint or light/dark appearance                  | [theme-color-and-status-bar.md](references/theme-color-and-status-bar.md)                                                             |
| iOS overlays, keyboard or scroll locking                       | [overlays-and-keyboard.md](references/overlays-and-keyboard.md)                                                                       |
| iOS startup images                                             | [splash-screens.md](references/splash-screens.md); read [ios-devices.md](references/ios-devices.md) when generating or checking sizes |
| Install hints, installed navigation or storage continuity      | [install-ux.md](references/install-ux.md)                                                                                             |
| A suspected iOS release regression                             | [ios-26-notes.md](references/ios-26-notes.md)                                                                                         |
| Translating a relevant recipe into existing Tailwind v4 code   | [tailwind-css-v4.md](references/tailwind-css-v4.md)                                                                                   |

A Mac-only task starts with the Mac reference. Do not generate iOS startup
images or add iOS safe-area work for it. Source: WebKit; Joe Bell, as recorded
in [macos-add-to-dock.md](references/macos-add-to-dock.md).

## Essential constraints and evidence

- A zero safe-area inset is valid. Keep controls usable without assuming a
  positive top inset; never hide an app waiting for one. Source: Joe Bell;
  WebKit 301994, in [sources.md](references/sources.md).
- Preserve pinch zoom and text selection. Scope touch suppression to controls or
  media with an intentional replacement interaction. Source: Firtman; React
  Spectrum, in [sources.md](references/sources.md).
- Installed apps that hide browser controls need usable navigation back or out.
  Source: Firtman; Steiner, in [install-ux.md](references/install-ux.md).

Treat documented behavior, device observations, community workarounds and
optional design preferences distinctly. Apply a version-specific workaround only
when its symptom and environment match. A reported fix or bug status is
historical evidence, not a guarantee for every later release. Read the cited
source or recheck the target build when a changing fact determines the fix.
Preserve existing test dates; do not relabel inherited findings as newly tested.
Source provenance and retained observations:
[sources.md](references/sources.md).

## Verify the requested outcome

Use relevant entries from the
[conformance checklist](references/conformance-checklist.md). Check generated
HTML, CSS, image dimensions and unauthenticated asset delivery where applicable.
Device-specific appearance needs observation on the target installed app on a
real device. Simulator or desktop emulation alone does not establish safe-area
timing, status-bar sampling or splash selection. Source: Joe Bell, in
[sources.md](references/sources.md).

When hardware or authenticated runtime access is unavailable, complete the
independent checks and mark the remaining claims **Unverified**. State what was
checked, what failed, and the specific remaining device check. Do not expand a
focused fix into a full device matrix. Stop after the relevant checks pass
unless a failure or new change warrants more verification.
