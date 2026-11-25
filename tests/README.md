# Current verification entry points — Wilson 23:59 correction

`engine.test.mjs` verifies the suited deck, deck-only draws, timed pending-power resolution, power transfer/acting privacy, mandatory Jack and Queen decision, wrong-rank hidden penalties, late/ineligible rejection, stack holes, memory bot and **1,000 complete Classic games**. `boundaries.test.mjs` retains artwork, HTTP/WebSocket and chat checks. `stack-boundaries.test.mjs` adds last-card penalties, self/ineligible wrong attempts, ordinary power interruption and transferred final-turn accounting. Clocks are explicitly injected in window tests; unit tests never wait 2.5 seconds.

`integration.mjs` uses two actual WebSocket clients to complete four rounds, successful and wrong-rank stacks, filtered wire views, reconnect/rematch and forfeit. A rejected wrong stack now **does** produce a public hand-size/state update and generic stacker error; the penalty face remains private to nobody until normal rules reveal it. Both wire peers synchronize with authoritative timer revisions.

```sh
npm run check
node --test tests/engine.test.mjs tests/boundaries.test.mjs tests/stack-boundaries.test.mjs
node tests/integration.mjs
TEST_PORT=5818 NO_SHOTS=1 flock -x -w 120 /tmp/chrome.lock python3 tests/smoke.py
flock -x -w 120 /tmp/chrome.lock python3 tests/stack-browser.py
```

The current quick browser pass is solo smoke followed by `stack-browser.py`: two independent clients, desktop light and mobile dark, an actual socket Queen-stack scenario, wrong-stack hidden penalty, cancellation/won-power messages, private stacker pair, original turn accounting, zero console errors and preserved `?demo=celebrate`. The isolated `stack-browser-server.mjs` swaps fixture cards without violating the 52-card invariant; it adds **no test endpoint** to the production server. Both browser harnesses start a temporary authority on **5818** and terminate it in `finally`. Use Python Playwright `/usr/bin/chromium --no-sandbox` under exclusive `flock -x -w 120 /tmp/chrome.lock`; never the shared MCP browser. Refreshed screenshots are `shots/stack-desktop-light.png` and `shots/stack-mobile-dark.png`.

`browser.py` and `polish.py` retain the historical broad restyle/23:10 harnesses; their immediate-power/no-penalty assumptions are superseded and they are **not current verification commands**. Compatibility `.mjs` entry points and `npm run test:browser` route to the current focused stack harness. Current evidence is `tests/evidence/stack-*`, with exact executed counts in `VERIFIED.json`. Old `rules-*`, restyle reports and prior screenshots are historical, not verification of this correction. A three-width matrix and physical-device Safari were not rerun.
