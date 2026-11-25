# User-visible statechart

The reducer is synchronous and pure. Animation completion is deliberately not an event. The engine cannot consume a draw while in a power target phase; illegal actions throw `RuleError` with stable codes. Transport treats reconnect/pause as an outer room state, so it cannot accidentally change hidden game state.

```mermaid
stateDiagram-v2
  [*] --> Lobby
  Lobby --> WaitingRoom: create/join
  WaitingRoom --> Setup: host starts, two connected
  Lobby --> Setup: solo vs memory bot
  Setup --> Setup: each player peeks exactly two once
  Setup --> Turn: both hide/ready
  Turn --> Drawn: draw deck privately or public discard
  Turn --> Turn: call, caller skips, other gets final turn
  Drawn --> Turn: exchange / mismatch penalty / discard
  Drawn --> PowerTarget: discard deck power card
  PowerTarget --> Turn: blind own/opponent swap or skip
  PowerTarget --> PrivateReveal: peek/spy face-down target
  PrivateReveal --> Turn: explicit hide
  Turn --> RoundEnd: final other turn resolved or deck empty
  Drawn --> RoundEnd: last card full action resolved
  PowerTarget --> RoundEnd: last card ability resolved
  PrivateReveal --> RoundEnd: last card reveal acknowledged
  RoundEnd --> Setup: both next round
  RoundEnd --> GameEnd: score exceeds 100 or quick four rounds
  GameEnd --> Setup: both request rematch
  state Network {
    [*] --> Connected
    Connected --> Paused: disconnect
    Paused --> Connected: token resume under 30 seconds
    Paused --> Forfeit: deadline, other player connected
    Forfeit --> Connected: both rematch
  }
```

All hands use stable slot numbers, not face-down card IDs. Public events identify changed slots, never secret ranks. `viewFor` builds a fresh allowlisted object. Neither draw-pile order nor RNG seed is present in any multiplayer view.
