# CABO — Pocket Island: player feature map

## Find a table

The lobby has an original live 3D island with three character mascots, an editable name, Quick four-round or Classic-to-100 selection, immediate solo play against Pip, room creation, six-character join code, and a shareable invite URL. No signup, account service, CDN download, or paid API is required. Help is a native keyboard-accessible dialog.

## Play a real memory game

Choose two own card slots to inspect once. Explicitly hide them to start. Draw a secret deck card, take the public discard, or call. Click an own card to exchange immediately; Match several enters a deliberate multi-select so a regular tap is never ambiguous. Failed matches reveal the selected cards and impose the correct penalties. Stable numbered slots preserve memory after cards are removed.

Discard a deck-drawn 7/8 for Peek, 9/10 for Spy, or 11/12 for a blind own/opponent Swap. Choose the targets directly on the table or with native card buttons. Private reveals remain until Hide: no inaccessible timer race. The bot receives the same filtered view API and maintains memory; it is labelled as a bot and cannot inspect the full deck.

## Call, score and play again

Calling consumes the turn. The opponent gets exactly one last turn and may still target the caller. End-of-round reveals and the score card explain successful calls, +10 failed-call penalties, and Kamikaze. Classic includes the one-time exact-100 reset; Quick is exactly four rounds without it. Next round requires both players; rematch resets the match only after both request it. Current cumulative totals and four-round progress are real. Cross-match streak persistence and the analyst's Reveal Receipt are not implemented.

## Play with someone else

Create a room in one tab and join the code in another; the host starts when both are present. Both tabs use actual WebSocket connections to one authoritative room. Only per-seat filtered views travel over the wire. Reconnect uses a high-entropy tab-scoped token, not the invite code; refresh/rejoin resumes the seat. The table pauses on disconnect, with a 30-second forfeit deadline. Stale revisions, wrong-turn moves, malformed actions and unexpected client-state fields are rejected.

## Make it comfortable

Native buttons are at least 44px tall, with visible keyboard focus. D/T draw from deck/discard, C calls, X discards, P activates a power, digits select own slots, Shift+digits select opponent slots; Tab/Enter reaches every main control. Status changes are announced through aria-live. Sound starts off and uses original short WebAudio tones only after a user gesture. Reduced-motion preference and toggle remove spatial effects. A complete native-card fallback works when WebGL cannot initialize, with no hidden-information bypass.

## What 3D contributes

A fixed three-quarter tabletop gives cards physical depth without camera tours. Fourteen original procedural characters map ranks 0–13 to creatures; higher-power families have peek lenses, spy scopes or exchange rings. The table has warm directional light, soft shadows, faceted foliage, clouds and instanced rim stones. Locally vendored Three.js renders below CSS resolution with nearest-neighbour upscaling for a retro edge; all functional text stays native resolution. Brief GSAP transforms and particle bursts are cosmetic and cannot advance or block the game state.

## Explicit non-features

No public deployment, accounts, matchmaking, chat, wagering, production database, anti-collusion, cryptographic fair-deal proof, service-worker offline install, Nintendo imagery/music/fonts, copied CABO art, or trademark clearance. Exactly two seats are supported; the engine/room boundary is suitable for extension but more players are not claimed. Local solo remains playable if WebSockets/network access are unavailable after the page loads. Node rooms are in memory and disappear when the process stops.
