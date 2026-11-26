# CABO — the ink table: feature map

## Find a table

A spacious lobby has a procedural poker-card fan, name, Quick four-round or Classic-to-100 selection, immediate solo play with Pip, and an invitation action. Joining is progressively disclosed under “Have a room code?”. Invite links prefill the six-character selector. A native rules dialog is available from every screen.

## Remember and play

Tap two own cards, then explicitly hide them. Draw privately from the deck only, or call CABO. The discard pile is for discarding only. Replace an own card by tapping it. “Match several” enters deliberate multi-selection. Stable slots remain after matching removes cards; long penalty hands scroll instead of shrinking controls.

Deck-drawn power cards, when discarded, open a 2.5-second authoritative stacking window before starting one of four different actions: **Peek own** (7/8), **Peek other** (9/10), **Blind swap** (J), and **Look + swap?** (Q). No stack starts the discarder’s power; a same-rank stack cancels it and gives the stacker that power, with a separate acting player but unchanged ordinary turn accounting (no `usePower` flag, see RULES.md). A wrong rank adds one hidden deck penalty card; late/ineligible attempts have no penalty. The discard moment shows **Stack** and a pending countdown, and transfer announces cancellation/winning. Exact duration, self-stacking and chains remain provisional. A Jack requires a swap when any legal pair exists. Queen privately shows one card from each hand, then presents explicit Swap/Keep buttons. No reveal timeout or implicit choice exists.

## Finish a round or match

Calling consumes a turn and gives the opponent one final turn. The score sheet distinguishes the card sum, call result and cumulative totals. No Kamikaze or jokers. Both players consent to the next round or rematch. Quick lasts exactly four rounds; Classic retains the one-time exact-100 reset and >100 finish. Cross-match persistence is not implemented.

## Play together

Two actual browser connections share one authoritative room. The server sends only each seat's filtered view; hidden rank/suit/color/value and all internal card IDs are absent. A token resumes a disconnected seat; pauses and the 30-second deadline remain. Stale revisions, wrong-turn moves and client-state injection reject. Table chat is bounded plain text, delivered over the same socket, escaped in the UI and not end-to-end encrypted. It does not pretend to be an AI conversation.

## Make it comfortable

System typography, >=44px controls, keyboard focus and shortcuts, native dialog dismissal, system light/dark colors and reduced motion. Avatars are separate from cards. Original synthesized sound starts off. Every card is an actual native button with an SVG face/back and a descriptive accessible label. There is no GPU-dependent fallback: the normal path is DOM/SVG.

## What the artwork contributes

Original procedural SVG gives traditional mirrored rank indices, red hearts/diamonds, black spades/clubs, correct pip arrangements, double-ended J/Q/K drawings, ivory card stock and an ornamental back. Seeded grain and wobbly table lines preserve paper/ink character. Small WAAPI card translations explain draw/swap/reveal, can be interrupted, and never block input or advance state.

## Not claimed

No public deployment, durable database, account system, matchmaking, wagers, 3+ players, production security audit, anti-collusion, cryptographic fair-shuffle proof, action receipt ledger, offline-install service worker, Apple font distribution, copied publisher artwork, official affiliation, or physical-device Safari certification. The host sees all cards; solo authority is local. This is the explicitly plain-local prototype, not a reinitialized managed project.
