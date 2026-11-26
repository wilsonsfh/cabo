import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from '../vendor/ws/wrapper.mjs';
const origin = process.env.CLOUDFLARE_TEST_URL || 'http://127.0.0.1:5892';
const url = origin.replace(/^http/, 'ws') + '/ws';
const wait = async predicate => { const end = Date.now() + 8000; while (!predicate()) { if (Date.now() > end) throw new Error('WebSocket timeout'); await new Promise(resolve => setTimeout(resolve, 10)); } };
async function connect(command) {
  const socket = new WebSocket(url, { origin });
  const peer = { socket, session: null, state: null, errors: [] };
  socket.on('message', raw => { const m = JSON.parse(raw); if (m.type === 'session') peer.session = m; if (m.type === 'state') peer.state = m; if (m.type === 'error') peer.errors.push(m); });
  await once(socket, 'open'); socket.send(JSON.stringify(command)); await wait(() => peer.session && peer.state); return peer;
}
test('Cloudflare adapter: create, join, start, hidden cards, chat and reconnect', async () => {
  const a = await connect({ type: 'create', name: 'A' }); let b, resumed;
  try {
    b = await connect({ type: 'join', code: a.session.code, name: 'B' });
    a.socket.send(JSON.stringify({ type: 'start' }));
    await wait(() => a.state.view && b.state.view);
    assert.equal(a.state.room.status, 'playing');
    assert.equal('deck' in a.state.view, false); assert.equal('rng' in a.state.view, false);
    for (const hand of Object.values(a.state.view.hands)) for (const card of hand) if (card.value === null) for (const key of ['rank', 'suit', 'color', 'id']) assert.equal(key in card, false);
    a.socket.send(JSON.stringify({ type: 'chat', text: 'Cloudflare adapter test' }));
    await wait(() => b.state.room.chat.some(message => message.text === 'Cloudflare adapter test'));
    b.socket.close(); await wait(() => a.state.room.status === 'paused');
    resumed = await connect({ type: 'resume', code: a.session.code, token: b.session.token });
    await wait(() => a.state.room.status === 'playing');
    assert.equal(resumed.session.playerId, b.session.playerId); assert.equal(a.errors.length, 0);
  } finally { a.socket.close(); b?.socket.close(); resumed?.socket.close(); }
});
