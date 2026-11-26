# cabo

A plain-local, two-player CABO prototype with an original SVG poker deck. Four hidden cards, a memory-only practice bot, or a real friend on the same server. The corrected 52-card rules and remaining provisional choices are in [RULES.md](RULES.md).

## Start — no installation

Requires Node.js 22 or newer. From this folder:

```sh
PORT=4812 node server.mjs
```

Open **http://127.0.0.1:4812**. macOS/Linux syntax shown; the default port is already 4812, so `node server.mjs` also works. All runtime dependencies and fonts are bundled. No build, npm install, network download, hosted backend, WebGL or GPU is required to play.

If an old Q2 server is already listening, stop/restart that process after syncing these files. Existing in-memory matches do not migrate across this rule update. Don't kill other product servers.

For two browser clients on one computer, open two independent browser contexts or browser profiles. Choose **Invite a friend**, join the six-character code, and start once both seats connect. Each window receives a filtered view. A copied invite pre-fills the room code; it does not bypass joining. Do not duplicate an already-joined tab: duplicated sessionStorage may represent the same seat.

The default bind is loopback. Optional trusted-LAN use needs an explicit bind and host allowlist, e.g. `HOST=0.0.0.0 ALLOWED_HOSTS=192.168.1.20 PORT=4812 node server.mjs`, then both players use that machine's LAN address. This is not internet deployment or TLS provision. An invite containing `127.0.0.1` works only on the same computer. Do not expose the raw prototype to the public internet.

## Fastest demo

Play with Pip → tap two own cards → explicitly Hide → draw → replace or discard → allow the stacking countdown → use the resulting power → Call CABO → let Pip take the final turn → inspect the revealed scores. Next round continues the four-round Quick match; Classic to 100 is selectable in the lobby.

Keyboard: **D** draw, **C** call, **X** discard draw (power waits through stacking window), **1–9** own slot, **Shift+1–9** opponent slot, **Enter** hide a one-card peek or finish initial readiness. Queen requires the explicit Swap/Keep buttons; Enter never silently chooses. Tab/Enter covers all controls and slots beyond nine. Reveals have no timers. Sound starts off and uses original WebAudio synthesis.

Refresh an online tab, then Join the existing code to resume its sessionStorage seat token. An interrupted live socket retries automatically. The room pauses while a player is away and forfeits after 30 seconds. Both-disconnected cases resolve when someone returns; rooms are not durable across restart.

## What changed

Standard suits and ranks; A=1, J=11, Q=12, red K=−1, black K=13. No jokers, zeros or Kamikaze. Jack is a mandatory blind swap. Queen privately reveals one card from each hand, then requires an explicit swap/keep choice. Draws come only from the deck. Discarding a just-drawn power card (7, 8, 9, 10, J, Q) opens a fixed 2.5-second authoritative stacking window. No stack: the discarder starts its power. Same-rank stack: the discarder’s power is cancelled and the stacker performs it instead, with unchanged privacy/mandatory choices and original turn accounting. A wrong-rank attempt adds one hidden deck penalty card and does not place the attempted card. Late/ineligible attempts reject without penalty. These replace the two previous Coordinator assumptions (Wilson, 23:59). Self-stacking, exact window duration and alternating chains remain open in `RULES.md`. No extra game mechanics were added.

The old low-resolution 3D card scene is replaced by resolution-independent SVG, mirrored corner indices, conventional suit pips, double-ended court drawings, traditional backs and a hand-drawn table. System fonts are principal; Caveat is limited to annotations. The app follows system light/dark and reduced-motion settings. Card movement is brief, interruptible and never gates a move. Avatars live outside card rows, never over corner indices. Long penalty hands scroll instead of shrinking the cards.

Online table chat is plain text, escaped in the UI, limited to 280 characters per message and the newest 50 messages per room. It shares the existing server connection and is not end-to-end encrypted. It is hidden in solo mode rather than pretending Pip is a chat agent.

## Tests and evidence

```sh
npm run check
node --test tests/engine.test.mjs tests/boundaries.test.mjs tests/stack-boundaries.test.mjs
node tests/integration.mjs
# Sandbox QA only: Python Playwright + /usr/bin/chromium, one shared browser lock.
TEST_PORT=5818 NO_SHOTS=1 flock -x -w 120 /tmp/chrome.lock python3 tests/smoke.py
flock -x -w 120 /tmp/chrome.lock python3 tests/stack-browser.py
```

Node tests require no installation. Browser-test dependencies are QA tooling, not runtime dependencies; they were available in the Sandbox and are not bundled for macOS. The current focused browser check starts its own temporary port **5818** (smoke accepts `TEST_PORT`; older browser suites default to 5812), terminate it in `finally`, and store clean screenshots in `shots/`. Read [RULES-CHANGELOG.md](RULES-CHANGELOG.md), `VERIFIED.json` and `tests/evidence/stack-*` for current executed results; `FIRST-VERSION-READY.json` records the initial working milestone, not final verification.

The engine suite covers the exact deck and opaque IDs, both King scores, deadline power resolution, mandatory Jack, stolen-power acting/privacy, wrong-stack hidden penalties, late/ineligible rejection, same-rank stacking, Queen accept/decline and visibility, immutable reducer errors, private setup/peek views, unchanged replacement/penalty/call/exhaustion/match behavior, and 1,000 complete Classic bot games. The network test uses two real WebSocket clients and compares every received view to the authoritative filtered view.

## Architecture and limits

`engine.mjs` → immutable reducer + allowlisted `viewFor` → local adapter or authoritative Node WebSocket room → native DOM/SVG interface. Every action is validated; revisions reject stale or duplicate actions. Payload size, rate, room/connection count, Host and browser Origin guards are present. Tokens are 192-bit random bearer credentials; six-character room codes are selectors, not secure credentials. Static serving exposes only `client/` plus `engine.mjs`.

This is a **prototype**, not an audited secure game service. The server knows the entire deck. A hostile host can cheat; solo authority runs locally. Filtered views prevent the other client from receiving hidden rank/suit/value/IDs. A modified client can retain legitimately learned values. The seeded shuffle is deterministic, not cryptographic fairness. No accounts, permanent storage, public deployment, TLS/WSS, matchmaking, 3+ players, ranked anti-cheat, action-ID receipts, localization or physical-device Safari certification are claimed.

Restarting clears rooms/chat; disconnected online seats have 30 seconds to reconnect with their stored token. Brand clearance and official CABO affiliation are not claimed. No SF font files, publisher artwork or downloaded drawing assets are used. See [VENDOR.md](VENDOR.md) for dependency/font provenance. Previous source and verification records are preserved in `_archive/pre-restyle/`; historical screenshots without `restyle-` are not evidence of the new interface.


## Cloudflare hosting

Live: https://cabo.wilsonsoon.workers.dev

The public app uses a native Cloudflare Durable Object WebSocket adapter. Rooms remain ephemeral, matching the prototype; encryption/game logic stays in the original implementation. This remains an unaudited prototype.

build browser assets with `node scripts/build-cloudflare.mjs`, then `wrangler deploy`. The original local Node server remains available.

## Automatic publishing

Pushes to `master` run syntax, game, timing, and multiplayer checks, then deploy the game to Cloudflare. The portfolio desktop embeds this live URL, so it receives the same version on reload without a separate release.
