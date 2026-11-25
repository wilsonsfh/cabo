# Wilson 23:59 correction — current rules

**26 November 2026.** This section supersedes the historical 23:10/23:17 record below. Wilson answered the two flagged assumptions, and nothing else new was added.

| Area | Before | Now |
| --- | --- | --- |
| Drawn power discard | Immediate power; stacking queued afterward | 2.5-second authoritative window, then power if no stack |
| Stacked power | Never triggers | Cancels pending discarder power; stacker performs same power privately |
| Wrong rank | Private no-penalty rejection | Rejected; one extra hidden deck card appended; public hand-size update |
| Late/ineligible/self attempt | Rejected | Still rejected, no penalty |
| Active turn | Ordinary active player owns all powers | Separate power actor; original turn/final-turn accounting preserved |
| Window implementation | Placement until draw; blocked power | New `stacking` phase + injected-clock `advanceTime`; power window closes permanently on resolution/transfer |
| UI | Stack after power; no countdown | Stack at discard, visible pending countdown, cancellation/won-power message |

The exact 2,500ms duration, self-stacking rejection and alternating chains remain provisional. Existing ordinary non-power windows/chains stay as before; power transfer starts immediately, so alternating power chains remain unanswered. Empty-deck penalties follow existing exhaustion without reshuffle, deferring scoring through any pending power. Mandatory Jack, Queen look + optional swap, peek privacy, Kings, deck-only draws and all scoring/call rules are unchanged.

Current executed evidence is `tests/evidence/stack-*` and `VERIFIED.json`; earlier counts below are historical, not verification of this correction. Browser QA uses **port 5818**, Python Playwright `/usr/bin/chromium --no-sandbox`, and exclusive `flock -x -w 120 /tmp/chrome.lock`. Refreshed stack-moment shots are desktop light and mobile dark. The Mac server on **:4812 must be restarted after sync**, and prior RAM-only matches do not migrate.

## Current verified results — 00:08 +08

- **49 distinct Node cases pass**, across the 44-case full run and final-source 48-case non-simulation/boundary run; zero failures.
- **1,000 Classic games** completed: **473,561 reducer/clock transitions**, 8,910 Queen decisions, 8,420 Jack swaps and 12,434 stacks; conservation/privacy checked throughout.
- **16/16 WebSocket checks**, four rounds, six successful stacks and one rejected stack with hidden penalty/public hand-size update.
- **17/17 focused Chromium checks**, two real clients, power transfer, penalty privacy, cancellation/winner messages and celebration replay; zero page/console errors. **7/7 solo smoke checks** pass.
- Six Node syntax checks and two Python drivers compile. Desktop-light/mobile-dark stack shots refreshed. Environment file hashes match; port 5818 is closed.

The initial socket and browser harness defects were corrected (time-dependent view countdown metadata, timer-revision synchronization, CSP-safe wait polling) before the successful final runs; no production CSP or environment styling was weakened. Exact commands, counts and remaining questions are in `VERIFIED.json`.

---

## Historical correction record (superseded)

# LOWKEY rules correction — 25 November 2026

## Before / after

| Area | Previous engine | Corrected engine |
| --- | --- | --- |
| Draw source | Deck or public discard; public draw had to be exchanged | Deck only; `source:"discard"` is explicitly rejected with `RuleError` |
| Held-card representation | Card/owner/source with discard-source branches | Card/owner only; private deck draw is the only representable held-card flow |
| Discarding 7/8/9/10/J/Q | Optional `usePower` activation | Single `discard` automatically starts the corresponding power; obsolete flags rejected |
| Drawn power exchange | No power; deck replacements hidden | Unchanged: no power; replacements hidden |
| Jack | Optional activation; mandatory swap after activation | Automatic activation on discard; mandatory blind swap; skip only if no legal pair |
| Queen | Optional activation; private selected pair, then explicit swap/keep | Automatic activation on discard; selected-pair look and optional explicit swap decision unchanged |
| Stack | Not implemented | Same-rank own occupied slot may stack after the other player's top discard; successful card becomes public and slot becomes a hole |
| Stack failure | Not applicable | Private generic `Not a match.`; no game-state/score mutation, no opponent update, no penalty |
| Stacked power | Not applicable | No power activation (Coordinator assumption, not Wilson-confirmed) |
| Stack timing | Not applicable | Provisional placement-to-next-draw/discard window; blocked through powers/reveals; available after resolution if the round remains active |
| Stack chain | Not applicable | Provisional alternating same-rank chain; never changes active player or turn count |
| Bot | Remembered score values; could draw from discard | Deck-only; remembered visible rank/value by slot, including exchanged draws; optionally stacks known same-rank cards only |
| UI | Take-discard controls, T shortcut, separate power/discard actions | Non-interactive discard pile; no Take/T/P activation path; one named Discard; clear Stack state and own-card attempts |
| Interaction CSS | Existing restyle selectors | Isolated `client/rules.css`: 52px minimum buttons, .97 press at 160ms custom ease, gated hover, reduced-motion bypass |
| Scores and match policy | Suited deck, red K −1/black K 13, final turns, Quick/Classic | Unchanged; no Jokers, Kamikaze, new empty-hand win, extra turn, reshuffle, or arbitrary turn cap |

## Assumptions versus confirmed corrections

Deck-only draws and automatic powers on discarding the draw implement Wilson's correction directly. The two Coordinator assumptions are **stacked power does not trigger** and **wrong stack has no penalty**. Window boundaries, queued post-power eligibility, self-stack rejection, alternating chains, and bot stacking are explicitly **provisional implementation choices**, not claimed as Wilson-confirmed rules. `RULES.md` lists all open questions and the private one-bit probing risk, together with an unimplemented penalty alternative.

## Implementation scope

Rules-owned files only: engine/server/controller/transport, isolated interaction CSS, one stylesheet link, and tests. Existing dialog copy is replaced at client initialization by corrected rules-owned controller text, so no environment-owned markup/design is rewritten. The environment agent retains ownership of SVG artwork, scene/card modules, and its styles. No other problem folder or documentation owner's files were modified. Historical `_archive`, `RESTYLE-CHANGELOG.md`, and previous evidence describe the old build and are not new verification.

## Verification

Current correction evidence uses `tests/evidence/rules-*`; final counts and execution date are recorded in `VERIFIED.json`. Engine and boundary unit suites, actual two-client WebSocket four-round integration, focused Chromium automatic-power/Jack/Queen checks, solo smoke, and two-context browser four-round completion are run separately. Three-width screenshot suites are intentionally not rerun by this rules agent; current environment screenshots are owned by the environment agent. No claim of full testing, production readiness, or physical-device certification is made.

## Results recorded at 23:17 +08

| Suite actually executed | Result |
| --- | --- |
| Complete Node unit run | **42/42 pass**: 36 engine + 6 boundary/SVG; no skips or failures |
| Classic bot invariant simulation | **1,000 games**; 433,800 actions; 8,795 Queen decisions; 8,258 Jack swaps; 12,971 stacks; card conservation and filtered-view privacy checked throughout |
| Actual WebSocket four-round match | **16/16 checks**; 169 submitted match actions; 7 successful stacks; 1 private rejected stack, with no opponent packet |
| Chromium two-context network match | **22/22 checks**; four rounds in 132 actions; 4 stacks; all four power kinds observed; zero page/console errors |
| Chromium focused actions | **48/48 checks**, including each power rank, Jack/Queen, deterministic stack miss/success, keyboard, privacy, turn preservation, rules copy and 52px mobile targets |
| Chromium solo smoke | **7/7 checks**, complete solo round and zero page errors |
| Syntax | Six Node modules checked; three Python browser drivers compiled |

All rules-agent Chromium runs used `flock /tmp/chrome.lock`, `/usr/bin/chromium --no-sandbox`, port 5812, and `NO_SHOTS=1`; their temporary servers were closed afterward. The three-width screenshot matrix was not run. The first combined Node run exposed two fixture defects (empty-pile metadata and same-version synthetic bot observation); the fixtures were corrected, deterministic tests passed, and the entire final 42-test suite was rerun successfully. No production-readiness or full-test claim is made.
