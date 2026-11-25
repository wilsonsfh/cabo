import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from '../vendor/ws/wrapper.mjs';
import { startServer } from '../server.mjs';
import { createBot, viewFor, assertState, advanceTime } from '../engine.mjs';
const app = startServer({ port: 0, forfeitMs: 120 });
await once(app.server, 'listening');
const url = `ws://127.0.0.1:${app.server.address().port}/ws`;
const clients = [], checks = [];
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); };
async function connect(command) {
  const ws = new WebSocket(url), c = { ws, session: null, message: null, errors: [], updates: 0 };
  ws.on('message', data => {
    const m = JSON.parse(data); if (m.type === 'session') c.session = m;
    if (m.type === 'error') c.errors.push(m);
    if (m.type === 'state') {
      c.message = m; c.updates++;
      if (m.view) {
        const state = app.rooms.get(m.room.code).state;
        assert.deepEqual(m.view, viewFor(state, c.session.playerId));
        const wire = data.toString(); assert.equal('deck' in m.view, false); assert.equal('rng' in m.view, false);
        assert.equal(wire.includes(c.session.token), false);
        for (const card of [...state.deck, ...state.discard, ...state.players.flatMap(p => state.hands[p].filter(Boolean)), ...(state.held ? [state.held.card] : [])]) assert.equal(wire.includes(card.id), false);
        for (const hand of Object.values(m.view.hands)) for (const card of hand) if (card.value === null) for (const field of ['rank','suit','color','id']) assert.equal(field in card, false);
        if (state.held && state.held.owner !== c.session.playerId) assert.deepEqual(m.view.held, { value: null });
        assertState(state);
      }
    }
  });
  await once(ws, 'open'); ws.send(JSON.stringify(command)); clients.push(c);
  await wait(() => c.session && c.message); return c;
}
async function wait(predicate, ms = 4000) { const start = Date.now(); while (!predicate()) { if (Date.now() - start > ms) throw new Error('Integration timeout'); await new Promise(r => setTimeout(r, 4)); } }
async function command(c, message) {
  const before = c.updates; c.ws.send(JSON.stringify(message)); await wait(() => c.updates > before); await new Promise(r => setTimeout(r, 34));
}
async function action(c, action) { await command(c, { type: 'action', version: c.message.view.version, action }); }
function place(state, target, index, rank, suit) {
  for (const list of [state.deck, state.discard, ...Object.values(state.hands)]) {
    const i = list.findIndex(c => c?.rank === rank && c.suit === suit);
    if (i >= 0) { [target[index], list[i]] = [list[i], target[index]]; target[index].faceUp = false; return; }
  }
  throw new Error('Missing fixture card');
}
try {
  const a = await connect({ type: 'create', mode: 'quick', name: 'Aleksandra Wiśniewska-Kowalczyk' });
  let b = await connect({ type: 'join', code: a.session.code, name: '<script>literal</script>' });
  await command(a, { type: 'start' });
  for (const c of [a,b]) { await action(c, {type:'initialPeek',slots:[0,1]}); await action(c,{type:'ready'}); }
  const state = app.rooms.get(a.session.code).state, discarder=state.active,stacker=state.players.find(p=>p!==discarder),dc=discarder==='p0'?a:b,sc=stacker==='p0'?a:b;
  // Fixture swaps preserve all 52 cards; every action below still traverses real sockets and the reducer.
  place(state,state.deck,state.deck.length-1,'5','spades');place(state,state.hands[stacker],0,'5','hearts');place(state,state.hands[stacker],1,'2','hearts');assertState(state);
  await action(dc,{type:'draw',source:'discard'});check('discard draw rejected',dc.errors.at(-1).code==='SOURCE');
  await action(dc,{type:'draw',source:'deck'});await action(dc,{type:'discard'});
  const beforeState=structuredClone(app.rooms.get(a.session.code).state),beforeUpdates=dc.updates,oldErrors=sc.errors.length;
  sc.ws.send(JSON.stringify({type:'action',version:sc.message.view.version,action:{type:'stack',slot:1}}));await wait(()=>sc.errors.length>oldErrors);await new Promise(r=>setTimeout(r,50));
  check('wrong stack rejected with penalty message',sc.errors.at(-1).code==='STACK_MISMATCH'&&sc.errors.at(-1).message.includes('One hidden penalty card'));
  check('opponent receives public hand-size penalty update',dc.updates>beforeUpdates);
  const penalized=app.rooms.get(a.session.code).state;assert.equal(penalized.deck.length,beforeState.deck.length-1);assert.deepEqual(penalized.discard,beforeState.discard);assert.deepEqual(penalized.scores,beforeState.scores);checks.push('rejected stack adds one hidden card without changing discard or score');
  await action(sc,{type:'stack',slot:0});check('stack is public and removes one own card',sc.message.view.hands[stacker].length===4&&dc.message.view.discard.rank==='5');
  check('stack leaves active player and turn unchanged',app.rooms.get(a.session.code).state.active===beforeState.active&&app.rooms.get(a.session.code).state.turn===beforeState.turn);
  const bots = { p0: createBot(80), p1: createBot(90) }; let steps = 0, stacks=1;
  while (a.message.view.phase !== 'gameEnd' && steps++ < 1500) {
    await wait(()=>a.message.view.version===app.rooms.get(a.session.code).state.version&&b.message.view.version===app.rooms.get(a.session.code).state.version);
    const s = app.rooms.get(a.session.code).state;
    bots.p0.observe(a.message.view); bots.p1.observe(b.message.view);
    const stacker=s.players.find(p=>bots[p].stackAction(p==='p0'?a.message.view:b.message.view));
    if(s.pendingPower&&!stacker){await wait(()=>!app.rooms.get(a.session.code).state.pendingPower);continue;}
    const actor = stacker ?? (s.phase === 'setup' ? s.players.find(p => !s.initial[p].ready) : s.phase === 'roundEnd' ? s.players.find(p => !s.roundReady.includes(p)) : (['power','reveal'].includes(s.phase)?s.powerActor:s.active));
    const c = actor === 'p0' ? a : b, move=bots[actor].action(c.message.view);if(move.type==='stack')stacks++;
    await action(c,move);
  }
  check('both clients complete four rounds',a.message.view.phase==='gameEnd'&&b.message.view.phase==='gameEnd'&&a.message.view.history.length===4);
  check('both clients agree on scores/results',JSON.stringify(a.message.view.result)===JSON.stringify(b.message.view.result));
  check('all accepted wire views match filtered authority',true);
  await command(a, { type: 'rematch' }); await command(b, { type: 'rematch' }); check('unanimous rematch',a.message.view.phase==='setup');
  await command(a, { type: 'action', version: -1, action: { type: 'ready' } }); check('stale input rejected',a.errors.at(-1).code==='STALE');
  const old = b.session; b.ws.close(); await wait(() => a.message.room.status === 'paused');checks.push('disconnect pauses table');
  b = await connect({ type: 'resume', code: old.code, token: old.token }); await wait(() => a.message.room.status === 'playing');check('seat-token resume',b.session.playerId==='p1');
  const bad = new WebSocket(url); await once(bad, 'open'); const response = once(bad, 'message'); bad.send(JSON.stringify({ type: 'resume', code: old.code, token: 'not-the-token' }));check('invalid token rejected',JSON.parse((await response)[0]).code==='SESSION');bad.close();
  b.ws.close(); await wait(() => a.message.room.status === 'forfeit');check('reconnect deadline forfeits',a.message.room.forfeit.winner==='p0');
  const health = await fetch(`http://127.0.0.1:${app.server.address().port}/health`);check('health endpoint',health.status===200);
  console.log(JSON.stringify({passed:true,checks:checks.length,checkNames:checks,rounds:4,actions:steps+9,botLoopActions:steps,stacks,rejectedStacks:1,privacy:'Every accepted wire view equals authority filtering; wrong stack adds a public hand-size change; penalty face remains hidden.'}));
} finally { clients.forEach(c => c.ws.terminate()); await app.close(); }
