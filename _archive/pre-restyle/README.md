# cabo

A playable original 3D CABO-family game for two people. A pure deterministic engine powers both a local memory bot and a real authoritative WebSocket room. Three.js adds a warm toy-diorama, while native DOM controls keep the click-to-act cadence and accessibility of a 2D game.

## Run

Requires Node 22 or newer. Dependencies are already installed in this folder; no global install is needed.

```sh
cd /workspace/analysis/p2-prototype
npm start
```

Open **http://127.0.0.1:8787/**. Stop with Ctrl+C. Port 8787 was occupied by a pre-existing listener at handoff; if needed use `PORT=8788 npm start` and open http://127.0.0.1:8788/. `PORT` overrides 8787. `HOST` defaults to `127.0.0.1` for a safe local demo. For two devices on an explicitly trusted LAN, run `HOST=0.0.0.0 npm start` and use this computer's LAN address; local HTTP is not secure public hosting.

To reinstall from the lockfile, with all npm writes kept inside this folder:

```sh
npm --cache "$PWD/.npm-cache" ci --ignore-scripts
```

Three.js 0.187.0 and GSAP 3.15.1 browser files are vendored in `client/vendor/`; there are **no runtime CDN requests**. Server dependency: ws 8.23.0. ES modules must be served over HTTP, not opened with `file://`.

## The fastest demo

1. Click **Play with Pip**. Pip is an explicitly labelled local bot with memory, not access to hidden state.
2. Click any two **Y** card slots. Remember their numbers, then **Hide cards · ready**.
3. Draw from the deck. Click an own slot to exchange; otherwise discard. If the draw is 7–12, use its power and choose the indicated target(s).
4. On a future turn, **Call it!** The opponent gets one final turn. All hands reveal and the score card explains the result.
5. Next round continues the match; after four Quick rounds, play another match.

**Two actual browser tabs:** in tab A, enter a name and click **Invite a friend**. Copy the six-character code. In a new tab B, open the same URL, enter a different name and join that code. Do not duplicate tab A after joining: browser tab duplication can copy sessionStorage, which represents the same seat. When both are present, tab A clicks **Start match**. Both players complete the same game. Each must click Next round and, eventually, One more match. The automated two-tab test exercised this complete flow.

Invite URLs contain only the room code. A seat token stays in tab-scoped sessionStorage. Refresh, then click Join with the existing code to resume that seat; an interrupted socket retries automatically while the page stays open. A room pauses while one player is disconnected and forfeits after 30 seconds. In the both-disconnected case there is no winner until a player returns; the other expired seat then forfeits. Rooms are not durable across a server restart.

## Rules and controls

Canonical hand rules are the Bezier-attributed 2019 second edition, not a mix of folk Cambio variants. See [RULES.md](RULES.md) for exact rules, sources and exhaustion/tie clarifications.

- Quick: exactly four rounds, no 100-to-50 reset or early >100 ending.
- Classic: play until someone exceeds 100; exactly 100 resets to 50 once per player.
- 7/8 Peek own card; 9/10 Spy opponent; 11/12 blind own/opponent Swap. Powers only activate on deck-drawn cards discarded that turn.
- Public-discard replacements stay face up. A public-discard card must be exchanged. Matching several own cards is supported; failed matches reveal cards and add penalties.
- Successful/tied-lowest caller scores zero. Failed caller scores hand sum +10. Noncallers score sum. Exactly 12,12,13,13 gives Kamikaze 0 versus 50.

Keyboard: **D** deck, **T** discard pile, **C** call, **X** discard draw, **P** use power, **1–9** own slot, **Shift+1–9** opponent slot, **Enter** hide private reveal. Native Tab/Enter controls cover actions and slots beyond nine. Click/tap is the default, with no drag gestures. The help dialog is accessible from every screen. Private peeks wait for explicit Hide, not a timer.

Sound starts off. Sound on creates/resumes WebAudio only from an input gesture. All square-wave notes are synthesized originals. Less motion honors both the OS preference and the local setting; keyboard actions skip motion. `/?fallback=1` intentionally exercises the complete native-card fallback without WebGL.

## Verification

```sh
npm test                       # 23 tests; ~85 sec on the verified Mac
npm run check                  # Node syntax checks
npm run test:integration        # two ws clients; full game + reconnect + rematch
npm run test:browser            # headless Chrome, real 3D states + captures
node tests/browser-multiplayer.mjs  # two real tabs, full 4-round game + rematch
```

The browser drivers locate Chrome at `/Applications/Google Chrome.app`, run SwiftShader, start a temporary local HTTP server, and stop both browser and server in cleanup. macOS sandbox restrictions initially blocked Chrome IPC/GPU initialization; a scoped authorized run succeeded. All profiles and screenshots are inside `shots/`. Chrome verification is not a claim of Safari/mobile-device performance certification.

**Recorded evidence:**

- `tests/engine-results.txt`: **23/23 passing**. Includes **1,000 standard-to-100 full games**, **508,878 legal actions**, deterministic seeds, deck conservation, all six power ranks, matching failures, final turns, scoring and every-view privacy checks.
- `tests/integration-results.txt`: final run completed **203 actions** over real WebSockets. Every received view equalled the correct per-seat view. Secret identities, deck order and RNG were absent. Rematch, stale revisions, invalid tokens, pause/resume and forfeit passed.
- `shots/browser-multiplayer-results.txt`: **two independent Chrome tabs**, four rounds, equal final results, unanimous rematch, **zero page exceptions**.
- `shots/browser-report.json`: WebGL initialized, private power reveal, visible results, no measured desktop controls below 44x44, no horizontal overflow at 390px, fallback controls present, **zero page errors**.
- Final visual captures: [lobby](shots/01-lobby.png), [mid-turn](shots/02-table-mid-turn.png), [private power](shots/03-character-power.png), [round end](shots/04-round-end.png), [mobile](shots/05-mobile-round-end.png), [fallback](shots/06-fallback-table.png). Earlier real-network captures: [table](shots/07-networked-table.png), [match end](shots/08-networked-game-end.png).

## Architecture and privacy boundary

```text
engine.mjs (no dependencies, no clock/network/DOM)
  createGame(seed) → reduce(state, player, action) → viewFor(state, player)
       ↑ LocalAdapter                              ↓ native UI + Three.js
       ↑ authoritative Node room ← WebSocketAdapter
```

`viewFor` constructs a new allowlisted object; it never serializes raw card IDs, unknown own/opponent ranks, draw order or RNG state. A legal Spy reveals only its selected opponent card, only to the acting player, until acknowledgement. Public history contains only already-completed round scores. Artwork and the renderer receive the filtered view, never server state. Local solo naturally executes its authority in the browser; it is not advertised as cheat-resistant multiplayer.

The server authenticates actions by socket-bound seat token and ignores client player IDs/state. The reducer has explicit phases and typed `RuleError` failures. Revisions reject duplicate/stale actions. Input payloads are limited to 4 KiB; per-connection token buckets, room/connection caps, same-origin browser upgrade checks, heartbeat and idle-room cleanup are present. Session tokens use 192 bits from Node crypto; six-hex-character invite codes are selectors, **not secure seat credentials**. Static files are confined to `client/` plus the public rules code at `/engine.mjs`; no research PDF, server source, tests or room state is served.

## Real versus not built

**Real:** full rules and scoring, seedable engine, all powers, multi-card exchanges and penalties, honest memory bot, WebGL island/characters, local no-network play, two-seat WebSocket rooms, invite links, rematch, reconnect, disconnect forfeit, rate limits, original SFX, reduced-motion and keyboard/ARIA controls, native fallback, tests and real screenshots.

**Not built:** public deployment, production persistence, accounts/matchmaking, 3+ players, ranked competitive anti-cheat, cryptographic shuffle fairness, action-ID receipt replay, cross-match streak storage, elaborate individual idle choreography, an after-hand Reveal Receipt, controller bindings, service-worker offline installation, full localization, dark theme, or real-device Safari/performance certification. No public hosting or purchases were performed. Long penalty hands switch to scrollable native rows rather than shrinking targets; the 3D table is optimized for the ordinary four-card hand.

**Security limits:** the server operator sees all cards. A modified client can retain values it legitimately learned. Players can collude or look at each other's screens. The seeded PRNG is deterministic, not cryptographic; use a stronger server shuffle/fairness design for competitive stakes. Tokens are bearer credentials, room state is RAM-only, and HTTP/WS is local-demo transport. Production requires TLS/WSS, durable state, deployment-specific Origin configuration, abuse protection and session expiry policy.

## Durable Objects and Client handoff

One room is the coordination atom. Keep `engine.mjs` and the filtered-view contract unchanged; replace Node maps with one Durable Object per code, persist state before broadcasting, use SQLite for state/revisions/receipts, WebSocket Hibernation attachments for seat identity, and durable alarms for reconnect deadlines. Node timers must not be copied into a hibernating DO. This is architectural portability, not a completed Cloudflare port.

This deliverable is the explicitly requested local prototype folder, not an initialized/published managed Client Game. A parent can reuse the engine, adapter interface, client modules, statechart, feature map and tests in an approved Three.js Game project. The current Game workflow requires its managed setup/online-host selection; do not relabel the game to evade that contract. Catalog tools are parent-only in this task; no catalog art is required because the user authorized original procedural characters. If later reusing catalog assets, preserve each asset's supplied license/provenance notices. No purchases are implied.

## Design and IP

The analyst's recommended **Cabo** working name is adopted; its trademark clearance is **unverified**. Pocket Island is the edition concept. CABO-family is descriptive compatibility text, not a claim of affiliation or permission. All creatures, foliage, card back design, prose and sounds are original. No Nintendo characters, mushrooms, pipes, logos, sprites, fonts, recordings or music are present. Third-party code notices are retained in `client/vendor/`; GSAP uses its standard license, not MIT.

Read [FEATURE-MAP.md](FEATURE-MAP.md), [STATECHART.md](STATECHART.md), [DESIGN-REVIEW.md](DESIGN-REVIEW.md), and [PROGRESS.md](PROGRESS.md) for the product map, phases, exact motion choices, review findings and build checkpoints.
