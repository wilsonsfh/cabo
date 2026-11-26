# CABO — corrected two-player CABO rules

**Current implementation: 26 November 2026, 00:04 +08.** This is a local two-player prototype implementing Wilson's requested rules, not an official publisher edition. No Jokers, no Kamikaze, and no additional game mechanics.

## Deck, values, and privacy

Use one standard 52-card deck: hearts, diamonds, clubs, and spades, each containing A, 2–10, J, Q, K. Ace = 1; number cards = face value; Jack = 11; Queen = 12; red Kings (hearts/diamonds) = −1; black Kings (clubs/spades) = 13. There are no zero cards.

Internal cards carry opaque random UUIDs and rank/suit/color/value/orientation. No internal card identity crosses the view boundary, even on public cards. A hidden view contains only its public slot/orientation/temporary status and `value:null`: no rank, suit, color, or ID. Private deck draws are shown only to the drawer. Private powers reveal faces only to their owner. Successful stacks reveal the card publicly; rejected stacks never reveal its identity or face.

## Setup and ordinary turns

Deal four face-down cards to each player and one face-up card to the discard pile. The opening discard is not attributed to either player and creates no stacking opportunity. Each player privately looks at exactly two own cards once, then explicitly hides them. The seeded-random first starter is retained. Later rounds start with the lowest previous-round points; ties resolve clockwise from the prior starter.

On your turn, **draw only from the deck, or call CABO**. The discard pile is for discarding only: never draw from it. The engine rejects any draw source other than `deck` with a clear `RuleError`. Held cards have no source discriminator because only private deck draws can exist.

After drawing, either exchange the drawn card into your hand or discard it. A single-card exchange puts the old card face-up on the discard pile and the drawn card face-down in the selected slot. Exchanging the draw into your hand never starts its power. Replaced power cards do not activate a power either.

## Multiple-card exchanges and holes

You may replace several own cards when their **score values** match. This retained exchange rule differs intentionally from stacking's **same rank** rule. Equal-value cards of different suits match for exchange; red and black Kings do not because −1 and 13 differ.

A successful exchange puts all selected cards face-up on the discard pile, with the last selected card on top. The draw occupies the first selected slot; the remaining selected slots become holes. Existing card positions never slide to close a hole. Only the current top discard creates a stacking opportunity.

An unsuccessful exchange exposes the selected cards in place and adds the drawn card face-down at the end of the hand. Selecting three or four cards also adds one unseen deck penalty card, if available. No penalty is drawn from an empty deck. A failed exchange places no card on the discard pile and opens no new stacking window.

## Power discard and the stacking window

Discarding a just-drawn 7, 8, 9, 10, J, or Q **automatically opens a 2.5-second stacking window**, not an immediate power. If nobody stacks before the deadline, the discarder starts the power. If the other player stacks the same rank before the deadline, the discarder’s pending power is cancelled and the stacker starts that power instead. There is only `{type:"discard"}`: no separate use-power choice or `usePower` flag. An obsolete flag is rejected as an unexpected action field. Keeping/exchanging the drawn power card still means no power.

- **7 / 8 — Peek own:** privately look at one own face-down card, then explicitly Hide (`ack`).
- **9 / 10 — Peek other:** privately look at one opponent face-down card, then explicitly Hide (`ack`).
- **J — Blind swap:** choose one own and one opponent card, swapping without looking. The swap is mandatory for the acting player once the power starts; `skip` is accepted only when no legal pair exists.
- **Q — Look + swap?:** choose one own and one opponent card; privately inspect both without moving them. Then explicitly choose `{type:"swapDecision", swapDecision:true}` to swap that same pair, or `false` to keep both. Either decision hides the reveal and ends the turn. The Queen's swap decision remains optional; its activation on discard does not.

The retained Queen interpretation is one look at one pair followed by one explicit decision about that pair. No retargeting, premature decisions, or hiding/skipping instead of deciding. If no legal pair exists, skip is available. Swaps may target public cards and preserve their face-up/face-down orientation. Peek-only powers reject cards that are already public; their existing skip action remains available. Target slots are public actions, not private faces. Reveals have no timer.

## Same-rank stacking

Use `{type:"stack", slot:<own occupied slot>}` to attempt stacking. The server validates the action against its authoritative state. Any other player, **not the player who placed the current top discard**, may stack one own card of the **same rank**. This applies to normal and power ranks alike; red and black Kings both have rank K and can stack despite differing scores.

A match moves the card face-up onto the discard pile and leaves its original slot as a hole, shrinking the effective hand by one. A stacked J/Q/7/8/9/10 gives the stacker the corresponding power, using the same mandatory/optional choices and private visibility described above. Red/black Kings remain −1/13 and are not powers. The active ordinary turn, caller and final-turn accounting are not stolen by the power actor. When a pending drawn-card power is transferred, its completion ends the **original discarder’s turn once**, not the stacker’s upcoming turn. A stacked power from an ordinary replacement window is an interruption and resumes the existing ordinary turn afterward.

**Window choice:** a power discarded from the deck draw enters `phase:"stacking"` with public `{actor,kind,deadline}` and no private reveal. The deadline is placement time + **2,500 milliseconds**, measured by the authoritative server clock (or local solo authority). At `now < deadline`, the other player can stack; at `now >= deadline`, it is late. `advanceTime(state, now)` starts the discarder’s power at the deadline if no valid stack occurred. The reducer accepts an injected `now`, so unit tests exercise boundaries without waiting or timers. Server and solo adapter schedule the transition; the UI displays the pending countdown and a button labelled **Stack** at the discard moment. This small single-deadline phase avoids consent deadlocks or extra Pass actions for two networked players. Its exact duration remains provisional, not a Wilson-confirmed number. Animation and reveal timing never advance the game.

A matching power stack cancels the pending deadline and starts the stacker’s power immediately. The power window is then **closed**: no stacking during active powers/private reveals and no queued post-power opportunity. A late attempt, self-stack by the latest discarder, nonexistent slot, setup/held-card attempt, or other ineligible attempt rejects with **no penalty**. Only an eligible open-window attempt against the wrong rank incurs a penalty. Sequential server action order resolves races; stale revisions reject without a penalty, and the stack timestamp must still precede the authoritative deadline.

**Wrong rank:** the stack is rejected and exactly **one additional deck card** is appended face-down to the stacker’s hand, if available. The attempted card is neither revealed nor moved. The top discard, pending deadline/power, ordinary turn and scores stay unchanged (except existing exhaustion scoring once the current action is complete). The generic stacker error is `STACK_MISMATCH`; a public rejected-stack event/hand-size update is necessary, but neither player receives the hidden penalty face. No free penalty-free eligible rank probing remains. If the deck is already empty, there is no reshuffle and no card is invented: a pending power still resolves before deck-exhaustion scoring; without pending power, the completed rejected attempt ends the round by the existing exhaustion rule. If the penalty consumes the last card, the same rule applies.

**Retained provisional ordinary-window choices:** normal discards/replacements and non-power stacks still open the placement-to-next-active-draw window, superseded by a new top discard. The latest discarder cannot self-stack. Non-power alternating chains remain allowed; a power stack closes the window and immediately starts its acting player’s power, so no alternating power chain is introduced. A call alone retains an ordinary window unless it ends the round. A non-power final action is scored immediately with no post-scoring stack opportunity. A power final action first resolves its new stacking window and eventual power, then scores. There is no empty-hand win or new turn/scoring rule.

The client never exposes a hidden rank to decide stack eligibility. Own-card click/numbered keyboard slot attempts the stack; the visible **Stack** button focuses a selectable own card. It clearly announces when your power was cancelled and when you won the power. The discard pile itself remains non-interactive and is never a draw target.

## Memory bot

Pip receives only its filtered player view. It remembers previously visible rank/value information by slot, including its initial look, powers, public cards, exchanged draws, and swaps. It may stack only when that memory identifies a same-rank own card; it never inspects unknown hidden cards or probes randomly. Slot holes remove their corresponding memory. Seeded choices are deterministic apart from opaque card IDs. Bot stacking is an optional provisional behavior, not an extra rule.

## Calling, scoring, and matches

Calling CABO uses the entire turn. The other player gets exactly one final turn, and the caller remains a legal power target. Resolve the whole final action, including any Queen decision, before scoring. Deck exhaustion also ends the round after the current action resolves. No reshuffle and no arbitrary engine turn cap. The memory bot chooses to call by turn 22.

Caller lowest or tied lowest: zero points. Otherwise caller receives their hand sum +10. Everyone else receives their hand sum. No Kamikaze override, including for two Queens and both black Kings.

Quick is exactly four rounds, with no 100-point reset or early end above 100. Classic ends when any total exceeds 100; exactly 100 resets to 50 once per player. Lowest match total wins; final-round points break ties, with unresolved ties shared. Both players consent before a next round/rematch. These existing scoring and match rules are unchanged.

## Open questions for Wilson

1. **Self-stacking by the discarder:** currently rejected without penalty; only the other player of the latest top discard is eligible. Please confirm.
2. **Window length/boundaries:** the new power window is fixed at 2.5 seconds; ordinary windows retain placement-to-next-draw. Please confirm the chosen duration and final-action opportunity.
3. **Alternating chains:** non-power alternating chains remain allowed; power transfer starts immediately and closes stacking, with no power chain. Whether power-to-power alternating chains should exist remains unanswered.

The former questions about stacked powers and wrong-stack penalties are answered by **Wilson, 23:59 +08, 25 November**: stacked power cancels the discarder’s power and belongs to the stacker; wrong rank draws one extra hidden deck card. They are no longer Coordinator assumptions.

## Changes at 23:59

Only the two flagged assumptions changed: power ownership is decided before power execution, and wrong stacking now has a one-card deck penalty. A minimal deadline phase, distinct power actor, authoritative timers, countdown/Stack label, cancellation/win messages, and corresponding tests support those corrections. Deck-only draws, suited values, score-value exchanges and penalties, calling/scoring, Classic/Quick, chat/reconnect, Jokers and Kamikaze exclusions remain unchanged. The visual environment, cards and celebration are retained; the URL celebration replay merely advances the new deterministic phase during its finite simulation.

## Honest limits

The authoritative host sees the full deck; filtered network views protect clients from receiving secrets, not from a hostile host. Solo authority lives in the browser and is inspectable by its user. Seeded shuffling is not cryptographic fairness. RAM-only rooms and bounded chat disappear at restart; chat is not end-to-end encrypted. No public TLS deployment, account service, persistent match storage, or physical-device Safari certification is claimed. Restart after sync: old in-memory matches are not migrated. No official CABO affiliation or commercial brand-clearance claim.
