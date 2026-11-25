export class RuleError extends Error {
  constructor(code, message) { super(message); this.name = 'RuleError'; this.code = code; }
}
const fail = (code, message) => { throw new RuleError(code, message); };
const requireRule = (ok, code, message) => { if (!ok) fail(code, message); };
export const powerFor = value => value === 7 || value === 8 ? 'peek' : value === 9 || value === 10 ? 'spy' : value === 11 || value === 12 ? 'swap' : null;
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
export function makeDeck(round = 1) {
  const deck = [];
  for (let value = 0; value <= 13; value++) {
    for (let copy = 0; copy < (value === 0 || value === 13 ? 2 : 4); copy++) {
      deck.push({ id: `secret-r${round}-v${value}-c${copy}`, value, faceUp: false });
    }
  }
  return deck;
}
function deal(state, starter) {
  state.round++; state.deck = shuffle(state, makeDeck(state.round));
  state.hands = Object.fromEntries(state.players.map(id => [id, Array.from({ length: 4 }, () => state.deck.pop())]));
  state.discard = [state.deck.pop()]; state.discard[0].faceUp = true;
  state.phase = 'setup'; state.initial = Object.fromEntries(state.players.map(id => [id, { seen: [], ready: false }]));
  state.active = starter; state.starter = starter; state.caller = null; state.finalRemaining = [];
  state.held = null; state.power = null; state.peek = null; state.turn = 0; state.roundReady = [];
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
export function scoreRound(state) {
  const sums = Object.fromEntries(state.players.map(id => [id, state.hands[id].filter(Boolean).reduce((sum, c) => sum + c.value, 0)]));
  const moon = state.players.find(id => { const v = state.hands[id].filter(Boolean).map(c => c.value).sort((a, b) => a - b); return v.length === 4 && v.join(',') === '12,12,13,13'; });
  const minimum = Math.min(...Object.values(sums));
  const points = Object.fromEntries(state.players.map(id => [id, moon ? id === moon ? 0 : 50 : id === state.caller ? sums[id] === minimum ? 0 : sums[id] + 10 : sums[id]]));
  return { sums, points, moon: moon ?? null, caller: state.caller, successfulCall: !!state.caller && sums[state.caller] === minimum };
}
function finishRound(state, reason) {
  state.held = null; state.power = null; state.peek = null;
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
  state.turn++; state.power = null; state.peek = null; state.held = null;
  if (state.caller && state.active !== state.caller) state.finalRemaining = state.finalRemaining.filter(id => id !== state.active);
  if (state.caller && state.finalRemaining.length === 0) return finishRound(state, 'call');
  if (state.deck.length === 0) return finishRound(state, 'deck');
  state.active = state.players[(state.players.indexOf(state.active) + 1) % state.players.length]; state.phase = 'turn';
}
const SHAPES = { initialPeek: ['type', 'slots'], ready: ['type'], draw: ['type', 'source'], replace: ['type', 'slots'], discard: ['type', 'usePower'], power: ['type', 'slot', 'ownSlot', 'otherSlot'], ack: ['type'], skip: ['type'], call: ['type'], nextRound: ['type'] };
export function validateAction(action) {
  requireRule(action && typeof action === 'object' && !Array.isArray(action) && Object.hasOwn(SHAPES, action.type), 'ACTION', 'Unknown action.');
  requireRule(Object.keys(action).every(k => SHAPES[action.type].includes(k)), 'ACTION_FIELDS', 'Unexpected action field.');
  if (['initialPeek', 'replace'].includes(action.type)) requireRule(Array.isArray(action.slots) && action.slots.length >= 1 && action.slots.length <= 4 && action.slots.every(Number.isInteger) && new Set(action.slots).size === action.slots.length, 'SLOTS', 'Select one to four different card slots.');
  if (action.type === 'draw') requireRule(['deck', 'discard'].includes(action.source), 'SOURCE', 'Choose the draw deck or discard pile.');
  if (action.type === 'discard' && action.usePower !== undefined) requireRule(typeof action.usePower === 'boolean', 'ACTION_FIELDS', 'Invalid ability flag.');
  return action;
}
export function reduce(previous, actor, action) {
  validateAction(action);
  requireRule(previous.players.includes(actor), 'PLAYER', 'Unknown player.');
  const state = structuredClone(previous);
  if (state.phase === 'setup') {
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
    requireRule(actor === state.active, 'TURN', 'It is not your turn.');
    if (state.phase === 'turn') {
      if (action.type === 'call') {
        requireRule(!state.caller, 'CALLED', 'The final turn is already underway.');
        state.caller = actor; state.finalRemaining = state.players.filter(id => id !== actor); event(state, 'call', actor); endTurn(state);
      } else if (action.type === 'draw') {
        const pile = action.source === 'deck' ? state.deck : state.discard;
        requireRule(pile.length > 0, 'EMPTY', 'That pile is empty.');
        state.held = { card: pile.pop(), source: action.source, owner: actor }; state.phase = 'drawn';
        event(state, 'draw', actor, [], { source: action.source });
      } else fail('PHASE', 'Draw a card or call it.');
    } else if (state.phase === 'drawn') {
      if (action.type === 'replace') {
        const selected = action.slots.map(slot => cardAt(state, actor, slot));
        const match = selected.every(c => c.value === selected[0].value);
        if (match) {
          selected.forEach((c, i) => { c.faceUp = true; state.discard.push(c); state.hands[actor][action.slots[i]] = null; });
          const card = state.held.card; card.faceUp = state.held.source === 'discard'; state.hands[actor][action.slots[0]] = card;
          event(state, 'replace', actor, action.slots.map(slot => ({ owner: actor, slot })), { matched: selected.length });
        } else {
          selected.forEach(c => { c.faceUp = true; });
          const drawn = state.held.card; drawn.faceUp = state.held.source === 'discard'; state.hands[actor].push(drawn);
          if (selected.length >= 3 && state.deck.length) state.hands[actor].push(state.deck.pop());
          event(state, 'mismatch', actor, action.slots.map(slot => ({ owner: actor, slot })), { penalty: selected.length >= 3 ? 2 : 1 });
        }
        endTurn(state);
      } else if (action.type === 'discard') {
        requireRule(state.held.source === 'deck', 'DISCARD_SOURCE', 'A discard-pile card must be exchanged.');
        const kind = powerFor(state.held.card.value);
        requireRule(!action.usePower || kind, 'NO_POWER', 'That card has no special ability.');
        state.held.card.faceUp = true; state.discard.push(state.held.card); state.held = null;
        if (action.usePower) { state.power = kind; state.phase = 'power'; event(state, 'ability', actor, [], { ability: kind }); }
        else { event(state, 'discard', actor); endTurn(state); }
      } else fail('PHASE', 'Exchange the drawn card or discard it.');
    } else if (state.phase === 'power') {
      if (action.type === 'skip') { event(state, 'skip', actor); endTurn(state); }
      else {
        requireRule(action.type === 'power', 'PHASE', 'Choose a target for the ability.');
        const other = state.players.find(id => id !== actor);
        if (state.power === 'swap') {
          const own = cardAt(state, actor, action.ownSlot); const theirs = cardAt(state, other, action.otherSlot);
          state.hands[actor][action.ownSlot] = theirs; state.hands[other][action.otherSlot] = own;
          event(state, 'swap', actor, [{ owner: actor, slot: action.ownSlot }, { owner: other, slot: action.otherSlot }]); endTurn(state);
        } else {
          const owner = state.power === 'peek' ? actor : other; const card = cardAt(state, owner, action.slot);
          requireRule(!card.faceUp, 'FACE_UP', 'That card is already face up.');
          state.peek = { owner, slot: action.slot, value: card.value, viewer: actor }; state.phase = 'reveal';
          event(state, state.power, actor, [{ owner, slot: action.slot }]);
        }
      }
    } else if (state.phase === 'reveal') {
      requireRule(action.type === 'ack', 'PHASE', 'Hide the revealed card when you are ready.'); endTurn(state);
    } else fail('PHASE', 'No action is available in this phase.');
  }
  state.version++;
  return state;
}
export function viewFor(state, viewer) {
  requireRule(state.players.includes(viewer), 'PLAYER', 'Unknown viewer.');
  const ended = ['roundEnd', 'gameEnd'].includes(state.phase);
  const hands = Object.fromEntries(state.players.map(owner => [owner, state.hands[owner].flatMap((card, slot) => {
    if (!card) return [];
    const initialVisible = owner === viewer && state.phase === 'setup' && !state.initial[viewer].ready && state.initial[viewer].seen.includes(slot);
    const peekVisible = state.phase === 'reveal' && state.peek?.viewer === viewer && state.peek.owner === owner && state.peek.slot === slot;
    const visible = ended || card.faceUp || initialVisible || peekVisible;
    return [{ slot, faceUp: card.faceUp, value: visible ? card.value : null, temporary: initialVisible || peekVisible }];
  })]));
  return {
    version: state.version, viewer, players: [...state.players], phase: state.phase, active: state.active, round: state.round, maxRounds: state.maxRounds, turn: state.turn,
    hands, deckCount: state.deck.length, discard: state.discard.length ? { value: state.discard.at(-1).value } : null,
    held: state.held ? { value: state.held.owner === viewer || state.held.source === 'discard' ? state.held.card.value : null, source: state.held.source } : null,
    power: state.power, peek: state.peek?.viewer === viewer ? { owner: state.peek.owner, slot: state.peek.slot, value: state.peek.value } : null,
    caller: state.caller, finalRemaining: [...state.finalRemaining], scores: { ...state.scores }, resets: { ...state.resets },
    setup: { seen: [...state.initial[viewer].seen], ready: state.initial[viewer].ready, allReady: state.players.every(id => state.initial[id].ready) },
    lastEvent: structuredClone(state.lastEvent), result: ended ? structuredClone(state.result) : null,
    history: structuredClone(state.history), roundReady: [...state.roundReady], winners: ended ? [...state.winners] : []
  };
}
export function assertState(state) {
  const cards = [...state.deck, ...state.discard, ...state.players.flatMap(id => state.hands[id].filter(Boolean)), ...(state.held ? [state.held.card] : [])];
  requireRule(cards.length === 52 && new Set(cards.map(c => c.id)).size === 52, 'INVARIANT', 'Deck conservation failed.');
  requireRule(cards.every(c => Number.isInteger(c.value) && c.value >= 0 && c.value <= 13), 'INVARIANT', 'Invalid card rank.');
  requireRule(state.players.includes(state.active) && ['setup', 'turn', 'drawn', 'power', 'reveal', 'roundEnd', 'gameEnd'].includes(state.phase), 'INVARIANT', 'Invalid statechart node.');
  requireRule((state.phase === 'drawn') === !!state.held, 'INVARIANT', 'Held card phase mismatch.');
  return true;
}
export function createBot(seed = 5) {
  let memory = {}; let version = -1; let round = 0; let rng = seed >>> 0;
  const choose = items => { let value; [rng, value] = randomStep(rng); return items[Math.floor(value * items.length)]; };
  return {
    observe(view) {
      if (round !== view.round) { round = view.round; memory = {}; }
      if (version === view.version) return;
      version = view.version;
      const e = view.lastEvent;
      if (['replace', 'mismatch'].includes(e.type)) e.targets.forEach(t => delete memory[`${t.owner}:${t.slot}`]);
      if (e.type === 'swap') { const [a, b] = e.targets.map(t => `${t.owner}:${t.slot}`); [memory[a], memory[b]] = [memory[b], memory[a]]; }
      for (const owner of view.players) for (const c of view.hands[owner]) if (c.value !== null) memory[`${owner}:${c.slot}`] = c.value;
    },
    action(view) {
      this.observe(view); const self = view.viewer; const other = view.players.find(p => p !== self); const own = view.hands[self]; const theirs = view.hands[other];
      const known = c => memory[`${self}:${c.slot}`]; const worth = c => known(c) ?? 7;
      if (view.phase === 'setup') return view.setup.seen.length ? { type: 'ready' } : { type: 'initialPeek', slots: [0, 1] };
      if (view.phase === 'roundEnd') return { type: 'nextRound' };
      if (view.phase === 'turn') {
        if (!view.caller && (view.turn >= 22 || own.reduce((n, c) => n + worth(c), 0) <= 9)) return { type: 'call' };
        const worst = Math.max(...own.map(worth));
        return { type: 'draw', source: view.discard && view.discard.value < worst - 1 ? 'discard' : 'deck' };
      }
      if (view.phase === 'drawn') {
        const groups = own.filter(c => known(c) !== undefined).reduce((g, c) => { (g[known(c)] ??= []).push(c.slot); return g; }, {});
        const match = Object.values(groups).find(g => g.length > 1);
        if (match) { const value = view.held.value; memory[`${self}:${match[0]}`] = value; return { type: 'replace', slots: match }; }
        const worst = [...own].sort((a, b) => worth(b) - worth(a))[0];
        if (view.held.source === 'discard' || view.held.value < worth(worst)) { memory[`${self}:${worst.slot}`] = view.held.value; return { type: 'replace', slots: [worst.slot] }; }
        return { type: 'discard', usePower: !!powerFor(view.held.value) };
      }
      if (view.phase === 'power') {
        if (view.power === 'swap') {
          const worst = [...own].sort((a, b) => worth(b) - worth(a))[0];
          const low = [...theirs].sort((a, b) => (memory[`${other}:${a.slot}`] ?? 7) - (memory[`${other}:${b.slot}`] ?? 7))[0];
          return { type: 'power', ownSlot: worst.slot, otherSlot: low.slot };
        }
        const owner = view.power === 'peek' ? self : other;
        const eligible = view.hands[owner].filter(c => !c.faceUp);
        if (!eligible.length) return { type: 'skip' };
        return { type: 'power', slot: choose(eligible.filter(c => memory[`${owner}:${c.slot}`] === undefined).length ? eligible.filter(c => memory[`${owner}:${c.slot}`] === undefined) : eligible).slot };
      }
      if (view.phase === 'reveal') return { type: 'ack' };
      return null;
    }
  };
}
