# Apple web app conformance checklist

Choose **full audit** for a requested assessment of the installed experience,
or **focused change** for a named fix. Infer targets from the project and user:
iPhone/iPad Home Screen, Mac Add to Dock, or both. Record known versions and
available evidence; unknown versions do not block independent checks.

Read only the relevant rows and recipes. A focused check includes prerequisites
that affect that behavior, such as the Apple capable tag for startup images.
An audit reports findings before edits unless the user also requested fixes.

## Record results

Use **Pass**, **Fail**, **Not applicable**, or **Unverified** for each selected
check. Record evidence and the reason for exclusions or unknowns. Separate
static and device outcomes: a correct image response can pass delivery while
its installed appearance remains unverified. Supplied evidence should be
labelled as supplied, not independently observed.

For device observations, record platform, OS build, Safari version and date;
include window mode, orientation or default browser when relevant. If hardware
or access is unavailable, continue static/source checks and mark only the
remaining device outcomes Unverified. Do not infer an iPhone result from Mac
or desktop emulation. Source: Joe Bell, [sources.md](sources.md).

## Installation and assets

| Check                 | Applies when                                          | Observable pass condition                                                                                                 | Evidence needed                                                                          | Source: recipe and provenance                                                                             |
| :-------------------- | :---------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| Installation metadata | iOS installation metadata is in audit or change scope | Rendered tags and manifest express the intended name and display mode; startup images have the Apple capable tag          | Rendered HTML and manifest; installed name/mode checked separately                       | [Head and icons](head-and-icons.md); Firtman, WebKit                                                      |
| Asset delivery        | Referenced manifest, icons or startup images          | Anonymous requests return the expected content, not sign-in redirects or HTML errors                                      | HTTP status, content type and content inspection for relevant URLs                       | [Head and icons](head-and-icons.md), [splash screens](splash-screens.md); Joe Bell                        |
| Icon configuration    | Installed icon support                                | iOS has an opaque 180px PNG touch icon; Mac uses manifest icons, with 512/1024px opaque PNGs the recommended set          | HTML/manifest and image dimensions; installed appearance checked separately after re-add | [Head and icons](head-and-icons.md), [Mac](macos-add-to-dock.md); Joe Bell, Apple Developer Forums 738535 |
| Splash configuration  | iOS startup images are part of the product            | Supported unique size/DPR triples have matching orientation links and correctly sized images with the intended background | HTML, image metadata and supported device table                                          | [Splash screens](splash-screens.md), [device sizes](ios-devices.md); Joe Bell, Firtman                    |
| Splash appearance     | iOS startup images are part of the product            | A fresh install cold-launches with the intended image and handover                                                        | Target-device cold-launch observation; static configuration alone is insufficient        | [Splash screens](splash-screens.md); Joe Bell                                                             |

A missing optional manifest or startup-image set is not automatically a defect.
Assess the chosen installation experience. Mac manifests are optional; do not
add iOS assets for Mac. Source: WebKit, [Mac](macos-add-to-dock.md).

## Layout and interaction

| Check                 | Applies when                              | Observable pass condition                                                                                                      | Evidence needed                                                                                                | Source: recipe and provenance                                                     |
| :-------------------- | :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| Safe-area layout      | iOS edge-to-edge UI                       | Viewport opts into coverage; controls clear relevant insets and retain a usable base size at inset zero                        | HTML/CSS and zero-inset layout check; target-device appearance separately                                      | [Layout](layout-and-touch.md); Joe Bell, WebKit 301994                            |
| Scrolling and bars    | Scrollable installed UI                   | Intended scrolling works, bars remain reachable and background movement does not disrupt interaction                           | Scroll observation in the relevant orientation/window mode; no particular scroll-root architecture is required | [Layout](layout-and-touch.md); Joe Bell, React Spectrum                           |
| Status-bar appearance | iOS status-bar/tint scope                 | Chosen mode and actual backgrounds produce the intended readable appearance, without hidden overlays causing unintended tint   | Target installed-app light/dark observation as relevant                                                        | [Status bar](theme-color-and-status-bar.md); Joe Bell, community sampling reports |
| Overlay and keyboard  | Modal, takeover or focused-input behavior | Backdrop covers intended content; focused input and dismissal controls remain reachable; dialog scroll and text selection work | Relevant target-device keyboard and scroll interaction                                                         | [Overlays](overlays-and-keyboard.md); React Spectrum                              |
| Zoom and selection    | Touch UI                                  | Pinch zoom and body-text selection remain available; gesture overrides preserve intended interactions                          | CSS inspection plus relevant touch observation                                                                 | [Layout](layout-and-touch.md); Firtman, React Spectrum                            |
| iPad window controls  | iPad windowed mode is supported           | Primary controls remain reachable rather than covered by system controls                                                       | Windowed-device observation; fixed 64px padding is not required                                                | [iOS notes](ios-26-notes.md); Apple Support, community reports                    |

## Navigation and continuity

| Check             | Applies when                                           | Observable pass condition                                                                                               | Evidence needed                                                                                           | Source: recipe and provenance                                              |
| :---------------- | :----------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| Navigation        | Browser navigation controls are hidden                 | Users can go back or exit relevant screens                                                                              | Route/control inspection and installed navigation test                                                    | [Install UX](install-ux.md), [Mac](macos-add-to-dock.md); Firtman, Steiner |
| Install hint      | Product includes an install hint                       | Copy matches the actual browser/menu; installed apps do not show it; chosen engagement and dismissal policy is honoured | Copy and eligibility logic; browser-flow observation separately                                           | [Install UX](install-ux.md); community skills, WebKit                      |
| State continuity  | Drafts or other recoverable state are in scope         | Important state survives the relevant suspension/relaunch scenario through the existing persistence design              | Code inspection and relaunch test; do not require changing auth/storage architecture                      | [Install UX](install-ux.md); Firtman, WebKit storage policy                |
| Mac Dock behavior | Mac Add to Dock experience is in audit or change scope | Requested behavior matches product intent in the Dock app itself                                                        | Test only affected icon/title bar/display/scope behavior; record install-time state for cached appearance | [Mac](macos-add-to-dock.md); WebKit, Joe Bell                              |

## Optional polish

Record suggestions separately from failures unless the user made them acceptance
criteria. Examples: progressive blur, suppressing tap highlight while retaining
visible feedback, extra icon formats, and smooth anchor scrolling. A working
document scroll root or absence of an install hint is not a conformance failure.
Source: Joe Bell and Firtman, [layout](layout-and-touch.md) and
[install UX](install-ux.md).

## Report and finish

Report scope, failures with evidence and proposed fixes, passed checks, and
specific unverified outcomes. Group excluded checks when that improves clarity.
For requested fixes, make the relevant changes and rerun affected checks. A
focused change does not require every row or a full device matrix. Stop once
relevant checks pass or the remaining verification limitations are explicit.
