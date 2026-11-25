import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { startServer } from '../server.mjs';
import { createBot, viewFor } from '../engine.mjs';
const app = startServer({ port: 0, forfeitMs: 120 });
await once(app.server, 'listening');
const url = `ws://127.0.0.1:${app.server.address().port}/ws`;
const clients = [];
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
        const wire = data.toString(); assert.equal(wire.includes('secret-r'), false); assert.equal('deck' in m.view, false); assert.equal('rng' in m.view, false);
        assert.equal(wire.includes(c.session.token), false);
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
try {
  const a = await connect({ type: 'create', mode: 'quick', name: 'Aleksandra Wiśniewska-Kowalczyk' });
  let b = await connect({ type: 'join', code: a.session.code, name: '<script>literal</script>' });
  await command(a, { type: 'start' });
  const bots = { p0: createBot(80), p1: createBot(90) }; let steps = 0;
  while (a.message.view.phase !== 'gameEnd' && steps++ < 1500) {
    const state = app.rooms.get(a.session.code).state;
    const actor = state.phase === 'setup' ? state.players.find(p => !state.initial[p].ready) : state.phase === 'roundEnd' ? state.players.find(p => !state.roundReady.includes(p)) : state.active;
    const c = actor === 'p0' ? a : b;
    const v = c.message.view; bots.p0.observe(a.message.view); bots.p1.observe(b.message.view);
    await command(c, { type: 'action', version: v.version, action: bots[actor].action(v) });
  }
  assert.equal(a.message.view.phase, 'gameEnd'); assert.equal(b.message.view.phase, 'gameEnd'); assert.equal(a.message.view.history.length, 4);
  await command(a, { type: 'rematch' }); await command(b, { type: 'rematch' }); assert.equal(a.message.view.phase, 'setup');
  await command(a, { type: 'action', version: -1, action: { type: 'ready' } }); assert.equal(a.errors.at(-1).code, 'STALE');
  const old = b.session; b.ws.close(); await wait(() => a.message.room.status === 'paused');
  b = await connect({ type: 'resume', code: old.code, token: old.token }); await wait(() => a.message.room.status === 'playing'); assert.equal(b.session.playerId, 'p1');
  const bad = new WebSocket(url); await once(bad, 'open'); const response = once(bad, 'message'); bad.send(JSON.stringify({ type: 'resume', code: old.code, token: 'not-the-token' })); assert.equal(JSON.parse((await response)[0]).code, 'SESSION'); bad.close();
  b.ws.close(); await wait(() => a.message.room.status === 'forfeit'); assert.equal(a.message.room.forfeit.winner, 'p0');
  const health = await fetch(`http://127.0.0.1:${app.server.address().port}/health`); assert.equal(health.status, 200);
  console.log(`PASS: two WebSocket clients completed a four-round match in ${steps} actions; all wire views equal their filtered authority view, no secret identities, rematch, stale input rejection, pause/resume, invalid token and forfeit verified.`);
} finally { clients.forEach(c => c.ws.terminate()); await app.close(); }
