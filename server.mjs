import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from './vendor/ws/wrapper.mjs';
import { createGame, reduce, viewFor, validateAction, RuleError, advanceTime } from './engine.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const token = () => crypto.randomBytes(24).toString('base64url');
const roomCode = () => crypto.randomBytes(5).toString('hex').slice(0, 6).toUpperCase();
const error = (ws, code, message) => send(ws, { type: 'error', code, message });
const send = (ws, message) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message)); };
const saneName = n => typeof n === 'string' ? n.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 32) || 'Guest' : 'Guest';

export function startServer({ port = Number(process.env.PORT) || 4812, host = process.env.HOST || '127.0.0.1', forfeitMs = 30000 } = {}) {
  const rooms = new Map();
  let closing = false;
  const allowedHosts = new Set(['127.0.0.1', 'localhost', '[::1]', host, ...(process.env.ALLOWED_HOSTS || '').split(',').filter(Boolean)]);
  const validHost = req => { try { return allowedHosts.has(new URL(`http://${req.headers.host}`).hostname); } catch { return false; } };
  const server = http.createServer(async (req, res) => {
    const security = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" };
    if (!validHost(req)) { res.writeHead(403, security); return res.end('Host not allowed'); }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, security); return res.end(); }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400, security); return res.end(); }
    if (pathname === '/health') { res.writeHead(200, { ...security, 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, rooms: rooms.size })); }
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filename = pathname === '/engine.mjs' ? path.join(ROOT, 'engine.mjs') : path.resolve(ROOT, 'client', relative);
    if (pathname !== '/engine.mjs' && !filename.startsWith(path.join(ROOT, 'client') + path.sep)) { res.writeHead(403, security); return res.end(); }
    if (!MIME[path.extname(filename)]) { res.writeHead(404, security); return res.end(); }
    try { const data = await readFile(filename); res.writeHead(200, { ...security, 'Content-Type': MIME[path.extname(filename)] }); res.end(req.method === 'HEAD' ? undefined : data); }
    catch { res.writeHead(404, security); res.end('Not found'); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
  server.on('upgrade', (req, socket, head) => {
    const origin = req.headers.origin;
    let allowedOrigin = !origin;
    try { if (origin) allowedOrigin = new URL(origin).host === req.headers.host; } catch { allowedOrigin = false; }
    if (req.url !== '/ws' || !validHost(req) || !allowedOrigin || wss.clients.size >= 512) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); return socket.destroy(); }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  const metadata = room => ({ code: room.code, status: room.forfeit ? 'forfeit' : room.state && room.seats.some(s => !s.ws) ? 'paused' : room.state ? 'playing' : 'waiting', names: Object.fromEntries(room.seats.map(s => [s.id, s.name])), connected: room.seats.filter(s => !!s.ws).map(s => s.id), rematchReady: [...room.rematchReady], forfeit: room.forfeit, mode: room.maxRounds ? 'quick' : 'standard', chat: room.chat });
  function schedulePower(room) {
    clearTimeout(room.powerTimer); room.powerTimer = null;
    if (room.state?.pendingPower && !room.forfeit && room.seats.every(s => s.ws)) {
      room.powerTimer = setTimeout(() => {
        room.state = advanceTime(room.state); broadcast(room);
      }, Math.max(0, room.state.pendingPower.deadline - Date.now()));
    }
  }
  function broadcast(room) {
    schedulePower(room);
    for (const seat of room.seats) send(seat.ws, { type: 'state', room: metadata(room), view: room.state ? viewFor(room.state, seat.id) : null });
  }
  function attach(ws, room, seat) {
    const old = seat.ws; seat.ws = ws; ws.seat = seat; ws.room = room;
    if (old && old !== ws) old.close(4001, 'Session resumed elsewhere');
    clearTimeout(seat.timer); seat.timer = null; room.updated = Date.now();
    seat.disconnectedAt = null;
    const expired = room.seats.find(s => !s.ws && s.disconnectedAt && Date.now() - s.disconnectedAt >= forfeitMs);
    if (expired && room.state && room.state.phase !== 'gameEnd' && !room.forfeit) room.forfeit = { loser: expired.id, winner: seat.id, reason: 'Opponent did not reconnect within 30 seconds.' };
    send(ws, { type: 'session', code: room.code, playerId: seat.id, token: seat.token }); broadcast(room);
  }
  wss.on('connection', ws => {
    ws.alive = true; ws.bucket = 80; ws.refill = Date.now(); ws.on('pong', () => { ws.alive = true; });
    ws.on('error', () => {});
    ws.on('message', bytes => {
      const now = Date.now(); ws.bucket = Math.min(80, ws.bucket + (now - ws.refill) * .03); ws.refill = now;
      if (--ws.bucket < 0) return error(ws, 'RATE_LIMIT', 'Too many actions. Wait a moment.');
      let message;
      try {
        message = JSON.parse(bytes.toString());
        if (!message || typeof message !== 'object' || Array.isArray(message) || typeof message.type !== 'string') throw new RuleError('MESSAGE', 'Invalid message.');
        if (!ws.room) {
          if (message.type === 'create') {
            if (rooms.size >= 256) throw new RuleError('CAPACITY', 'Room capacity reached. Try again later.');
            let code; do { code = roomCode(); } while (rooms.has(code));
            const room = { code, seats: [], state: null, maxRounds: message.mode === 'standard' ? 0 : 4, updated: now, rematchReady: [], forfeit: null, chat: [], chatSeq: 0 };
            const seat = { id: 'p0', token: token(), name: saneName(message.name), ws: null, timer: null }; room.seats.push(seat); rooms.set(code, room); attach(ws, room, seat);
          } else if (['join', 'resume'].includes(message.type)) {
            if (typeof message.code !== 'string' || !/^[A-F0-9]{6}$/i.test(message.code)) throw new RuleError('CODE', 'Enter a six-character room code.');
            const room = rooms.get(message.code.toUpperCase()); if (!room) throw new RuleError('ROOM', 'Room not found. Create a fresh room.');
            if (message.type === 'resume') {
              const seat = room.seats.find(s => typeof message.token === 'string' && s.token === message.token);
              if (!seat) throw new RuleError('SESSION', 'Session expired. Join a new room.'); attach(ws, room, seat);
            } else {
              if (room.seats.length >= 2) throw new RuleError('FULL', 'This room already has two players.');
              const seat = { id: 'p1', token: token(), name: saneName(message.name), ws: null, timer: null }; room.seats.push(seat); attach(ws, room, seat);
            }
          } else throw new RuleError('SESSION', 'Join a room first.');
          return;
        }
        const room = ws.room, seat = ws.seat;
        if (seat.ws !== ws) throw new RuleError('SESSION', 'This connection was replaced.'); room.updated = now;
        if (message.type === 'start') {
          if (seat.id !== 'p0' || room.state || room.seats.length !== 2 || room.seats.some(s => !s.ws)) throw new RuleError('START', 'Both players must be connected before the host starts.');
          room.state = createGame({ seed: crypto.randomBytes(4).readUInt32LE(), maxRounds: room.maxRounds });
        } else if (message.type === 'chat') {
          if (Object.keys(message).some(k => !['type', 'text'].includes(k)) || typeof message.text !== 'string' || !message.text.trim() || message.text.length > 280) throw new RuleError('CHAT', 'Write a message of 1–280 characters.');
          if (seat.lastChat && now - seat.lastChat < 700) throw new RuleError('RATE_LIMIT', 'Give your friend a moment to reply.');
          seat.lastChat = now;
          room.chat.push({ id: ++room.chatSeq, actor: seat.id, text: message.text.trim().replace(/[\u0000-\u001f\u007f]/g, ' ') });
          if (room.chat.length > 50) room.chat.shift();
        } else if (message.type === 'action') {
          if (Object.keys(message).some(k => !['type', 'action', 'version'].includes(k))) throw new RuleError('MESSAGE', 'Only actions, not client state, are accepted.');
          if (!room.state || room.forfeit) throw new RuleError('MATCH', 'No active match.');
          if (room.seats.some(s => !s.ws)) throw new RuleError('PAUSED', 'Waiting for your friend to reconnect.');
          if (!Number.isInteger(message.version) || message.version !== room.state.version) throw new RuleError('STALE', 'The table changed. Try your action again.');
          validateAction(message.action); room.state = reduce(room.state, seat.id, message.action);
          if (room.state.lastEvent.type === 'stackRejected' || room.state.lastEvent.stackRejection) error(ws, 'STACK_MISMATCH', (room.state.lastEvent.stackRejection?.penalty ?? room.state.lastEvent.penalty) ? 'Not a match. One hidden penalty card added.' : 'Not a match. Deck empty; no penalty card available.');
        } else if (message.type === 'rematch') {
          if (!room.forfeit && room.state?.phase !== 'gameEnd') throw new RuleError('REMATCH', 'Finish this match first.');
          if (!room.rematchReady.includes(seat.id)) room.rematchReady.push(seat.id);
          if (room.rematchReady.length === 2 && room.seats.every(s => s.ws)) { room.forfeit = null; room.rematchReady = []; room.state = createGame({ seed: crypto.randomBytes(4).readUInt32LE(), maxRounds: room.maxRounds }); }
        } else throw new RuleError('MESSAGE', 'Unknown room command.');
        broadcast(room);
      } catch (e) {
        error(ws, e instanceof RuleError ? e.code : 'MESSAGE', e instanceof RuleError ? e.message : 'Invalid message.');
        if (ws.room && !(message?.type === 'action' && message.action?.type === 'stack')) broadcast(ws.room);
      }
    });
    ws.on('close', () => {
      if (closing || !ws.room || ws.seat.ws !== ws) return;
      const room = ws.room, seat = ws.seat; seat.ws = null; seat.disconnectedAt = Date.now(); room.updated = Date.now(); broadcast(room);
      if (room.state && room.state.phase !== 'gameEnd' && !room.forfeit) seat.timer = setTimeout(() => {
        if (seat.ws || room.forfeit) return;
        const winner = room.seats.find(s => s.id !== seat.id && s.ws);
        if (winner) { room.forfeit = { loser: seat.id, winner: winner.id, reason: 'Opponent did not reconnect within 30 seconds.' }; broadcast(room); }
      }, forfeitMs);
    });
  });
  const heartbeat = setInterval(() => { for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; ws.ping(); } }, 15000);
  const cleanup = setInterval(() => { for (const [code, room] of rooms) if (Date.now() - room.updated > 1800000 && room.seats.every(s => !s.ws)) { room.seats.forEach(s => clearTimeout(s.timer)); rooms.delete(code); } }, 60000);
  server.listen(port, host, () => console.log(`Cabo listening at http://${host}:${server.address().port}`));
  return { server, rooms, close: () => new Promise(resolve => { closing = true; clearInterval(heartbeat); clearInterval(cleanup); for (const room of rooms.values()) { clearTimeout(room.powerTimer); room.seats.forEach(s => clearTimeout(s.timer)); } for (const ws of wss.clients) ws.terminate(); wss.close(); server.close(resolve); }) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startServer();
