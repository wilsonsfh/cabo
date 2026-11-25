# P2 — Cabo: design rationale

**Rename note:** Cabo, formerly LOWKEY, follows Wilson's 23:21 directive; title, wordmark and refreshed captures use Cabo. [^final-style]

## 1. Summary and evidence boundary

IMPLEMENTED: Problem 2 asks for a genuinely networked browser game with joining, starting, playing, finishing and replay. Cabo is now a two-seat CABO prototype with a pure rules engine, memory-only Pip bot, authoritative WebSocket rooms, native DOM/SVG poker cards and a hand-drawn waterside environment. The final correction implements deck-only draws, automatic powers on drawn-card discard and same-rank stacking. A genuine seeded celebration replay is available at `/?demo=celebrate`. Verification is TESTED-REPORTED, not independently re-run here. [^requirements] [^final-rules] [^final-style] [^verified]

All source paths are relative to `/home/ubuntu/AI-round`. Current claims refer to `analysis/p2-prototype/`; archived material is historical evidence only. IMPLEMENTED means code exists, not that every claim has runtime proof. TESTED-REPORTED means the owner's evidence reports a result. No tests, servers, browsers or installers were run by this documentation agent. These previously protected documents now consume the final 23:17 rules and 23:47 environment handoffs. [^docbrief] [^refresh] [^verified] [^env-ready]

## 2. Wilson's directives that shaped this problem

Chat directives outweigh earlier markdown. Times below are Wilson's +08 directive times supplied to this refresh; citations identify the saved requirements or resulting implementation, not an invented complete chat transcript. [^refresh] [^items]

| Time, 25 Nov | Directive | Final decision and evidence | Status label |
| --- | --- | --- | --- |
| 21:5x | Q2 was the benchmark; improve the other products | Historical user feedback, not a comparative design test. [^wilson] | TESTED-REPORTED |
| 22:00 | Recognisable poker cards; powers shown | Mirrored indices, suits, pips, court figures, backs and explicit power descriptions. [^items] [^cards-final] | IMPLEMENTED |
| 22:17 | No Jokers, no Kamikaze; standard 52-card deck | Red K −1, black K 13; 7/8 own peek, 9/10 opponent peek, Q look then optional swap, J mandatory blind swap. The later correction supersedes optional activation. [^items] [^final-rules] | IMPLEMENTED |
| 22:18 | Hand-drawn SVG, Unfold direction | Seeded wobble/hatching/washes replace the low-resolution 3D table; no WebGL requirement. [^cloud] [^final-style] | IMPLEMENTED |
| 22:21 | Q7 gold standard | Scale, spacing, system typography and illustration craft, not Q7's architectural identity. [^cloud] [^final-style] | IMPLEMENTED |
| 22:41 | Hub v3 gold standard | Competing-choice hover fade, under-word highlight, larger actions and ink diamond wordmark; kit read at 22:47. [^final-style] | IMPLEMENTED |
| 22:52 | Deck-only draws; drawn-power discard uses it; other-player same-rank stacking | Automatic activation replaces `usePower`; stacking assumptions remain explicit. Supplied daniildesigns before/after video becomes pond/trees/house/rain/animals, not copied art. [^final-rules] [^rule-delta] [^video-notes] | IMPLEMENTED |
| 23:09 | End-of-game celebration | 26 seeded ink-confetti paths, duck/cat/bird cheers, rain clearing to sun; static reduced-motion equivalent. [^final-style] [^environment] | IMPLEMENTED |
| 23:12 | humans& anchor | Restraint and recognisable mascots are the reference guidance; the suggested ink/block dissolve and winner-only accent are not verified implementations here. [^humans] [^environment] | PROPOSED |
| 23:21 | Rename to Cabo | Visible title/wordmark and final 24 captures renamed. [^final-style] [^env-ready] | IMPLEMENTED |
| 23:33 | Every graphic reflects its own product | Original Cabo world, poker faces and power footers; no generic external placeholder requests in final audit. [^humans] [^final-style] [^env-checks] | TESTED-REPORTED |
| Context rule | 200–400k context where relevant | No runtime model/context window in this deterministic game; builder-context compliance is unknown, not a game feature. [^refresh] [^engine] [^server] | UNKNOWN |

TESTED-REPORTED: the first runnable restyle milestone was recorded at 22:41, rules correction at 23:17, and final environment handoff at 23:47. They are separate evidence checkpoints, not one combined certification. [^final-style] [^verified] [^env-ready]

## 3. Product and design decisions

| Decision | Alternatives considered | Reason and evidence | Status label |
| --- | --- | --- | --- |
| Native SVG poker table and waterside world | Retain the procedural Three.js island; canvas-only controls | Later SVG direction wins: crisp faces, native controls and no GPU requirement. Historical Three/GSAP vendors are retained but not loaded. [^final-style] [^vendor] | IMPLEMENTED |
| Two seats first | Analyst's two-to-four-player scope | The builder prompt said two first; `createGame` rejects other counts. [^launch] [^engine] | IMPLEMENTED |
| Quick four rounds as default | Classic until a score exceeds 100 | Quick has no exact-100 reset or early >100 ending; Classic remains selectable. [^rules] [^entry] | IMPLEMENTED |
| Wilson's corrected deck and powers | Publisher-value deck, Jokers, Kamikaze, optional activation | Standard 52 cards and asymmetric Kings; discard of the draw automatically triggers its power, exchange never does. Queen explicitly decides after one selected pair; Jack cannot skip a legal pair. [^final-rules] [^engine] | IMPLEMENTED |
| Deck-only draw affordance | Clickable public discard; separate power button | Discard is an output pile, never a draw target; obsolete fields/shortcuts rejected or removed. [^rule-delta] [^app] | IMPLEMENTED |
| Same-rank other-player stacking | Same-value stacking; penalty on miss; stacked powers | Public success leaves a hole without changing turns. No stacked power and no penalty are Coordinator assumptions; self/window/chain boundaries remain provisional. [^final-rules] | IMPLEMENTED |
| Stable numbered slots | Repacking hands after matching | Empty slots remain after successful matching, preserving spatial memory. [^engine] [^feature] | IMPLEMENTED |
| Tap first, deliberate multi-select | Dragging and ambiguous multiple-card taps | The owner says the gesture reference led to rejecting drag; ordinary taps exchange one card. [^review] [^app] | IMPLEMENTED |
| Explicit Hide for private information | Auto-dismiss timers | Accessibility/cognitive guidance became a user-controlled reveal phase and acknowledgement action. [^review] [^engine] | IMPLEMENTED |
| No input gate for cosmetic effects | Camera tours or animation-completion events | The reducer changes state synchronously; rendering consumes the resulting view. [^statechart] [^scene] | IMPLEMENTED |
| Original card flair, indices kept clear | Rank mascots over indices; downloaded publisher faces | Ivory stock, double-ink edge, plum medallion/mint/moon backs, conventional pips/courts; avatars remain separate. 26 face footers avoid pip/index zones. [^cards-final] [^env-checks] | TESTED-REPORTED |
| Sparse transform/opacity ambience | Continuous scene render loop; animated path deformation | One rain compositor sheet; separate wide/pocket drawings, visibility pause and static reduced motion. [^environment] [^final-style] | IMPLEMENTED |
| Genuine seeded final-state celebration | Fabricated winner screen; require a complete manual match | URL-only replay reduces a four-round local match, then renders its filtered result; ~4-second cleanup and static sun/splash fallback. It is not network-match evidence. [^scene] [^env-checks] | IMPLEMENTED |
| Optional synthesized sound; bounded online chat | Borrowed audio; pretend bot chat | Original WebAudio remains opt-in; chat is plain text, online-only, RAM-only and not end-to-end encrypted. [^audio] [^server] [^app] | IMPLEMENTED |
| Complete room loop before polish | Accounts, matchmaking and broad content | Build slices put engine, solo and real rooms ahead of effects. [^progress] [^launch] | IMPLEMENTED |
| No Reveal Receipt or persistent streaks | Analyst's signature post-hand replay | These were explicitly cut rather than presented as working features; current code adds celebration, not receipts. [^analyst] [^historic-readme] [^scene] | DEFERRED |
| Local prototype, not managed publication | Managed Manus Game or Durable Objects | Owner delivered the explicitly requested folder; public persistence and Cloudflare port were not built. [^readme] | DEFERRED |

## 4. How it was built and judged

### People, jobs and budgets

| Role | Evidence and contribution | Duration | Turns and credits | Status label |
| --- | --- | --- | --- | --- |
| P2 analyst | `4ac400b00c7e_a9`; rules reconciliation, networking alternatives, working name and DOM proposal. [^cards] [^analyst] | 1093 seconds reported | unknown; not present in the saved card summary | TESTED-REPORTED |
| P2 builder | `615aa5e23d09_a0`; implemented engine, room server, island, bot and verification artifacts. [^cards] [^progress] | Agent 2191 seconds; workflow 2197 seconds reported | unknown; not preserved for P2 | TESTED-REPORTED |
| Build lead | Wrote the shared brief/workflow and later audited design-reference use; no P2 source edit is attributed to the lead without a record. [^cards] | unknown | unknown | UNKNOWN |
| Restyle owner | Deck/court SVG, DOM/WAAPI table, typography, chat, local bundle and first visual verification; newer job ID absent from changelog. [^final-style] | unknown | unknown | IMPLEMENTED |
| Rules-correction owner | Engine/server/controller/transport, isolated rules CSS and regression evidence; newer job ID absent from changelog. [^rule-delta] [^verified] | unknown | unknown | IMPLEMENTED |
| Environment owner | Environment/card flair, celebration/rename/footer refinement and final 136-assertion audit; newer job ID absent from handoff. [^final-style] [^env-ready] | Final pass 23:40–23:46 reported | unknown | TESTED-REPORTED |

IMPLEMENTED: the launch used one requested builder call, with an effective allowance of three; the saved script contains one `agent(...)` call. This is orchestration evidence, not a complete builder tool trace. [^launch]

PROPOSED at launch: engine first, then solo 3D, real two-player WebSockets, polish, and stretch only if time remained. The owner reports reserving the final 15 minutes for verification and building in those slices. This is a reported process, not measured time allocation by activity. [^launch] [^progress]

IMPLEMENTED: the original builder aligned Quick to exactly four rounds and initially superseded the analyst's DOM-only recommendation because of the earlier Three.js direction. The final SVG/DOM direction supersedes that rendering choice, not the real room loop. These are owner-reported changes, not lead-authored fixes. [^progress] [^final-style]

IMPLEMENTED: original screenshot review corrected labels and Shift-digit handling. Later review fixed setup selection being cleared by peer readiness, Quick/slot-label fit, one-primary matching actions, close-time reconnect timers and result-grid placement. The original faceted inset is historical, not current art. [^review] [^final-style] [^css] [^app]

TESTED-REPORTED: final rule and environment outcomes are itemised below; archived 23-test/203-action results and intermediate restyle counts must not be substituted for corrected-engine verification. [^verified] [^env-ready] [^rule-delta]

UNKNOWN: the saved P2 job card has only partial recent-activity evidence and no full transcript. The lead's earlier design audit is listed, but this evidence does not establish a separate line-by-line P2 code review or lead modification. [^cards]

## 5. Tools available versus tools actually used

### Actually used or explicitly owner-reported

- TESTED-REPORTED: tool classes `read`, `write` and `exec` appear in the preserved partial P2 activity account; Apple motion/feedback reads and HTTP tests are named, but the exact activity lines are missing. [^cards]
- IMPLEMENTED: shell/Node-driven verification exists as engine, integration and Chrome/CDP scripts; saved results support their reported execution. This is not evidence of a browser MCP call. [^engine-results] [^network-results] [^browser-script] [^browser-results]
- TESTED-REPORTED: the owner opened library/rules sources and Inspora, including a headless rendered Inspora visit; the driver and report record navigation, computed font/background, pointer movement and scrolling. The exact search/fetch tool used for other sources is unknown. [^review] [^browser-script] [^browser-report]
- IMPLEMENTED: the parent used workflow orchestration to launch this builder and the preceding analyst workflow. The saved launch files establish the parent operation, not builder access to that MCP. [^launch] [^analysis-launch]
- TESTED-REPORTED: the restyle owner records search/fetch and first-hand locked headless Chromium visits to Inspora/Superlist; exact research MCP unknown. Later Python Playwright/Chromium runs use the shared lock, not an MCP browser. [^final-style] [^test-readme] [^verified]
- TESTED-REPORTED: the environment owner used `manus-analyze-video` on the supplied before/after reference. This is AI-assisted visual interpretation, not frame-by-frame manual analysis. [^video-notes]

### Available but unverified for this builder

- UNKNOWN: the lead session had `read`, `write`, `edit`, `exec`, `search`, `fetch`, `mcp`, `job` and `ask`. Builder access to any unrecorded class cannot be inferred from that parent inventory. [^docbrief]
- UNKNOWN: the parent inventory included exa, manus-device, manus-tools, desktop-in-app-browser, kkday, slides, handoff, manus-tasks, triggers, trip, video-editor, webdev-mcp and workflow. No P2-specific call to these, except the parent's workflow launch, is established. [^docbrief] [^launch]

## 6. MCPs and skills: evidence tiers

| Resource | What the evidence establishes | Status label |
| --- | --- | --- |
| Poteto agent code quality | Instructed in launch; owner says read and names explicit reducer/allowlisted views/tests. Code has those boundaries plus FEATURE-MAP and STATECHART. This does not imply lint, formal verification or a security audit. [^launch] [^progress] [^engine] | IMPLEMENTED |
| Build principles | Instructed; owner reports reading, slices and final verification reservation. Precise time spent by phase is unknown. [^launch] [^progress] | TESTED-REPORTED |
| Emil design/animation skills | Owner names emil-design-eng, animate/RECIPES, choreograph/RECIPES, gestures, animation-performance, review/STANDARDS, break-ui/CATALOG and prototype/PICKER, with concrete choices. [^review] | IMPLEMENTED |
| Dickwu Apple design skill/HIG | Owner names accessibility, layout, typography, color, macOS/cross-platform, motion, feedback and games/controls; partial card evidence additionally names motion/feedback reads. [^review] [^cards] | IMPLEMENTED |
| Durable Objects skill | Originally instructed and owner-reported read; archived README proposes a future one-room adapter, but no Cloudflare implementation exists in the final prototype. [^launch] [^progress] [^historic-readme] | PROPOSED |
| Webdev and game-asset-catalog skills | Originally instructed for future parent reuse; archived README describes the managed-Game contract/catalog restriction. Complete reading is unknown; no initialization, retrieval or publication is claimed. [^launch] [^historic-readme] | UNKNOWN |
| Socratic build coach | Original use unknown; restyle owner explicitly reports reading the adapted coach for internal scope judgment. [^launch] [^final-style] | TESTED-REPORTED |
| exa and other research MCPs | No saved P2 server/tool call evidence; opened URLs do not identify the underlying MCP. [^cards] [^docbrief] | UNKNOWN |
| Asset-generation, slides, video or deployment MCPs | Baseline art/audio is procedural and local; no such P2 operation is documented. This means no verified use, not proof of every absent call. [^readme] [^scene] [^audio] | UNKNOWN |

TESTED-REPORTED: the later owner names build-principles, Poteto, Emil design engineering and Apple design skill as read and applied. Unfold, Q7 implementation and Hub-v3 kit/helper reads are recorded separately. The humans& anchor exists in shared lead notes; direct reading by the Cabo owners is unknown. [^final-style] [^humans]

## 7. Code mode: two different meanings

IMPLEMENTED: sense (b), a JavaScript workflow orchestration script, was used by the parent to launch P2. It is not a feature of Cabo. [^launch]

UNKNOWN: sense (a), generated sandbox scripts as an agent harness, is not documented for the P2 builder. Cabo's runtime is a deterministic game plus WebSocket transport, not the Patchbay code-mode harness. Whether the builder batched development tool calls in a code-mode pattern is unknown. [^engine] [^server] [^docbrief]

## 8. External websites consulted

These are owner/analyst-reported consultations. No fresh external lookup was made for this documentation pass. [^docbrief] [^review] [^analyst]

| Source | Specific role and evidence | Status label |
| --- | --- | --- |
| `https://www.inspora.design/` | Builder rendered archive and recorded style/pointer/scroll observations; analyst inspected source, without GUI playback. [^review] [^browser-report] [^analyst] | TESTED-REPORTED |
| `https://threejs.org/docs/pages/RenderPixelatedPass.html` | Evaluated and rejected multipass approach. [^review] | TESTED-REPORTED |
| `https://threejs.org/docs/pages/Raycaster.html` | Historical picking API; original archived scene used `setFromCamera` and `intersectObjects`, not final PaperTable. [^review] [^oldscene] | IMPLEMENTED |
| `https://threejs.org/docs/pages/CSS2DRenderer.html` | Extraction partial; owner used installed-source zoom caveat to reject it. [^review] | TESTED-REPORTED |
| `https://threejs.org/manual/en/rendering-on-demand.html` | Historical coalesced RAF/tween-triggered renderer, now replaced by DOM/WAAPI. [^review] [^oldscene] | IMPLEMENTED |
| `https://gsap.com/docs/v3/GSAP/Timeline/` | Timelines, interruption and current API consultation. [^review] | TESTED-REPORTED |
| `https://gsap.com/docs/v3/GSAP/gsap.to/` | Request challenged; Timeline and installed source substituted. Do not describe it as successfully read. [^review] | UNKNOWN |
| Bezier Cabo page; board-game-rules 2019 PDF; Spelhuis Deluxe PDF | Canonical hand/scoring/short-session evidence; URLs are listed in owner review. [^rules] [^review] | TESTED-REPORTED |
| Trey Hunner and Father Geek Cabo articles | Builder comparison with older/different variants; not used to override canonical sheet. [^rules] | TESTED-REPORTED |
| Eric's CABO review and CardRules+ | Analyst reconciliation, referenced by builder. This is analyst consultation, not proof the builder visited each. [^rules] [^analyst] | TESTED-REPORTED |

The Three/GSAP API consultations above are historical decisions, not dependencies loaded by the final UI. Publisher pages no longer override Wilson's corrected rule contract. Later sources are Superlist's live homepage and the Caveat OFL source; the supplied daniildesigns video (`hnd_XG2wKd65KUznjlKvRljjLfay` in the delegated directive) is analysed in the local video notes. No fresh external lookup was made here. [^final-style] [^vendor] [^video-notes] [^final-rules]

## 9. Resources check: what actually changed

| Resource | Used? | Evidence | Concrete change in P2 | What it did NOT change |
| --- | --- | --- | --- | --- |
| Inspora | yes | Original research/capture plus later `tests/evidence/reference-study.json`; restyle References actually used. [^review] [^final-style] | IMPLEMENTED: restrained artwork-first hierarchy; later partial gallery visit confirmed Superlist as featured, whose heavy heading/space/one-action hierarchy informed the final lobby. | Not every gallery item loaded; no copied assets or proof that Inspora created the waterside identity. |
| Apple design skill | yes | Original named HIG pages; later owner read report and final controls/reveal code. [^review] [^final-style] [^app] [^css] | IMPLEMENTED: explicit Hide, focus/keyboard, text with color; later system appearance, generous controls and reduced motion. Final rules layer imposes 52px minimum buttons. | No complete later HIG review, native app, Mac runtime, physical-phone, VoiceOver or zoom certification. Dark appearance is now built. |
| Emil Kowalski skills | yes | Original named recipes; later read report, `scene.mjs`, `style.css`, `rules.css`. [^review] [^final-style] [^scene] [^rules-css] | IMPLEMENTED: retained .97/160ms custom-ease press and fine-pointer hover; final card motion is interruptible 280ms WAAPI, not historical GSAP timings. Matching mode has one primary action. | No drag/spring system, ScrollTrigger or forced camera choreography; art identity is supplied by product/Unfold/Hub/video direction. |

IMPLEMENTED: the references changed more than token names: input frequency, dismissal agency, spatial consistency and motion cancellation have code counterparts. Composition influence is owner-reported for Inspora; it should not be expanded into a claim that references alone produced the product's identity. [^review] [^scene] [^app]

## 10. Design critique and gaps

TESTED-REPORTED: Wilson previously praised Q2 and used it as the benchmark while asking to improve Q1, Q3 and Q4. The saved Coordinator message names that judgment; it is user feedback, not a comparative design test. [^wilson]

IMPLEMENTED: the final design follows Q7/Hub scale and craft while keeping an ink-poker-table identity. The heavy headline, recognisable cards and calm world provide hierarchy; footers communicate actual powers rather than decorative rank mascots. This is a source-grounded design reading, not a new visual certification. [^cloud] [^css] [^cards-final] [^final-style]

TESTED-REPORTED: 24 final captures and 136 environment assertions cover the renamed scene, unobstructed indices/avatars/discard, six width/theme combinations, call/result mood and celebration lifecycle. The final environment owner did not rerun the full two-peer suite; its evidence remains the rules owner's earlier run. [^env-ready] [^env-checks] [^verified]

IMPLEMENTED: compact utility labels still exist, including small mobile slot/seat copy, even though main actions and headlines are substantially larger. Long penalty hands scroll; the environment is noninteractive behind the controls. No claim that all text is large or that overflow/contrast checks certify accessibility. [^css] [^app] [^env-checks]

### Final-state test table

Every row is TESTED-REPORTED and owner-run; documentation-agent re-run: **no**. Counts are separate checks, not a deduplicated total. [^verified] [^env-ready]

| File/check | Count and owner | What it establishes / does not prove |
| --- | --- | --- |
| `tests/engine.test.mjs` + `tests/boundaries.test.mjs` | Rules owner: 36 + 6 = 42/42; environment owner final repeat 42/42. [^verified] [^final-style] | Rule/invariant/privacy/SVG/server boundary regressions; not exhaustive states or a security audit. |
| Engine bot simulation in same suite | Rules owner: 1,000 Classic games, 433,800 actions, 8,795 Q decisions, 8,258 J swaps, 12,971 stacks. [^verified] | Sampled legal termination/conservation/views; not proof all strategies terminate or a live AI model. |
| `tests/integration.mjs`, `rules-integration-results.txt` | Rules owner: 16/16, four rounds, 169 submissions, 7 stacks and 1 private miss. [^verified] | Real sockets and privacy/lifecycle; not public deployment/load. |
| `tests/browser.py`, `rules-browser-report.json` | Rules owner: 22/22, four rounds, 132 actions, 4 stacks. [^verified] | Two independent Chromium contexts; not final-environment two-peer re-run or Mac/Safari proof. |
| `tests/polish.py`, `rules-polish-actions-report.json` | Rules owner: 48/48. [^verified] | Automatic powers, Jack/Queen, deterministic stacks, keyboard, targets; not every layout/device. |
| `tests/smoke.py`, rules smoke and `_env-smoke-final.log` | Rules owner 7/7; environment owner separate final 7/7 on 5818. [^verified] [^final-style] | Complete solo round; not a full Quick network match. |
| `_env-verify.py`, `shots/environment-checks.json` | Environment owner: 136 assertions; 24 refreshed captures; 26 correct face footers. [^env-ready] [^env-checks] | Responsive scene/lifecycle/errors/requests; not native-GPU or complete accessibility certification. |
| Environment cadence/motion records | Environment owner: 240 frames per condition. [^env-checks] [^cadence] | Software rAF cadence only; synthetic card cycle is not a played engine action; occasional >25ms frames occurred. |
| `npm run check`, rules syntax record | Rules owner: 6 Node modules + 3 Python driver compile checks. [^verified] | Parse validity, not gameplay or every new environment module's behavior. |

### Honest limits

- UNKNOWN: rendering evidence is Sandbox headless/software Chromium only; Mac final runtime, native-GPU frames, sustained gameplay and physical-device Safari are untested in this final pass. [^env-ready]
- UNKNOWN: no independent security/accessibility audit; VoiceOver and 200% zoom remain unverified. Contrast measurements are sampled pairs, not certification. [^readme] [^review] [^final-style]
- IMPLEMENTED: host knows the deck; solo authority is inspectable; modified clients may retain legitimately seen values; seeded shuffle is not cryptographic fairness. [^final-rules]
- IMPLEMENTED: rooms and bounded chat are in memory; chat is not end-to-end encrypted; restart loses rooms and old rule states are not migrated. [^server] [^verified]
- DEFERRED: accounts, matchmaking, durable storage, public TLS deployment, ranked anti-cheat, 3+ seats, persistent receipts/streaks. [^readme] [^feature]
- IMPLEMENTED: Pip is deterministic memory logic, not a live model; promo replay is genuine local simulation, not proof of a human/network match. [^engine] [^scene]

## 11. Open questions and unknowns

- UNKNOWN: P2 analyst/builder turn counts, credits and full tool transcripts are absent from the saved card summary. [^cards]
- UNKNOWN: exact P2 research MCP/server names and complete reading of webdev/catalog skills are unverified. [^cards] [^launch]
- UNKNOWN: development code mode in the original builder remains unverified; later Socratic-coach reading is owner-reported. [^launch] [^final-style]
- UNKNOWN: reports are not linked to a source commit/hash; older result files must not be mistaken for current rule evidence. [^verified] [^test-readme]
- UNKNOWN: commercial name clearance, physical-device performance, zoom and screen-reader quality remain unverified. [^readme] [^review]
- UNKNOWN: confirm stacked powers, wrong-stack penalty, self-stacking, exact window/final-turn boundary and alternating chains. Current choices are implemented, not Wilson-confirmed. Penalty-free private rejection permits a free one-bit probe of an own hidden rank; an unseen-card penalty is PROPOSED only. [^final-rules]
- UNKNOWN: newer restyle/rules/environment job IDs and direct humans& reading are absent from the cited handoffs. [^final-style] [^rule-delta] [^env-ready] [^humans]
- IMPLEMENTED: saved README and raw HTML dialog still contain pre-correction activation/draw wording; `updateRulesCopy()` replaces the dialog at startup. Current metadata is renamed despite the environment handoff's stale metadata warning. Product files were not edited in this documentation pass. [^readme] [^entry] [^app] [^env-ready]

## Evidence notes

[^requirements]: `analysis/_brief.md`, lines 17–19 and 67–69.
[^docbrief]: `analysis/_doc-brief.md`, Hard rules; What the tools picture actually is; Required structure.
[^addendum]: `analysis/_prompts/docs-addendum.md`, lines 3–7.
[^items]: `analysis/_prompts/build-items.json`, item `q2` (line 3).
[^cloud]: `analysis/_design-pass-brief.md`, lines 3–21.
[^cards]: `analysis/_doc-evidence.md`, workflow 4ac400b00c7e; workflow 615aa5e23d09; Things the build lead did itself.
[^launch]: `.manus/mcp-results/mcp-run-ed09eb146b2416398ca89849da3219ad.json`, saved workflow script, binding direction, READ FIRST, pacing, engineering and priority sections.
[^analysis-launch]: `.manus/mcp-results/mcp-run-d7b704e61797c3e6f556265cd3a75e50.json`, saved script `probs` item n=2 and `problemPrompt`.
[^analyst]: `analysis/p2-multiplayer-cabo.md`, sections 1–10, especially Differentiator and identity, rules contract, architecture and Inspora translated.
[^wilson]: `.manus/mcp-results/mcp-list_task_messages-b5d25b538f26fd5bf392fd0437491e00.json`, message `OjwPFXgmFKgx61r8G2zpb5`, Coordinator's saved Q2 benchmark feedback.
[^readme]: `analysis/p2-prototype/README.md`, Start, Architecture and limits; rule/keyboard paragraphs are pre-correction and superseded by RULES.md.
[^review]: `_archive/pre-restyle-2217/p2-prototype/DESIGN-REVIEW.md`, Research translated into choices; Exact motion application; Screenshot review and fixes; Why 3D earns its place; Opened sources.
[^progress]: `_archive/pre-restyle-2217/p2-prototype/PROGRESS.md`, Priorities and budget; Research and decisions; 21:14/21:20/Final verification checkpoints; Honest completion boundary.
[^feature]: `analysis/p2-prototype/FEATURE-MAP.md`, retained room loop and explicit non-features; rule-specific wording is superseded by RULES.md.
[^rules]: `analysis/p2-prototype/RULES.md`, Calling, scoring, and matches; historical publisher consultations are in archived DESIGN-REVIEW.md.
[^statechart]: `analysis/p2-prototype/engine.mjs`, reduce/endTurn; `client/scene.mjs`, update.
[^engine]: `analysis/p2-prototype/engine.mjs`, createGame, reduce, viewFor, createBot.
[^server]: `analysis/p2-prototype/server.mjs`, startServer, broadcast, action/chat handlers and cleanup.
[^scene]: `analysis/p2-prototype/client/scene.mjs`, PaperTable and mountCelebrationDemo.
[^app]: `analysis/p2-prototype/client/app.mjs`, updateRulesCopy, pick, render, showResults, keyboard.
[^css]: `analysis/p2-prototype/client/style.css`, typography/controls, Hub follow-up and result-column rules.
[^entry]: `analysis/p2-prototype/client/index.html`, metadata, imports, table, dialog.
[^audio]: `analysis/p2-prototype/client/audio.mjs`, Sound.
[^engine-results]: `_archive/pre-restyle-2217/p2-prototype/tests/engine-results.txt`, lines 6 and 145–153.
[^network-results]: `_archive/pre-restyle-2217/p2-prototype/tests/integration-results.txt`, lines 1–2.
[^browser-results]: `_archive/pre-restyle-2217/p2-prototype/shots/browser-multiplayer-results.txt`, lines 1–28.
[^browser-script]: `_archive/pre-restyle-2217/p2-prototype/tests/browser.mjs`, lines 27–50.
[^browser-report]: `_archive/pre-restyle-2217/p2-prototype/shots/browser-report.json`, checks and errors, lines 11–58.
[^http]: `_archive/pre-restyle-2217/p2-prototype/tests/http-results.txt`, lines 1–11.
[^refresh]: `analysis/_docs-refresh-brief.md`, final-state update, directive/context and no-re-run requirements; delegated Q2 refresh at 23:48 +08 supplies directive timestamps.
[^final-style]: `analysis/p2-prototype/RESTYLE-CHANGELOG.md`, References actually used, Hub-v3 follow-up, Environment and card flair, rename, actual-product check, final regression/handoff.
[^final-rules]: `analysis/p2-prototype/RULES.md`, deck-only draws, automatic powers, same-rank stacking, Open questions and Honest limits.
[^rule-delta]: `analysis/p2-prototype/RULES-CHANGELOG.md`, Before/after, assumptions, ownership and 23:17 results.
[^verified]: `analysis/p2-prototype/VERIFIED.json`, tests, suite_counts, provisional choices and limitations; `tests/evidence/rules-*` artifacts.
[^env-ready]: `analysis/p2-prototype/_env-ready.json`, 23:47 completion, verification, budget and limitations.
[^env-checks]: `analysis/p2-prototype/shots/environment-checks.json`, checks, 24-shot manifest, powerFooters and frameTime; `_env-verify-final.log` records 136 assertions.
[^cadence]: `analysis/p2-prototype/shots/environment-motion-cadence.json`, software-only synthetic card/celebration samples.
[^video-notes]: `analysis/p2-prototype/_ref/environment-video-notes.md`, 18 AI-assisted adaptation findings for the supplied environment video.
[^environment]: `analysis/p2-prototype/client/environment.mjs`, mountEnvironment, setMood, celebrate, reduced/visibility lifecycle and destroy.
[^cards-final]: `analysis/p2-prototype/client/cards.mjs`, cardSVG, court, mirrored indices, POWER_MARKS, back and heroSVG.
[^rules-css]: `analysis/p2-prototype/client/rules.css`, 52px minimum, press/easing, stacking and reduced-motion selectors.
[^vendor]: `analysis/p2-prototype/VENDOR.md`, ws/font provenance and inactive historical Three/GSAP resources.
[^test-readme]: `analysis/p2-prototype/tests/README.md`, current locked Chromium commands and historical-evidence separation.
[^humans]: `analysis/_inspo-notes.md`, humans& anchor rules, Q2 application and 23:25–23:33 directives.
[^historic-readme]: `_archive/pre-restyle-2217/p2-prototype/README.md`, Real versus not built; Durable Objects and Manus handoff.
[^oldscene]: `_archive/pre-restyle-2217/p2-prototype/client/scene.mjs`, historical raycast and demand-rendering implementation.

## Process note

The original analyst (`4ac400b00c7e_a9`) framed the rules/networking options, and builder (`615aa5e23d09_a0`) built the first engine, bot and authoritative room loop. Later owner records divide the work into restyle/card/UI/bundle, rules correction/controller/tests, and environment/flair/celebration/rename/audit passes; their newer job IDs are **UNKNOWN** because the changelogs do not supply them. The lead's saved evidence establishes the briefs, original workflow launches and earlier design-reference audit; shared humans& notes record a contact-sheet review, while the environment owner reports personally reviewing final captures. No undocumented lead code review, native-device test or complete tool transcript is implied. This documentation pass only read evidence and edited these documents. [^cards] [^final-style] [^rule-delta] [^env-ready] [^humans] [^refresh]
