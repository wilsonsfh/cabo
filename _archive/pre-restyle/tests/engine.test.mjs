import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, reduce, viewFor, scoreRound, createBot, assertState, RuleError, makeDeck } from '../engine.mjs';

function started(seed = 4, maxRounds = 0) {
  let s = createGame({ seed, maxRounds });
  for (const id of s.players) { s = reduce(s, id, { type: 'initialPeek', slots: [0, 1] }); s = reduce(s, id, { type: 'ready' }); }
  return s;
}
function drawRank(rank, source = 'deck') {
  let s = started(); const pile = source === 'deck' ? s.deck : s.discard; pile.at(-1).value = rank;
  return reduce(s, s.active, { type: 'draw', source });
}
function assertView(s, id) {
  const v = viewFor(s, id), wire = JSON.stringify(v);
  for (const c of [...s.deck, ...s.discard, ...s.players.flatMap(p => s.hands[p].filter(Boolean)), ...(s.held ? [s.held.card] : [])]) assert.equal(wire.includes(c.id), false, 'No card identity crosses the view boundary.');
  assert.equal('deck' in v, false); assert.equal('rng' in v, false); assert.equal('initial' in v, false);
  for (const owner of s.players) for (const c of v.hands[owner]) {
    const raw = s.hands[owner][c.slot];
    const permitted = raw.faceUp || ['roundEnd', 'gameEnd'].includes(s.phase) || owner === id && s.phase === 'setup' && !s.initial[id].ready && s.initial[id].seen.includes(c.slot) || s.phase === 'reveal' && s.peek.viewer === id && s.peek.owner === owner && s.peek.slot === c.slot;
    assert.equal(c.value, permitted ? raw.value : null);
  }
  if (s.held?.source === 'deck' && s.held.owner !== id) assert.equal(v.held.value, null);
  if (s.peek && s.peek.viewer !== id) assert.equal(v.peek, null);
}

test('52-card rank distribution; seeded engine is deterministic and does not mutate inputs', () => {
  const deck = makeDeck(); assert.equal(deck.length, 52); assert.equal(deck.filter(c => c.value === 0).length, 2); assert.equal(deck.filter(c => c.value === 13).length, 2);
  assert.deepEqual(createGame({ seed: 77 }), createGame({ seed: 77 }));
  const a = createGame(), copy = structuredClone(a); reduce(a, 'p0', { type: 'initialPeek', slots: [0, 1] }); assert.deepEqual(a, copy);
});
test('initial peek exactly two once and hides on readiness', () => {
  let s = createGame(); assert.throws(() => reduce(s, 'p0', { type: 'ready' }), RuleError);
  assert.throws(() => reduce(s, 'p0', { type: 'initialPeek', slots: [0, 0] }), { code: 'SLOTS' });
  s = reduce(s, 'p0', { type: 'initialPeek', slots: [1, 3] }); assert.equal(viewFor(s, 'p0').hands.p0.filter(c => c.value !== null).length, 2);
  assert.equal(viewFor(s, 'p1').hands.p0.every(c => c.value === null), true);
  assert.throws(() => reduce(s, 'p0', { type: 'initialPeek', slots: [0, 2] }), { code: 'INITIAL_PEEK' });
  s = reduce(s, 'p0', { type: 'ready' }); assert.equal(viewFor(s, 'p0').hands.p0.every(c => c.value === null), true);
});
test('typed rejection of illegal phases, other-player moves, state payloads and unknown actions', () => {
  const s = started(), other = s.players.find(p => p !== s.active);
  assert.throws(() => reduce(s, other, { type: 'draw', source: 'deck' }), { code: 'TURN' });
  assert.throws(() => reduce(s, s.active, { type: 'replace', slots: [0] }), { code: 'PHASE' });
  assert.throws(() => reduce(s, s.active, { type: 'draw', source: 'deck', state: {} }), { code: 'ACTION_FIELDS' });
  assert.throws(() => reduce(s, s.active, { type: '__proto__' }), RuleError);
});
test('deck replacement hides; discard replacement is public and cannot activate power or discard', () => {
  let s = drawRank(8), actor = s.active; s = reduce(s, actor, { type: 'replace', slots: [0] }); assert.equal(s.hands[actor][0].faceUp, false);
  s = drawRank(8, 'discard'); actor = s.active;
  assert.throws(() => reduce(s, actor, { type: 'discard', usePower: true }), { code: 'DISCARD_SOURCE' });
  s = reduce(s, actor, { type: 'replace', slots: [0] }); assert.equal(s.hands[actor][0].faceUp, true); assertState(s);
});
test('multiple matching cards collapse into a single replacement in the first chosen slot', () => {
  let s = drawRank(3), actor = s.active; s.hands[actor][0].value = s.hands[actor][2].value = 8;
  s = reduce(s, actor, { type: 'replace', slots: [0, 2] }); assert.equal(s.hands[actor].filter(Boolean).length, 3); assert.equal(s.hands[actor][2], null); assert.equal(s.hands[actor][0].value, 3); assertState(s);
});
for (const count of [2, 3, 4]) test(`failed ${count}-card exchange: exposed selected cards and correct penalty`, () => {
  let s = drawRank(1), actor = s.active; s.hands[actor].forEach((c, i) => { c.value = i + 2; });
  s = reduce(s, actor, { type: 'replace', slots: Array.from({ length: count }, (_, i) => i) });
  assert.equal(s.hands[actor].filter(Boolean).length, count >= 3 ? 6 : 5); assert.equal(s.lastEvent.type, 'mismatch');
  assert.equal(s.hands[actor].slice(0, count).every(c => c.faceUp), true); assert.equal(s.hands[actor].at(-1).faceUp, false); assertState(s);
});
for (const rank of [7, 8, 9, 10]) test(`rank ${rank} private ${rank <= 8 ? 'peek' : 'spy'}; explicit hide advances turn`, () => {
  let s = drawRank(rank), actor = s.active, other = s.players.find(p => p !== actor);
  s = reduce(s, actor, { type: 'discard', usePower: true }); assert.equal(s.phase, 'power');
  const owner = rank <= 8 ? actor : other;
  s = reduce(s, actor, { type: 'power', slot: 2 }); assert.equal(s.phase, 'reveal'); assert.equal(viewFor(s, actor).peek.value, s.hands[owner][2].value);
  assertView(s, actor); assertView(s, other);
  s = reduce(s, actor, { type: 'ack' }); assert.equal(s.active, other); assert.equal(s.peek, null); assertState(s);
});
for (const rank of [11, 12]) test(`rank ${rank} swaps one own and opponent card without flipping`, () => {
  let s = drawRank(rank), actor = s.active, other = s.players.find(p => p !== actor), a = s.hands[actor][1].id, b = s.hands[other][2].id;
  s.hands[actor][1].faceUp = true;
  s = reduce(s, actor, { type: 'discard', usePower: true }); s = reduce(s, actor, { type: 'power', ownSlot: 1, otherSlot: 2 });
  assert.equal(s.hands[actor][1].id, b); assert.equal(s.hands[other][2].id, a); assert.equal(s.hands[other][2].faceUp, true); assertState(s);
});
test('no ability on 0..6/13, power skip is legal, face-up card cannot be privately peeked', () => {
  let s = drawRank(13); assert.throws(() => reduce(s, s.active, { type: 'discard', usePower: true }), { code: 'NO_POWER' });
  s = drawRank(7); const actor = s.active; s.hands[actor][0].faceUp = true; s = reduce(s, actor, { type: 'discard', usePower: true });
  assert.throws(() => reduce(s, actor, { type: 'power', slot: 0 }), { code: 'FACE_UP' }); s = reduce(s, actor, { type: 'skip' }); assert.equal(s.phase, 'turn');
});
test('call consumes turn, other player gets exactly one final turn, caller remains swap target', () => {
  let s = started(), caller = s.active, other = s.players.find(p => p !== caller); s.deck.at(-1).value = 11;
  s = reduce(s, caller, { type: 'call' }); assert.equal(s.active, other); assert.deepEqual(s.finalRemaining, [other]);
  assert.throws(() => reduce(s, other, { type: 'call' }), { code: 'CALLED' });
  s = reduce(s, other, { type: 'draw', source: 'deck' }); s = reduce(s, other, { type: 'discard', usePower: true });
  s = reduce(s, other, { type: 'power', ownSlot: 0, otherSlot: 0 }); assert.equal(s.phase, 'roundEnd'); assert.equal(s.result.reason, 'call'); assertState(s);
});
test('last deck draw resolves before scoring; no reshuffle', () => {
  let s = started(); s.discard.push(...s.deck.splice(0, s.deck.length - 1)); const actor = s.active;
  s = reduce(s, actor, { type: 'draw', source: 'deck' }); assert.equal(s.phase, 'drawn'); s = reduce(s, actor, { type: 'discard' }); assert.equal(s.phase, 'roundEnd'); assert.equal(s.result.reason, 'deck'); assertState(s);
});
test('scoring: caller tied lowest zero, unsuccessful +10, noncaller always sum, exact Kamikaze', () => {
  const s = started(); s.caller = 'p0'; s.hands.p0.forEach(c => { c.value = 2; }); s.hands.p1.forEach(c => { c.value = 2; });
  assert.deepEqual(scoreRound(s).points, { p0: 0, p1: 8 }); s.hands.p0[0].value = 3; assert.deepEqual(scoreRound(s).points, { p0: 19, p1: 8 });
  [12, 12, 13, 13].forEach((v, i) => { s.hands.p1[i].value = v; }); assert.deepEqual(scoreRound(s).points, { p0: 50, p1: 0 });
  s.hands.p1.push({ id: 'extra', value: 0, faceUp: false }); assert.equal(scoreRound(s).moon, null);
});
test('one-time exact-100 reset; >100 game end; four-round option; both ready for new deal', () => {
  let s = started(); const actor = s.active, other = s.players.find(p => p !== actor); s.hands[actor].forEach(c => { c.value = 0; }); s.hands[other].forEach(c => { c.value = 2; }); s.scores[other] = 92;
  s = reduce(s, actor, { type: 'call' }); s = reduce(s, other, { type: 'draw', source: 'deck' }); s = reduce(s, other, { type: 'discard' });
  assert.equal(s.scores[other], 50); assert.equal(s.resets[other], true);
  s = reduce(s, actor, { type: 'nextRound' }); assert.equal(s.phase, 'roundEnd'); s = reduce(s, other, { type: 'nextRound' }); assert.equal(s.phase, 'setup'); assert.equal(s.active, actor);
  s = started(); s.scores.p0 = 101; s = reduce(s, s.active, { type: 'call' }); s = reduce(s, s.active, { type: 'draw', source: 'deck' }); s = reduce(s, s.active, { type: 'discard' }); assert.equal(s.phase, 'gameEnd');
  s = started(1, 1); s = reduce(s, s.active, { type: 'call' }); s = reduce(s, s.active, { type: 'draw', source: 'deck' }); s = reduce(s, s.active, { type: 'discard' }); assert.equal(s.phase, 'gameEnd');
});
test('1,000 seeded bot-vs-bot STANDARD full games terminate legally; every view is leak-checked', () => {
  let actions = 0;
  for (let seed = 1; seed <= 1000; seed++) {
    let s = createGame({ seed }); const bots = Object.fromEntries(s.players.map((p, i) => [p, createBot(seed + i)])); let steps = 0;
    while (s.phase !== 'gameEnd' && steps++ < 5000) {
      for (const p of s.players) { assertView(s, p); bots[p].observe(viewFor(s, p)); }
      const actor = s.phase === 'setup' ? s.players.find(p => !s.initial[p].ready) : s.phase === 'roundEnd' ? s.players.find(p => !s.roundReady.includes(p)) : s.active;
      const a = bots[actor].action(viewFor(s, actor)); assert.ok(a); s = reduce(s, actor, a); assertState(s); actions++;
    }
    assert.equal(s.phase, 'gameEnd', `Seed ${seed} did not terminate`); s.players.forEach(p => assertView(s, p));
  }
  console.log(`Verified 1,000 standard games and ${actions.toLocaleString()} legal reducer actions.`);
});

test('Quick profile never resets 100 and never ends before the configured round count', () => {
  for (const total of [92, 102]) {
    let s = started(4, 4); const caller = s.active, other = s.players.find(p => p !== caller);
    s.hands[caller].forEach(c => { c.value = 0; }); s.hands[other].forEach(c => { c.value = 2; }); s.scores[other] = total;
    s = reduce(s, caller, { type: 'call' }); s = reduce(s, other, { type: 'draw', source: 'deck' }); s = reduce(s, other, { type: 'discard' });
    assert.equal(s.scores[other], total + 8); assert.equal(s.phase, 'roundEnd'); assert.equal(s.resets[other], false);
  }
});

test('Classic exact-100 reset is consumed and never repeats', () => {
  let s = started(); const caller = s.active, other = s.players.find(p => p !== caller);
  s.hands[caller].forEach(c => { c.value = 0; }); s.hands[other].forEach(c => { c.value = 2; }); s.scores[other] = 92; s.resets[other] = true;
  s = reduce(s, caller, { type: 'call' }); s = reduce(s, other, { type: 'draw', source: 'deck' }); s = reduce(s, other, { type: 'discard' });
  assert.equal(s.scores[other], 100); assert.equal(s.phase, 'roundEnd');
});

test('Malformed target and action values always reject as RuleError', () => {
  const s = drawRank(7);
  for (const action of [null, [], {}, {type:'constructor'}, {type:'toString'}, {type:'replace',slots:[NaN]}, {type:'replace',slots:[-1]}, {type:'replace',slots:[100]}, {type:'replace',slots:[0,0]}, {type:'discard',usePower:'yes'}]) {
    assert.throws(() => reduce(s, s.active, action), RuleError);
  }
});
