# Problem 2 — LOWKEY: a networked CABO-family arcade table

## 1. What a top-scoring answer looks like

**Build a readable DOM table, an authoritative room server, an honest bot, and one outstanding reveal—not a local animation pretending to be multiplayer.** Estimate 90 minutes to a complete two-player loop and 165–210 minutes to a defensible published demo, assuming deploy access. LOWKEY is an uncleared working title. Priority: high showcase value, but build first only if hosting is settled; otherwise finish a lower-risk loop first.

| Assessment dimension | Grader’s proof |
| --- | --- |
| Product taste | A lone visitor starts against a bot; a friend joins by link; final-turn danger is understandable without a manual. |
| Implementation/debugging | Two isolated browsers finish the same match; refreshing/retrying never duplicates a draw. |
| Architecture | Show filtered wire payloads: unknown cards never cross the boundary. Face-down CSS proves nothing. |
| AI efficiency | Give Manus rules/invariants before UI; one deterministic engine powers tests, server and bot harness. |
| Planning/scope | Join → start → play → score → rematch precedes shaders/art. One signature effect. |
| Boundaries/security | Explain Spy disclosures, seat authority, bot limits, hosting costs and imperfect anti-cheat/naming clearance. |

## Differentiator and identity

**differentiator:** A pocket arcade for remembering, bluffing and stealing one last card, whose post-hand Reveal Receipt shows exactly how a blind swap changed the result.

**visual_identity:** Original 16-bit tabletop hardware: plum `#271B43`, violet enamel `#4B3370`, ivory cards `#FFF3D6`, mint turn signals `#8EE8D7`, amber call button `#FFCF66`, rose warnings `#FF8F9E`. Bespoke bitmap wordmark plus legible system sans-serif; stepped corners, two-pixel borders, hard offset shadows, geometric backs. Deliberately not black/acid-green developer chrome, glass dashboards, serif editorial pages or a bento template. Terse tactile motion; still table.

**Only-this-one feature:** Reveal Receipt: after resolution, replay the decisive swap for six seconds with caller totals before/after. Never a live memory aid or disclosure of the remaining deck.

**promo_video_beat:** 0–3 seconds: invite link becomes two occupied seats. 3–7: private peek and blind cross-table swap. 7–11: amber “Call” tile bumps; opponent takes the last turn. 11–15: reveal, caller loses by one, Receipt identifies the swap, “Again?” lands. Capture real play; label acceleration/staging.

## 2. Landscape: nine verified examples

| Opened example | Steal | Avoid |
| --- | --- | --- |
| [Bezier CABO](https://beziergames.com/pages/cabo), [2019 rule sheet mirror](https://board-game-rules.com/wp-content/uploads/2025/01/cabo_Official-Rules.pdf) | Four-card memory, powers, vulnerable final turn. | Art, unicorn theme, copied prose, affiliation claims. |
| [Eric’s second-edition review](https://whatsericplaying.com/2019/03/25/cabo/) | Reveal and last-turn sabotage are the emotional core. | A 30–45-minute standard session as sole onboarding. |
| [CABO Online](https://cabo-online.com/rules) | Concise browser action explanations. | Its 4–8-player, negative-king, snap and caller-immunity variant. |
| [PlayingCards.io](https://playingcards.io/) | Private room invitations. | Human-enforced rules/turns for hidden-information integrity. |
| [Board Game Arena](https://boardgamearena.com/) | Browser convenience; teach through moves. | Accounts, ranking and catalog complexity. |
| [Inspora](https://www.inspora.design/) | Quiet chrome, artwork-led hierarchy, framing and continuity. | Gallery cloning and long detail transitions in gameplay. |
| [boardgame.io secret state](https://raw.githubusercontent.com/boardgameio/boardgame.io/main/docs/documentation/secret-state.md) | Explicit `playerView`, server-only secrets. | Assuming rendering conceals serialized data. |
| [Colyseus StateView](https://docs.colyseus.io/state/view) | Mature room/visibility concepts. | State is visible by default; fields need tags and view membership. |
| [PartyServer migration](https://docs.partykit.io/guides/migrate-to-partyserver/) | Room-oriented Workers/hibernation. | Hosted PartyKit shut down **23 October 2026**; reject `partykit.dev` and `partykit deploy`. |

That last finding changes the shortlist on the assessment date, 25 November 2026. [12]

## 3. Product concept and scope

### One canonical profile, not a mixture of Cambio variants

Choose **Bezier 2019 hand rules + explicitly labeled “Arcade Four” session rules**. Opened evidence includes the 2019 sheet with publisher footer/date, the [original publisher PDF](http://www.smiling-monster.de/spiele/smg007/download/SMG-Cabo-EN.pdf), and independent Eric and [CardRules+](https://cardrulesplus.com/games/cabo/) summaries. Publisher rules win disagreements. CardRules+ says later starters use cumulative score; use previous-hand score instead. [1] [2] [3] [4]

| Rule | Frozen contract |
| --- | --- |
| Players/deck | 2–4. Explicit 52-card manifest: two 0s, two 13s, four each of 1–12; values score their numbers. Multiplicities are our implementation contract; the opened 2019 sheet does not enumerate them. No suits/negative kings/jokers. |
| Deal | Four cards in an ordered row. Privately inspect any two; close explicitly. No free re-peek or remembered-value badges. |
| Turn | Clockwise: draw deck, take discard top, or call. Deck card: discard or exchange into own row face down. Discard card: mandatory exchange, remains face up. |
| Powers | Only deck-drawn cards discarded that turn activate: 7/8 Peek one own face-down card; 9/10 Spy one opponent face-down card; 11/12 Swap one own and one opponent card, preserving orientation, without looking. Replaced hand cards never activate. |
| Matching | Exchange several equal own cards for one incoming card. Reveal selected cards. Success reduces hand size; failure returns them face up and adds incoming card at row end. Selecting three or more nonmatching cards adds one further unseen deck card. |
| Call | Consumes the turn instead of drawing. Every other player gets exactly one final turn; caller gets none and remains targetable. Reject a second call; no ≤5 eligibility rule. |
| Hand end | Final turns complete or deck exhausted. House clarification: finish the current action before scoring; omit an unavailable extra penalty draw. Never reshuffle mid-hand. |
| Scoring | Noncallers score sum. Caller lowest/tied-lowest scores 0; beaten caller scores sum +10. Retain Kamikaze: exactly two 12s and two 13s, no extra cards, gives that player 0 and others 50, overriding ordinary scoring. |
| Session | Official standard ends when someone exceeds 100; exactly 100 resets to 50 once per player. Ship only **four hands**, a publisher-suggested short format, and explicitly remove the 100 reset. Lowest cumulative wins; tie uses last-hand score, then shared victory. [5] |
| Starter | Lowest previous-hand score; tie goes to the tied seat first clockwise from previous starter. This tie interpretation is fixed. |

Reject original-edition +5 penalty, zero for every lowest noncaller, unlimited resets and reshuffling; reject folk snap/match-discard outside your turn, opponent-to-opponent swaps and caller immunity. Snap adds latency arbitration and another input model without earning its complexity. These disclosed house choices are not perfect official-edition parity. [2]

The core loop is create/join → ready → inspect two → draws/replacements/powers → call → final turns → reveal/score → four-hand winner → unanimous rematch. Bot play uses the same server/rules, not fake networking; lobby bots cannot be replaced mid-hand.

Three replay-worthy moments: **“I found a zero”** rewards memory; **“You stole my good card”** makes another person causally present; **“I called too soon”** makes a one-point loss a story. Four-hand progress and quick rematch keep losses tolerable. Stretch: Reveal Receipt, fixed reactions, richer original art. Non-goals: matchmaking, chat/voice, accounts, rankings, wagering, live memory notebooks, snap, 3D scenery, multiple rulesets or LLM strategy.

## 4. Architecture

```text
Browser A ── intent/actionId/revision ──┐
                                       v
Browser B <── viewFor(B) ── Worker ── Room Durable Object
Browser A <── viewFor(A) ─────────────┤
                                    ├─ pure rules reducer
                                    ├─ SQLite state/dedup/deadlines
                                    └─ alarm + bot(filtered view, memory)
```

For an approved custom web build, choose **React/Vite/TypeScript, native browser WebSocket, direct Cloudflare Durable Objects**, and same-origin Worker static assets. GSAP owns effects only. One coordinator per room serializes decisions; SQLite survives hibernation. No Redis, global simulator or LLM is necessary.

Statechart: `LOBBY → INITIAL_LOOK → TURN_CHOICE → DRAW_DECISION/POWER_TARGET → FINAL_TURNS → HAND_RESULT → NEXT_HAND/MATCH_RESULT`. Separate `FullRoomState`, `PlayerView` and `Command`; prohibit full-state imports in the client. All sends pass through a whitelist serializer: no generic `broadcast(fullState)` API.

A view contains ordered opaque slots, backs/public faces, discard top, deck count, turn/deadline, scores and legal actions. **Unknown own cards are filtered too.** Only the acting player receives their pending draw or legally selected Peek/Spy value. Spy is the explicit exception to “never send opponent face-down values”; sending every value and hiding it visually is cheating. Expiry stops future disclosure, not a modified client retaining a received value.

Command processing: authenticate socket/seat epoch → schema/phase/target/deadline validation → action-ID deduplication → revision check → reduce once → atomically persist state/receipt → separately filtered snapshots. Lost acknowledgements retry the same ID and receive the original result even when revision is now stale. Reconnection gets current truth; animation completion never changes server state.

Codes/links identify rooms, not players. Issue random 128-bit room-scoped resume secrets; retain hashes server-side and tokens in tab-scoped storage, never invitation URLs. Replacing a socket advances its seat epoch and revokes the old socket. Lock rules/seats at start. Rematch resets scores/hand state/ready flags and increments match epoch.

Use `ctx.acceptWebSocket`, `webSocketMessage`, and attachments for seat/epoch identifiers. Attachments survive healthy-connection hibernation, not closure; persist game state separately. Avoid server `setInterval`/`setTimeout`. Store absolute deadlines and schedule the earliest through the room’s single alarm; recheck on input because alarms are not precise real-time clocks. [11]

| Alternative | Judgment |
| --- | --- |
| Manus Game + Cloud Computer + Node `ws` | Best integrated managed-Game route. Current setup chooses Godot for 2D, Three.js for 3D; DOM is not automatically its 2D template. Reuse authoritative connection/server components, not Pong physics. Multiplayer computer selection is required. [13] |
| Managed web + Reserved Node `ws` | Viable approved DOM route. Default Autoscale can split in-memory rooms. Reserved gives one persistent 1 vCPU/512 MB process: usage-based up to $37.50/month full-utilization compute, less $10 credits, plus egress. Local skill pricing, not live quote; persist in database, not ephemeral files. |
| Colyseus | Useful at matchmaking/multiple-room scale; schema visibility lifecycle outweighs filtered JSON’s auditability here. [10] |
| PartyServer | Valid modern DO wrapper; direct DO uses fewer abstractions. Hosted PartyKit is rejected. [12] |
| Local Node `ws` | Excellent test adapter, not lasting hosting when Wilson’s laptop sleeps. [14] |
| Canvas/Three.js | Canvas complicates text/focus/hit tests; Three.js adds raycasts/textures/context failures without increasing fun. Reject for cards. |

SQLite DOs now support Workers Free, with limits rather than unlimited hosting. [15] Choose Cloudflare only with deploy access and explicit hosting/engine agreement; do not silently bypass managed Game setup. Optional [Cloud Computer purchase](https://manus.im/app#settings/my-computer/create) starts at $10/month in the local reference; an owned computer can be attached instead. It also needs TLS/WSS, firewall/proxy checks and reboot-safe service management.

## 5. Interaction and visual design

### Inspora translated, not copied

I opened Inspora and inspected public HTML/CSS/scripts. GUI playback was unavailable; these are implementation observations, not a claim of visually exercising every hover. Its variable Inter, neutral chrome, balanced sticky header, 14–16 px archive copy, 12–15 px gaps and responsive masonry at 460/760/1120 px make heterogeneous imagery feel curated. [6]

Source shows 150 ms category/popover changes, pointer/focus/touch prefetch, viewport-aware media, 550 ms GSAP entry/35 ms stagger/`power3.out`, and a 700 ms overlapping detail transition. No verified scrolljacking/parallax claim. Borrow framing/continuity, not long timings or uniform stagger. Lobby: live-looking miniature table, “Play a bot”, room field and “Make a room”; no marketing scroll before play.

Desktop seats surround deck/discard; compact layouts place opponents in a top strip with expandable ordered rows, local cards/actions near the thumb. Keep stable slots and empty anchors after matching; penalty hands scroll rather than shrinking targets. Container queries preserve functions across sizes.

Local files: `emil-design-eng/SKILL.md › Animation Decision Framework`, `animate/SKILL.md`, `choreograph/SKILL.md › Hard Rules`, and Emil `apple-design/SKILL.md › Interruptibility` require purpose/frequency gating, container-level choreography and input-safe interruption. Dickwu HIG `designing-for-games.md › Jump into gameplay`, `accessibility.md › Mobility`, `layout.md › Adaptability`, `typography.md`, `color.md › Inclusive color`, `motion.md`, and `playing-audio.md` translate into teach-through-play, alternate controls, semantic state and optional effects—not fake native glass.

Use 44×44 CSS-pixel targets, 17 px system-sans body, 28–36 px numerals, rem scaling and 200% zoom tests. Bitmap text stays in wordmark/results. Turn state needs text/border, not mint alone. Computed contrast on plum: ivory 14.38:1; secondary lavender `#C5B5DC` 8.32:1; mint 11.08:1; amber 10.85:1; rose 7.31:1. Verify final textured screens; offer solid/high-contrast surfaces.

| Motion | Exact specification |
| --- | --- |
| Press/hover | Immediate pointer-down; `.97` scale, 100 ms, `cubic-bezier(.23,1,.32,1)`. Hover border/color only, 125 ms, fine-pointer/hover media gate. Keyboard actions, focus and selection: no motion. |
| Rules popover | 160 ms enter/125 ms exit; opacity plus `.97→1`; same ease-out; trigger origin. Esc closes; focus restores. |
| Relocation | GSAP Flip 220 ms, `scale:true`, stable opaque `data-flip-id`, `power2.inOut`; capture → committed layout → animate. Outer 2D wrapper separate from reveal face: Flip does not support 3D transforms. [7] |
| Call | Original amber token bumps 4 px/160 ms/four steps; six square particles/240 ms. No Nintendo question block or coin sprite. |
| Rare shake | Maximum 2 px/120 ms on decisive failed call; never viewport/text or every turn. |
| Audio | Opt-in WebAudio oscillators/noise: 70 ms draw click, 110 ms swap chirp, 180 ms original result cue. Gesture-resume, mute/volume, silence hidden tabs; drop stale cues. [16] |

Signature storyboard: caller faces lead at 0 ms with 180 ms `scaleX(1→0→1)`; reveal at midpoint. Other hands support at 40/70/90 ms with the same duration: nonuniform overlap, complete within 270 ms. Result opacity starts at 180 ms/100 ms. Local particles/audio decorate the impact; table, names and controls remain still.

GSAP timeline labels and React cleanup own that sequence. A new revision cancels stale effects; resize/reconnect skips travel, not state. Reduced motion collapses stagger into a simultaneous 100 ms fade, removes shake/particles and preserves legal information windows. [8] [9] Springs are unnecessary without dragging; a later optional drag can use Pointer Events/capture and `mass:1, stiffness:100, damping:10` momentum handoff, retaining tap/keyboard.

Three.js CRT requires render targets/composer passes and cannot postprocess DOM cards directly. [17] At most stationary 4%-opacity CSS scanlines **behind** cards/text. Reject bloom, chromatic aberration, fisheye, moving grain, ScrollTrigger and SplitText in gameplay.

## 6. Edge cases, security, privacy and boundaries

| Threat/failure | Mitigation and honest limit |
| --- | --- |
| Hidden-value leak | Test snapshots, events, reconnect, errors, logs and bundle. No deck IDs/order/seeds, value-coded IDs or active-hand replay history. Legal observations can still be recorded. |
| Forged/replayed action | Typed allowlist; server seat/epoch; idempotent IDs/revisions; 4 KB messages; rate/connection bounds; Origin allowlist plus authentication. CORS alone does not authorize WebSockets. |
| Refresh/disconnect | 30-second grace, at most one current-turn pause per seat/hand; then labeled honest bot. Reclaim only at next own-turn boundary. Lost/expired token means recovery UI, not guessed identity. |
| Timer during partial action | 35-second default; server deadlines. Timeout discards held deck card/skips optional power; mandatory discard replacement targets last occupied slot. Lobby can agree a longer timer. |
| Bot cheating | Pass only filtered view and legitimate observation memory. Test identical bot actions for identical information/seed despite different unseen values. No LLM/omniscient heuristic. |
| Resume/room failure | Rehydrate persisted phase, pending draw, deadlines and dedup receipts; bounded idle expiry; prevent old-match commands. Test forced eviction, not only refresh. |
| Abuse/privacy | Plain-text bounded nicknames, no HTML/chat; no spectators initially; create/join throttles. Redacted operational logs; delete expired room data. No secure-client/collusion guarantee. |

IP: U.S. Copyright Office distinguishes unprotected game ideas/methods from protected rule text/art; names can raise trademark concerns. [18] [19] Use an original, subsequently cleared title and neutral “memory-and-swap card game” description. CABO is an existing commercial identity, not a safe brand merely because rules are reusable. No registry clearance or international legal opinion was completed. Entirely original art/audio/lettering: **no plumber, mushrooms, pipes, power-up icons, Nintendo fonts, sprites or music; no scanned CABO art or publisher prose**. An inspired bump is acceptable as original motion, not borrowed assets.

## 7. Build plan and 90-second demo

Apply `build-principles` thin slices and `poteto-agent-code-quality` cheapest-layer-first pyramid. First make leaks difficult through server-only types/serializer; then lint import boundaries and test reducers; then run real browsers. Prose reminders are last, not security controls.

| Slice | Minutes | Proof before proceeding |
| --- | --- | --- |
| 1. Deployment/room tracer | 20 | Health/WSS plus two isolated browsers join/ready/start same room; stale socket loses authority. |
| 2. Complete plain hand | 35 | Draw/replace/call/final-turn/reveal tests; real browsers finish; no hidden fields on wire. Temporary scaffold, not advertised full CABO. |
| 3. Canonical four-hand match | 35 | Powers, failed matching, deck exhaustion, caller ties/+10/Kamikaze; winner/rematch. Property checks conserve cards and serialize legal transitions. |
| 4. Bot/recovery | 25 | Solo match; noninterference bot test; dropped acknowledgements, partial-turn refresh and forced hibernation recover. |
| 5. Original responsive skin | 20 | Compact/desktop/zoom/keyboard/high-contrast checks; no layout-induced memory reorder. |
| 6. Reveal Receipt/effects | 15 | Server-gated post-hand receipt; reduced motion, rapid input, resize interruption; no private live-history leak. |
| 7. Release proof | 15 | Typecheck/build/tests, published two-client match, reconnect, room isolation and rematch; preserve checkpoint. No risky late additions. |

90-second live script: 0–10 join from two isolated browsers; 10–20 ready/deal/private look; 20–45 play first hand with draw/swap/call; 45–70 accelerate remaining hands through legal early calls, skipping optional replays; 70–85 winner/Receipt; 85–90 rematch. Explain that early calls shorten this demonstration, not normal strategy. If timing slips, edit a real full-match recording rather than fake completion. Save wire payload/test evidence separately from pretty footage.

## 8. Manus leverage

Parent-only: `webdev-mcp` initializes/previews/checkpoints/publishes after the explicit custom-web versus managed-Game decision. Managed Game uses `generic-multiplayer` and saved Cloud Computer selection; do not initialize merely to expose a purchase panel. Browser Operator/desktop-in-app-browser tests two identities and records actual outcomes. Video Editor assembles the 15-second beat from real capture.

Skills: `webdev`/`webdev-worklocally` for authorized setup; Durable Objects/Workers best practices for generated binding types, current compatibility date, server-only secrets, awaited durable writes and private source maps; build-principles/poteto for checks before parallelizing UI/art. No runtime LLM is required. [20]

`game-asset-catalog` offers `webdev.search_game_assets`/`access_game_assets`, metadata and selective retrieval after init/approval. Under **everything original**, do not reuse catalog sprites, fonts or SFX; reuse template networking/code patterns, not art. If Wilson later relaxes that restriction, preserve asset-specific licences/notices and never promise risk-free clearance. Original generated visual assets can use parent `manus-tools` only within approved sourcing scope; WebAudio avoids music-credit dependence.

## 9. Socratic probe set

| Subskill | Level 5: can teach and handle the edge case |
| --- | --- |
| Rules specification | Reconciles editions and derives caller ties, failed matches and exhaustion without silent rule changes. |
| Information security | Designs per-seat projections and proves reconnect/events/bot paths do not disclose unseen cards. |
| Authoritative transitions | Explains stale/replayed/late commands and proves one draw despite lost acknowledgement. |
| Lifecycle/recovery | Restores a partial turn after hibernation; distinguishes durable state from socket attachments. |
| Bot epistemics | Builds policy from legal knowledge and demonstrates unseen-state noninterference. |
| Interaction/motion | Preserves spatial memory and access across keyboard, zoom, reduced motion and interruption. |
| Delivery judgment | Chooses a hosting route from evidence and proves published WSS/full-match play before polishing. |

Four diagnostics, easy → hard: (1) What does a drawn 9 permit, and why not a discarded hand 9? (2) Caller ties lowest: who scores zero, and who still gets a final turn? (3) Why is sending all cards with `faceDown:true` unsafe? (4) A draw commits but acknowledgement disappears and the DO hibernates: what makes retry safe?

Two adversarial probes: (5) “Our server bot only uses legal moves”—why does that not establish fairness? (6) Why should a referee trust reconnect privacy or a permanent link if you tested only two local tabs?

## 10. Open questions, confidence and recommendation

Ask at most three: Does Wilson prefer approved DOM/Cloudflare or integrated Game/paid computer? Is “Arcade Four” acceptable versus full >100 play? Is LOWKEY merely a working title pending clearance?

Confidence: high on rules reconciliation/filtered architecture; medium on 90-minute timing until hosting is tested; medium on Inspora’s perceived motion because source inspection was not GUI playback; no trademark-clearance confidence.

**Devil’s advocate:** CABO memory complexity plus networking can consume the session, and DOM may miss the obvious Game Dev leverage. Answer: use one versioned rules contract and deploy first; if credentials/setup block the tracer slice, choose the integrated managed route or another problem—not mock multiplayer. Cut shaders, snap, accounts and rich art before cutting recovery or legal transitions. First three slices are deployed shared room, complete hand, canonical four-hand match. Then earn bot/recovery and one reveal; publish only after the two-client proof.

## References

[1]: https://board-game-rules.com/wp-content/uploads/2025/01/cabo_Official-Rules.pdf "Bezier 2019 official rule sheet mirror"
[2]: http://www.smiling-monster.de/spiele/smg007/download/SMG-Cabo-EN.pdf "Original publisher English rules"
[3]: https://whatsericplaying.com/2019/03/25/cabo/ "Eric second-edition review"
[4]: https://cardrulesplus.com/games/cabo/ "Independent CABO summary"
[5]: https://beziergames.com/pages/cabo "Publisher short-game and expert options"
[6]: https://www.inspora.design/ "Inspora live design reference"
[7]: https://gsap.com/docs/v3/Plugins/Flip/ "GSAP Flip documentation"
[8]: https://gsap.com/docs/v3/GSAP/gsap.timeline%28%29/ "GSAP timeline documentation"
[9]: https://gsap.com/resources/React/ "GSAP React cleanup guidance"
[10]: https://docs.colyseus.io/state/view "Colyseus StateView visibility"
[11]: https://developers.cloudflare.com/durable-objects/best-practices/websockets/ "Cloudflare WebSocket hibernation"
[12]: https://docs.partykit.io/guides/migrate-to-partyserver/ "PartyKit shutdown and PartyServer migration"
[13]: https://manus.im/blog/introducing-manus-2-0 "Official Manus 2.0 capabilities"
[14]: https://github.com/websockets/ws "Node ws documentation"
[15]: https://developers.cloudflare.com/durable-objects/platform/pricing/ "Current Durable Objects pricing"
[16]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices "WebAudio best practices"
[17]: https://threejs.org/manual/en/post-processing.html "Three.js composer and postprocessing"
[18]: https://www.copyright.gov/register/tx-games.html "Copyright Office games guidance"
[19]: https://www.uspto.gov/trademarks/search "USPTO search and clearance guidance"
[20]: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/ "Current Workers production practices"
