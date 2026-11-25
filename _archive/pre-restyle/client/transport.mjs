import { createGame, reduce, viewFor, createBot } from '/engine.mjs';
export class LocalAdapter {
  constructor({ name = 'You', mode = 'quick', seed = Date.now(), onState, onError }) {
    this.onState = onState; this.onError = onError; this.name = name; this.mode = mode; this.seed = seed; this.bot = createBot(seed + 9);
    this.state = createGame({ seed, maxRounds: mode === 'standard' ? 0 : 4 }); this.closed = false; this.timer = null; this.emit();
  }
  emit() {
    if (this.closed) return;
    const v = viewFor(this.state, 'p0'); this.bot.observe(viewFor(this.state, 'p1'));
    this.onState({ view: v, room: { status: 'playing', names: { p0: this.name, p1: 'Pip · memory bot' }, connected: ['p0', 'p1'], mode: this.mode, solo: true } });
    clearTimeout(this.timer);
    const botActs = this.state.phase === 'setup' && !this.state.initial.p1.ready || this.state.phase === 'roundEnd' && !this.state.roundReady.includes('p1') || !['setup', 'roundEnd', 'gameEnd'].includes(this.state.phase) && this.state.active === 'p1';
    if (botActs) this.timer = setTimeout(() => {
      if (this.closed) return;
      try { const a = this.bot.action(viewFor(this.state, 'p1')); if (a) this.state = reduce(this.state, 'p1', a); this.emit(); }
      catch (e) { this.onError(e.message); }
    }, this.state.phase === 'reveal' ? 260 : 340);
  }
  action(action) { try { this.state = reduce(this.state, 'p0', action); this.emit(); } catch (e) { this.onError(e.message); } }
  rematch() { this.state = createGame({ seed: ++this.seed, maxRounds: this.mode === 'standard' ? 0 : 4 }); this.bot = createBot(this.seed + 9); this.emit(); }
  close() { this.closed = true; clearTimeout(this.timer); }
}
export class SocketAdapter {
  constructor({ command, onState, onError, onSession, onConnection }) {
    this.command = command; this.onState = onState; this.onError = onError; this.onSession = onSession; this.onConnection = onConnection;
    this.closed = false; this.view = null; this.session = null; this.retry = 0; this.connect();
  }
  connect() {
    this.onConnection('Connecting…');
    this.ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
    this.ws.addEventListener('open', () => { this.retry = 0; this.ws.send(JSON.stringify(this.session ? { type: 'resume', ...this.session } : this.command)); this.onConnection('Connected'); });
    this.ws.addEventListener('message', e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === 'session') { this.session = { code: m.code, token: m.token }; this.onSession(m); }
      if (m.type === 'state') { this.view = m.view; this.onState(m); }
      if (m.type === 'error') this.onError(m.message);
    });
    this.ws.addEventListener('close', e => {
      if (this.closed || e.code === 4001) { if (e.code === 4001) this.onError('This seat was resumed in another tab.'); return; }
      this.onConnection('Reconnecting… the table is paused');
      if (this.session) this.timer = setTimeout(() => this.connect(), Math.min(1000 * 2 ** this.retry++, 5000));
      else this.onError('Connection closed. Create or join a room again.');
    });
    this.ws.addEventListener('error', () => this.onConnection('Connection interrupted'));
  }
  send(message) { if (this.ws.readyState !== WebSocket.OPEN) return this.onError('Reconnecting. Your move was not sent.'); this.ws.send(JSON.stringify(message)); }
  action(action) { this.send({ type: 'action', action, version: this.view.version }); }
  start() { this.send({ type: 'start' }); }
  rematch() { this.send({ type: 'rematch' }); }
  close() { this.closed = true; clearTimeout(this.timer); this.ws.close(); }
}
