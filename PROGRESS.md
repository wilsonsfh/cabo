# Pocket Island — build progress

Started 2026-11-25, 20:55 Singapore time. Working title is neutral pending the analyst's naming recommendation. This is the explicitly requested local Node/ES-module prototype artifact, not a managed or published Client Game.

## Priorities and budget

Target: complete core loop before polish; reserve final 15 minutes for verification. Slices: deterministic engine + test fixtures; playable solo UI; Three.js scene; authoritative rooms + integration driver; short character reactions + SFX; browser verification and handoff. No cinematic input locks, no accounts, no commercial asset dependencies.

## Research and decisions

Opened current Three.js RenderPixelatedPass, Raycaster, CSS2DRenderer and rendering-on-demand docs, GSAP Timeline docs, Inspora, Bezier publisher Cabo page, Trey Hunner and Father Geek. API verification will additionally inspect the installed local package source. The CSS2D docs extraction partially failed; use projected DOM labels for browser zoom/accessibility and sprite text for table artwork. Render at reduced resolution with nearest-neighbour CSS upscaling instead of an expensive multi-pass edge shader; controls and text remain native resolution.

Inspora's extracted layout is a restrained visual archive with compact category navigation, Latest/Featured selector and creator attribution. Initial headless Chrome inspection failed under local sandbox policy; actual hover/motion remains unverified until the browser verification pass. Borrow its hierarchy, whitespace and clear editing, not its artwork.

Required poteto, build-principles, Durable Objects, Emil skills and recipes/standards, Apple HIG foundations/game-controls/motion/feedback were read. Use explicit reducer actions and allowlisted views to make leaks difficult to express, tests for what the API still permits, then browser evidence. One room = one future DO coordination atom; storage/alarms belong in the host adapter, not engine. No DO deployment claimed.

## Status

- Research: in progress; waiting for canonical publisher rules and analyst.
- Engine/tests: not yet implemented.
- Solo/3D: not yet implemented.
- Rooms/reconnect/rematch: not yet implemented.
- Browser/test verification: not yet implemented.

## Concrete motion tokens

From Emil animate and review STANDARDS: `cubic-bezier(0.23, 1, 0.32, 1)` for feedback/entrance; `cubic-bezier(0.77, 0, 0.175, 1)` for spatial transfers; button press 160ms / scale .97; card feedback 180–240ms; no animation for keyboard-triggered actions. Hover is gated to fine pointers; no per-move component renders. Rare reveal uses shrinking 50/40/30ms overlaps, total below 350ms. Reduced motion collapses delays and spatial motion; native opacity feedback stays. Next input never waits for animation completion.

Apple HIG accessibility > Vision/Mobility/Cognitive: AA contrast computed from tokens, at least 44x44px controls, text and shape in addition to color, native button keyboard alternatives, aria-live status, explicit dismiss for peeks (not timed). Game-controls: direct card tapping, single-key commands, actions shown only when relevant. Motion: no camera tours; no continuous mandatory movement.

## 21:14 checkpoint

Engine, local adapter, authoritative room server, 3D client and settings are implemented. `npm test`: 20/20 passing, including 1,000 complete STANDARD-to-100 bot games, conservation checks after every action, and every filtered view checked for secret IDs and unauthorized ranks. The adversarial `__proto__` action initially produced a TypeError; fixed with Object.hasOwn at the allowlist boundary and reran all tests.

Two actual ws clients completed a four-round match in 179 actions. Every state over the wire matched its per-seat filtered authority view. Rematch, stale-version rejection, pause/reconnect with token, invalid-token rejection and forfeit deadline passed. No browser CDN dependencies; Three.js 0.187.0, GSAP 3.15.1, ws 8.23.0 installed locally and pinned.

Headless Chrome exists but the initial sandboxed launches failed on macOS IPC/GPU restrictions (not a WebGL code error). SwiftShader attempted with project-local profile/TMPDIR; final browser driver is prepared for an appropriately authorized retry. Do not claim screenshots until files exist and are reviewed.

## 21:20 checkpoint — real browsers

Headless Chrome succeeded with an isolated profile and the necessary macOS IPC execution scope. SwiftShader WebGL initialized. Captured lobby, live draw decision, private power reveal, scored round, mobile and fallback; console errors: zero. Actual Inspora screenshot confirms white quiet chrome, Inter, small filters and artwork-first grid; scroll and pointer movement were exercised. We borrow clear framing and restrained controls, not source artwork or long scroll transitions.

A second driver launched two independent tabs, used the real Create/Join/Start controls, played four full rounds through each tab's WebSocket adapter, compared final results, and verified unanimous rematch. 249 action iterations; zero page exceptions. This is true network play, not two independent local games.

Screenshot review found disabled-label CSS specificity removing the translate anchor, plus long card names overlapping and mobile results covering the hand. Fixes preserve anchors, shorten labels without removing accessible names, reserve mobile reveal space and remove a square tabletop overhang. Re-shoot follows. AA contrast measured: ink/sky 10.98:1; secondary/sky 5.32:1; white/blue 6.82:1; white/coral 5.14:1; secondary/paper 5.71:1. All measured enabled native controls >=44x44px at desktop; mobile to be rechecked.

Final analyst report is available. Adopt its **LOWKEY** uncleared working title (Pocket Island edition); keep CABO-family descriptive only. Align Quick to exactly four rounds, no exact-100 reset and no >100 early termination; Classic retains official 100-point rules. Add a regression test. The analyst's DOM-only recommendation is intentionally superseded by the user's explicit Three.js direction; native DOM remains the accessible interaction layer.

## Final verification checkpoint

- `npm run check`: all four application entry modules parse.
- `npm test`: **23/23 passing**, 1,000 standard full games, **508,878 reducer actions**. Every action conserves 52 unique cards and every player view is leak-checked. Quick mode and one-time reset regressions added.
- Final `node tests/integration.mjs`: **203 actions**, full four-round network match, filtered wire payloads, unanimous rematch, stale rejection, token resume, invalid token and forfeit passed.
- `node tests/browser-multiplayer.mjs`: **two independent real Chrome tabs**, **four rounds**, matching final score, unanimous rematch, zero page exceptions.
- `node tests/browser.mjs`: final re-shoot completed after an initial terminal wait timeout; it was inspected rather than relaunched. WebGL true, no page errors. Six game/fallback screenshots plus the actual Inspora reference are present. All four requested primary images were visually reviewed after fixes; mobile own hand is now visible above results.
- The requested default port **8787 was already occupied** during the final explicit HTTP smoke check. That pre-existing listener was not stopped or replaced. A temporary-port HTTP smoke check verifies the same entry, health, route manifest, vendored assets and denied server/research files. Use `PORT=8788 npm start` if needed.
- All server/browser processes started by the test drivers stop in cleanup. No public service, account, deployment or purchase was created.

## Honest completion boundary

All mandatory engine, solo, room, reconnect, rematch, tests and screenshot paths are implemented. Fourteen original procedural rank creatures and the warm WebGL environment are real. The local adapter needs no network after page load. Choreography is cosmetic and interruptible; power reveals wait for explicit input.

Not done: persistent/public hosting, Cloudflare implementation, more than two seats, action-ID receipt replay, persistent win streaks, elaborate unique idles for each rank, analyst Reveal Receipt, physical-device performance/VoiceOver/200% zoom certification, full localization or commercial title clearance. The native fallback was rendered and its action controls verified; the same reducer and adapter perform gameplay. Desktop/390px screenshots are evidence, not a substitute for device certification. Large penalty hands get native scroll rows, but their 3D composition remains secondary.
