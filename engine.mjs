export class RuleError extends Error {
  constructor(code, message) { super(message); this.name = 'RuleError'; this.code = code; }
}
const fail = (code, message) => { throw new RuleError(code, message); };
const requireRule = (ok, code, message) => { if (!ok) fail(code, message); };
export const powerFor = value => value === 7 || value === 8 ? 'peek' : value === 9 || value === 10 ? 'spy' : value === 11 ? 'blindSwap' : value === 12 ? 'lookSwap' : null;
export const STACK_WINDOW_MS = 2500;
export const POWER_LABELS = Object.freeze({ peek: 'Peek own', spy: 'Peek other', blindSwap: 'Blind swap', lookSwap: 'Look + swap?' });
export const SUITS = Object.freeze(['hearts', 'diamonds', 'clubs', 'spades']);
export const RANKS = Object.freeze(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
export const cardValue = (rank, suit) => rank === 'K' ? ['hearts', 'diamonds'].includes(suit) ? -1 : 13 : rank === 'A' ? 1 : rank === 'J' ? 11 : rank === 'Q' ? 12 : Number(rank);
export function createCard(rank, suit) {
  requireRule(RANKS.includes(rank) && SUITS.includes(suit), 'CARD', 'Invalid rank or suit.');
  return { id: crypto.randomUUID(), rank, suit, color: ['hearts', 'diamonds'].includes(suit) ? 'red' : 'black', value: cardValue(rank, suit), faceUp: false };
}
export function randomStep(seed) {
  const next = (seed + 0x6D2B79F5) >>> 0;
  let n = Math.imul(next ^ next >>> 15, next | 1);
  n ^= n + Math.imul(n ^ n >>> 7, n | 61);
  return [next, ((n ^ n >>> 14) >>> 0) / 4294967296];
}
function shuffle(state, cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    let value; [state.rng, value] = randomStep(state.rng);
    const j = Math.floor(value * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
export function makeDeck() {
  return SUITS.flatMap(suit => RANKS.map(rank => createCard(rank, suit)));
}
function deal(state, starter) {
  state.round++; state.deck = shuffle(state, makeDeck(state.round));
  state.hands = Object.fromEntries(state.players.map(id => [id, Array.from({ length: 4 }, () => state.deck.pop())]));
  state.discard = [state.deck.pop()]; state.discard[0].faceUp = true;
  state.phase = 'setup'; state.initial = Object.fromEntries(state.players.map(id => [id, { seen: [], ready: false }]));
  state.active = starter; state.starter = starter; state.caller = null; state.finalRemaining = [];
  state.held = null; state.power = null; state.peek = null; state.turn = 0; state.roundReady = [];
  state.discardActor = null; state.stackOpen = false; state.pendingPower = null; state.powerActor = null; state.powerEndsTurn = false;
  state.lastEvent = { type: 'deal', actor: null, targets: [] };
}
export function createGame({ seed = 1, players = ['p0', 'p1'], maxRounds = 0 } = {}) {
  requireRule(players.length === 2 && new Set(players).size === 2 && players.every(p => typeof p === 'string' && p.length < 33), 'PLAYERS', 'Exactly two unique player IDs are required.');
  requireRule(Number.isInteger(maxRounds) && maxRounds >= 0 && maxRounds <= 20, 'CONFIG', 'Invalid match length.');
  const state = { version: 0, rng: seed >>> 0, players: [...players], round: 0, maxRounds, scores: Object.fromEntries(players.map(id => [id, 0])), resets: Object.fromEntries(players.map(id => [id, false])), history: [], result: null };
  let value; [state.rng, value] = randomStep(state.rng);
  deal(state, players[Math.floor(value * players.length)]);
  return state;
}
function cardAt(state, owner, slot) {
  requireRule(Number.isInteger(slot) && slot >= 0 && slot <= 64 && !!state.hands[owner]?.[slot], 'TARGET', 'Choose an occupied card slot.');
  return state.hands[owner][slot];
}
function event(state, type, actor, targets = [], extra = {}) { state.lastEvent = { type, actor, targets, ...extra }; }
function placeDiscard(state, actor, card) {
  card.faceUp = true; state.discard.push(card); state.discardActor = actor; state.stackOpen = true;
}
export function canStack(state, actor, now = Date.now()) {
  return state.players.includes(actor) && ['turn', 'stacking'].includes(state.phase) && (!state.pendingPower || now < state.pendingPower.deadline) && state.stackOpen && state.discard.length > 0 && state.discardActor !== null && state.discardActor !== actor && !state.power && !state.peek && !state.held && state.hands[actor].some(Boolean);
}
export function scoreRound(state) {
  const sums = Object.fromEntries(state.players.map(id => [id, state.hands[id].filter(Boolean).reduce((sum, c) => sum + c.value, 0)]));
  const minimum = Math.min(...Object.values(sums));
  const points = Object.fromEntries(state.players.map(id => [id, id === state.caller ? sums[id] === minimum ? 0 : sums[id] + 10 : sums[id]]));
  return { sums, points, caller: state.caller, successfulCall: !!state.caller && sums[state.caller] === minimum };
}
function finishRound(state, reason) {
  state.held = null; state.power = null; state.peek = null; state.pendingPower = null; state.powerActor = null; state.powerEndsTurn = false;
  state.stackOpen = false;
  const result = { ...scoreRound(state), round: state.round, reason };
  for (const id of state.players) {
    state.scores[id] += result.points[id];
    if (state.maxRounds === 0 && state.scores[id] === 100 && !state.resets[id]) { state.scores[id] = 50; state.resets[id] = true; }
  }
  result.totals = { ...state.scores }; state.history.push(result); state.result = result;
  const complete = state.maxRounds > 0 ? state.round >= state.maxRounds : state.players.some(id => state.scores[id] > 100);
  state.phase = complete ? 'gameEnd' : 'roundEnd';
  const sorted = [...state.players].sort((a, b) => state.scores[a] - state.scores[b] || result.points[a] - result.points[b]);
  state.winners = sorted.filter(id => state.scores[id] === state.scores[sorted[0]] && result.points[id] === result.points[sorted[0]]);
  event(state, 'roundEnd', state.caller, [], { reason });
}
function endTurn(state) {
  state.turn++; state.power = null; state.peek = null; state.held = null; state.pendingPower = null; state.powerActor = null; state.powerEndsTurn = false;
  if (state.caller && state.active !== state.caller) state.finalRemaining = state.finalRemaining.filter(id => id !== state.active);
  if (state.caller && state.finalRemaining.length === 0) return finishRound(state, 'call');
  if (state.deck.length === 0) return finishRound(state, 'deck');
  state.active = state.players[(state.players.indexOf(state.active) + 1) % state.players.length]; state.phase = 'turn';
}
const SHAPES = { initialPeek: ['type', 'slots'], ready: ['type'], draw: ['type', 'source'], replace: ['type', 'slots'], discard: ['type'], stack: ['type', 'slot'], power: ['type', 'slot', 'ownSlot', 'otherSlot'], swapDecision: ['type', 'swapDecision'], ack: ['type'], skip: ['type'], call: ['type'], nextRound: ['type'] };
export function validateAction(action) {
  requireRule(action && typeof action === 'object' && !Array.isArray(action) && Object.hasOwn(SHAPES, action.type), 'ACTION', 'Unknown action.');
  requireRule(Object.keys(action).every(k => SHAPES[action.type].includes(k)), 'ACTION_FIELDS', 'Unexpected action field.');
  if (['initialPeek', 'replace'].includes(action.type)) requireRule(Array.isArray(action.slots) && action.slots.length >= 1 && action.slots.length <= 4 && action.slots.every(Number.isInteger) && new Set(action.slots).size === action.slots.length, 'SLOTS', 'Select one to four different card slots.');
  if (action.type === 'draw') requireRule(action.source === 'deck', 'SOURCE', 'Draw only from the deck. The discard pile is for discarding only.');
  if (action.type === 'stack') requireRule(Number.isInteger(action.slot) && action.slot >= 0 && action.slot <= 64, 'TARGET', 'Choose an occupied own card slot.');
  if (action.type === 'swapDecision') requireRule(typeof action.swapDecision === 'boolean', 'ACTION_FIELDS', 'Choose explicitly whether to swap.');
  return action;
}
export function hasSwapTargets(state) { return state.players.every(id => state.hands[id].some(Boolean)); }
function swapCards(state, actor, ownSlot, otherSlot) {
  const other = state.players.find(id => id !== actor);
  const own = cardAt(state, actor, ownSlot), theirs = cardAt(state, other, otherSlot);
  state.hands[actor][ownSlot] = theirs; state.hands[other][otherSlot] = own;
  event(state, 'swap', actor, [{ owner: actor, slot: ownSlot }, { owner: other, slot: otherSlot }]);
}
function startPower(state, actor, kind, endsTurn) {
  state.pendingPower = null; state.stackOpen = false; state.power = kind;
  state.powerActor = actor; state.powerEndsTurn = endsTurn; state.phase = 'power';
}
function finishPower(state) {
  if (state.powerEndsTurn) return endTurn(state);
  state.power = null; state.peek = null; state.powerActor = null; state.powerEndsTurn = false; state.phase = 'turn';
  if (!state.deck.length) finishRound(state, 'deck');
}
// The only clock transition: tests inject milliseconds; server and solo schedule it.
export function advanceTime(previous, now = Date.now()) {
  if (!previous.pendingPower || now < previous.pendingPower.deadline) return previous;
  const state = structuredClone(previous), pending = state.pendingPower;
  startPower(state, pending.actor, pending.kind, true);
  event(state, 'ability', pending.actor, [], { ability: pending.kind }); state.version++;
  return state;
}
export function reduce(previous, actor, action, now = Date.now()) {
  validateAction(action);
  requireRule(previous.players.includes(actor), 'PLAYER', 'Unknown player.');
  const state = structuredClone(previous);
  if (action.type === 'stack') {
    requireRule(canStack(state, actor, now), 'STACK_WINDOW', 'Stack window closed or ineligible. No penalty.');
    const card = cardAt(state, actor, action.slot);
    if (card.rank !== state.discard.at(-1).rank) {
      const penalty = state.deck.pop();
      if (penalty) { penalty.faceUp = false; state.hands[actor].push(penalty); }
      event(state, 'stackRejected', actor, [], { penalty: penalty ? 1 : 0 });
      // Exhaustion waits for a pending drawn-card power; otherwise this action is complete.
      if (!state.deck.length && !state.pendingPower) { finishRound(state, 'deck'); state.lastEvent.stackRejection = { actor, penalty: penalty ? 1 : 0 }; }
    } else {
      const pending = state.pendingPower, kind = powerFor(card.value);
      state.hands[actor][action.slot] = null; placeDiscard(state, actor, card);
      if (kind) startPower(state, actor, kind, !!pending);
      event(state, 'stack', actor, [{ owner: actor, slot: action.slot }], { ability: kind, cancelledActor: pending?.actor ?? null });
    }
  } else if (state.phase === 'setup') {
    const setup = state.initial[actor];
    if (action.type === 'initialPeek') {
      requireRule(!setup.ready && setup.seen.length === 0 && action.slots.length === 2, 'INITIAL_PEEK', 'Look at exactly two cards, once.');
      action.slots.forEach(slot => cardAt(state, actor, slot)); setup.seen = [...action.slots];
    } else if (action.type === 'ready') {
      requireRule(setup.seen.length === 2 && !setup.ready, 'READY', 'Look at two cards before hiding them.'); setup.ready = true;
      if (state.players.every(id => state.initial[id].ready)) { state.phase = 'turn'; event(state, 'start', state.active); }
    } else fail('PHASE', 'Look at two cards, then hide them to start.');
  } else if (['roundEnd', 'gameEnd'].includes(state.phase)) {
    requireRule(action.type === 'nextRound' && state.phase === 'roundEnd', 'PHASE', 'This match has ended.');
    requireRule(!state.roundReady.includes(actor), 'READY', 'Already ready.'); state.roundReady.push(actor);
    if (state.roundReady.length === state.players.length) {
      const order = [...state.players.slice(state.players.indexOf(state.starter)), ...state.players.slice(0, state.players.indexOf(state.starter))];
      const lowest = Math.min(...Object.values(state.result.points)); const starter = order.find(id => state.result.points[id] === lowest);
      deal(state, starter);
    }
  } else {
    requireRule(actor === (['power', 'reveal'].includes(state.phase) ? state.powerActor : state.active), 'TURN', 'It is not your turn or power.');
    if (state.phase === 'turn') {
      if (action.type === 'call') {
        requireRule(!state.caller, 'CALLED', 'The final turn is already underway.');
        state.caller = actor; state.finalRemaining = state.players.filter(id => id !== actor); event(state, 'call', actor); endTurn(state);
      } else if (action.type === 'draw') {
        requireRule(state.deck.length > 0, 'EMPTY', 'The deck is empty.');
        state.stackOpen = false;
        state.held = { card: state.deck.pop(), owner: actor }; state.phase = 'drawn';
        event(state, 'draw', actor);
      } else fail('PHASE', 'Draw a card or call it.');
    } else if (state.phase === 'drawn') {
      if (action.type === 'replace') {
        const selected = action.slots.map(slot => cardAt(state, actor, slot));
        const match = selected.every(c => c.value === selected[0].value);
        if (match) {
          selected.forEach((c, i) => { placeDiscard(state, actor, c); state.hands[actor][action.slots[i]] = null; });
          const card = state.held.card; card.faceUp = false; state.hands[actor][action.slots[0]] = card;
          event(state, 'replace', actor, action.slots.map(slot => ({ owner: actor, slot })), { matched: selected.length });
        } else {
          selected.forEach(c => { c.faceUp = true; });
          const drawn = state.held.card; drawn.faceUp = false; state.hands[actor].push(drawn);
          if (selected.length >= 3 && state.deck.length) state.hands[actor].push(state.deck.pop());
          event(state, 'mismatch', actor, action.slots.map(slot => ({ owner: actor, slot })), { penalty: selected.length >= 3 ? 2 : 1 });
        }
        endTurn(state);
      } else if (action.type === 'discard') {
        const kind = powerFor(state.held.card.value);
        placeDiscard(state, actor, state.held.card); state.held = null;
        if (kind) { state.pendingPower = { actor, kind, deadline: now + STACK_WINDOW_MS }; state.phase = 'stacking'; event(state, 'powerPending', actor, [], { ability: kind }); }
        else { event(state, 'discard', actor); endTurn(state); }
      } else fail('PHASE', 'Exchange the drawn card or discard it.');
    } else if (state.phase === 'power') {
      if (action.type === 'skip') {
        requireRule(!['blindSwap', 'lookSwap'].includes(state.power) || !hasSwapTargets(state), 'MANDATORY_POWER', state.power === 'blindSwap' ? 'Jack must swap once triggered.' : 'Queen must look first; then choose swap or keep.');
        event(state, 'skip', actor); finishPower(state);
      }
      else {
        requireRule(action.type === 'power', 'PHASE', 'Choose a target for the ability.');
        const other = state.players.find(id => id !== actor);
        if (['blindSwap', 'lookSwap'].includes(state.power)) {
          cardAt(state, actor, action.ownSlot); cardAt(state, other, action.otherSlot);
          requireRule(action.slot === undefined, 'ACTION_FIELDS', 'Choose one own and one opponent slot.');
          if (state.power === 'blindSwap') { swapCards(state, actor, action.ownSlot, action.otherSlot); finishPower(state); }
          else {
            state.peek = { viewer: actor, targets: [{ owner: actor, slot: action.ownSlot }, { owner: other, slot: action.otherSlot }] }; state.phase = 'reveal';
            event(state, 'look', actor, state.peek.targets);
          }
        } else {
          const owner = state.power === 'peek' ? actor : other; const card = cardAt(state, owner, action.slot);
          requireRule(action.ownSlot === undefined && action.otherSlot === undefined, 'ACTION_FIELDS', 'Choose a single target slot.');
          requireRule(!card.faceUp, 'FACE_UP', 'That card is already face up.');
          state.peek = { viewer: actor, targets: [{ owner, slot: action.slot }] }; state.phase = 'reveal';
          event(state, state.power, actor, [{ owner, slot: action.slot }]);
        }
      }
    } else if (state.phase === 'reveal') {
      if (state.power === 'lookSwap') {
        requireRule(action.type === 'swapDecision', 'PHASE', 'Choose Swap these cards or Keep them.');
        if (action.swapDecision) {
          const [own, other] = state.peek.targets;
          swapCards(state, actor, own.slot, other.slot);
        } else event(state, 'keep', actor, state.peek.targets);
      } else requireRule(action.type === 'ack', 'PHASE', 'Hide the revealed card when you are ready.');
      finishPower(state);
    } else fail('PHASE', 'No action is available in this phase.');
  }
  state.version++;
  return state;
}
const publicFace = card => ({ rank: card.rank, suit: card.suit, color: card.color, value: card.value });
export function viewFor(state, viewer, now = Date.now()) {
  requireRule(state.players.includes(viewer), 'PLAYER', 'Unknown viewer.');
  const ended = ['roundEnd', 'gameEnd'].includes(state.phase);
  const hands = Object.fromEntries(state.players.map(owner => [owner, state.hands[owner].flatMap((card, slot) => {
    if (!card) return [];
    const initialVisible = owner === viewer && state.phase === 'setup' && !state.initial[viewer].ready && state.initial[viewer].seen.includes(slot);
    const peekVisible = state.phase === 'reveal' && state.peek?.viewer === viewer && state.peek.targets.some(t => t.owner === owner && t.slot === slot);
    const visible = ended || card.faceUp || initialVisible || peekVisible;
    return [{ slot, faceUp: card.faceUp, ...(visible ? publicFace(card) : { value: null }), temporary: initialVisible || peekVisible }];
  })]));
  const peek = state.peek?.viewer === viewer ? state.peek.targets.map(t => ({ ...t, ...publicFace(cardAt(state, t.owner, t.slot)) })) : null;
  return {
    version: state.version, viewer, players: [...state.players], phase: state.phase, active: state.active, round: state.round, maxRounds: state.maxRounds, turn: state.turn,
    hands, deckCount: state.deck.length, discard: state.discard.length ? publicFace(state.discard.at(-1)) : null,
    held: state.held ? state.held.owner === viewer ? publicFace(state.held.card) : { value: null } : null,
    stackAllowed: canStack(state, viewer, now), pendingPower: state.pendingPower ? { ...state.pendingPower, windowMs: STACK_WINDOW_MS } : null, powerActor: state.powerActor,
    power: state.power, peek: peek ? { ...peek[0], cards: peek } : null,
    caller: state.caller, finalRemaining: [...state.finalRemaining], scores: { ...state.scores }, resets: { ...state.resets },
    setup: { seen: [...state.initial[viewer].seen], ready: state.initial[viewer].ready, allReady: state.players.every(id => state.initial[id].ready) },
    lastEvent: structuredClone(state.lastEvent), result: ended ? structuredClone(state.result) : null,
    history: structuredClone(state.history), roundReady: [...state.roundReady], winners: ended ? [...state.winners] : []
  };
}
export function assertState(state) {
  const cards = [...state.deck, ...state.discard, ...state.players.flatMap(id => state.hands[id].filter(Boolean)), ...(state.held ? [state.held.card] : [])];
  requireRule(cards.length === 52 && new Set(cards.map(c => c.id)).size === 52, 'INVARIANT', 'Deck conservation failed.');
  requireRule(cards.every(c => RANKS.includes(c.rank) && SUITS.includes(c.suit) && c.value === cardValue(c.rank, c.suit) && c.color === (['hearts', 'diamonds'].includes(c.suit) ? 'red' : 'black')), 'INVARIANT', 'Invalid card contract.');
  requireRule(new Set(cards.map(c => `${c.suit}:${c.rank}`)).size === 52, 'INVARIANT', 'Standard deck distribution failed.');
  requireRule(state.players.includes(state.active) && ['setup', 'turn', 'drawn', 'stacking', 'power', 'reveal', 'roundEnd', 'gameEnd'].includes(state.phase), 'INVARIANT', 'Invalid statechart node.');
  requireRule((state.phase === 'drawn') === !!state.held, 'INVARIANT', 'Held card phase mismatch.');
  requireRule(!state.held || state.held.owner === state.active && !Object.hasOwn(state.held, 'source'), 'INVARIANT', 'Held cards can only be private deck draws.');
  requireRule(!state.stackOpen || state.players.includes(state.discardActor) && state.discard.length > 0, 'INVARIANT', 'Invalid stacking window.');
  requireRule((state.phase === 'stacking') === !!state.pendingPower, 'INVARIANT', 'Pending power phase mismatch.');
  requireRule(!state.power || state.players.includes(state.powerActor), 'INVARIANT', 'Power actor missing.');
  return true;
}
export function createBot(seed = 5) {
  let memory = {}; let version = -1; let round = 0; let rng = seed >>> 0; let lastDraw = null; let previousOwnSlots = [];
  const choose = items => { let value; [rng, value] = randomStep(rng); return items[Math.floor(value * items.length)]; };
  return {
    observe(view) {
      if (round !== view.round) { round = view.round; memory = {}; lastDraw = null; previousOwnSlots = []; }
      if (version === view.version) return;
      version = view.version;
      const e = view.lastEvent;
      if (['replace', 'mismatch'].includes(e.type)) e.targets.forEach(t => delete memory[`${t.owner}:${t.slot}`]);
      if (e.actor === view.viewer && lastDraw && ['replace', 'mismatch'].includes(e.type)) {
        const slot = e.type === 'replace' ? e.targets[0].slot : view.hands[view.viewer].find(c => !previousOwnSlots.includes(c.slot))?.slot;
        if (slot !== undefined) memory[`${view.viewer}:${slot}`] = lastDraw;
      }
      if (e.type === 'swap') { const [a, b] = e.targets.map(t => `${t.owner}:${t.slot}`); [memory[a], memory[b]] = [memory[b], memory[a]]; }
      for (const owner of view.players) {
        for (const key of Object.keys(memory).filter(k => k.startsWith(`${owner}:`))) if (!view.hands[owner].some(c => `${owner}:${c.slot}` === key)) delete memory[key];
        for (const c of view.hands[owner]) if (c.value !== null) memory[`${owner}:${c.slot}`] = { rank: c.rank, value: c.value };
      }
      lastDraw = view.held?.rank && view.active === view.viewer ? { rank: view.held.rank, value: view.held.value } : null;
      previousOwnSlots = view.hands[view.viewer].map(c => c.slot);
    },
    stackAction(view) {
      this.observe(view);
      const match = view.stackAllowed && view.hands[view.viewer].find(c => memory[`${view.viewer}:${c.slot}`]?.rank === view.discard.rank);
      return match ? { type: 'stack', slot: match.slot } : null;
    },
    action(view) {
      this.observe(view); const self = view.viewer; const other = view.players.find(p => p !== self); const own = view.hands[self]; const theirs = view.hands[other];
      const stack = this.stackAction(view); if (stack) return stack;
      const known = c => memory[`${self}:${c.slot}`]?.value; const worth = c => known(c) ?? 7;
      if (view.phase === 'setup') return view.setup.seen.length ? { type: 'ready' } : { type: 'initialPeek', slots: [0, 1] };
      if (view.phase === 'roundEnd') return { type: 'nextRound' };
      if (view.phase === 'stacking') return null;
      if ((['power','reveal'].includes(view.phase) ? view.powerActor : view.active) !== self) return null;
      if (view.phase === 'turn') {
        if (!view.caller && (view.turn >= 22 || own.reduce((n, c) => n + worth(c), 0) <= 9)) return { type: 'call' };
        return { type: 'draw', source: 'deck' };
      }
      if (view.phase === 'drawn') {
        const groups = own.filter(c => known(c) !== undefined).reduce((g, c) => { (g[known(c)] ??= []).push(c.slot); return g; }, {});
        const match = Object.values(groups).find(g => g.length > 1);
        if (match) return { type: 'replace', slots: match };
        const worst = [...own].sort((a, b) => worth(b) - worth(a))[0];
        if (worst && view.held.value < worth(worst)) return { type: 'replace', slots: [worst.slot] };
        return { type: 'discard' };
      }
      if (view.phase === 'power') {
        if (['blindSwap', 'lookSwap'].includes(view.power)) {
          if (!own.length || !theirs.length) return { type: 'skip' };
          const worst = [...own].sort((a, b) => worth(b) - worth(a))[0];
          const low = [...theirs].sort((a, b) => (memory[`${other}:${a.slot}`]?.value ?? 7) - (memory[`${other}:${b.slot}`]?.value ?? 7))[0];
          return { type: 'power', ownSlot: worst.slot, otherSlot: low.slot };
        }
        const owner = view.power === 'peek' ? self : other;
        const eligible = view.hands[owner].filter(c => !c.faceUp);
        if (!eligible.length) return { type: 'skip' };
        return { type: 'power', slot: choose(eligible.filter(c => memory[`${owner}:${c.slot}`] === undefined).length ? eligible.filter(c => memory[`${owner}:${c.slot}`] === undefined) : eligible).slot };
      }
      if (view.phase === 'reveal') return view.power === 'lookSwap' ? { type: 'swapDecision', swapDecision: view.peek.cards[0].value > view.peek.cards[1].value } : { type: 'ack' };
      return null;
    }
  };
}
