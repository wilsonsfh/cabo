import { LocalAdapter, SocketAdapter } from './transport.mjs';
import { IslandScene, CAST } from './scene.mjs';
import { Sound } from './audio.mjs';
import { powerFor } from '/engine.mjs';

const $ = id => document.getElementById(id), sound = new Sound();
const params = new URLSearchParams(location.search), preference = matchMedia('(prefers-reduced-motion: reduce)');
let userReduced = localStorage.getItem('callit-reduced') === 'true';
let adapter = null, view = null, room = null, session = null, selected = [], multi = false, instant = false, lastVersion = -1, toastTimer;
const reduceMotion = () => userReduced || preference.matches;
const scene = new IslandScene({ canvas: $('canvas'), reduced: reduceMotion(), forceFallback: params.has('fallback'), onPick: pick, onProject: points => {
  for (const [key, point] of Object.entries(points)) { const el = document.querySelector(`[data-card="${key}"]`); if (el) { el.style.left = `${point.x}px`; el.style.top = `${point.y}px`; } }
} });
function announce(text) { $('announcer').textContent = text; }
function toast(text, isError = false) { $('toast').textContent = text; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 4000); announce(text); if (isError) sound.play('error'); }
function name(id) { return room?.names?.[id] || (id === view?.viewer ? 'You' : 'Friend'); }
function nameInput() { return $('name').value.trim() || 'You'; }
function settings() { $('sound').textContent = sound.enabled ? 'Sound on' : 'Sound off'; $('sound').setAttribute('aria-pressed', String(sound.enabled)); $('motion').textContent = reduceMotion() ? 'Less motion on' : 'Less motion'; $('motion').setAttribute('aria-pressed', String(reduceMotion())); document.body.classList.toggle('reduce-motion', reduceMotion()); scene.setReduced(reduceMotion()); }
$('sound').onclick = () => { sound.toggle(); sound.play('click'); settings(); };
$('motion').onclick = () => { userReduced = !userReduced; localStorage.setItem('callit-reduced', String(userReduced)); settings(); };
preference.addEventListener('change', settings); settings();
document.addEventListener('pointerdown', () => { instant = false; document.body.classList.remove('keyboard-action'); sound.unlock(); }, { passive: true });
$('name').value = localStorage.getItem('callit-name') || '';
function openRules() { $('rules').showModal(); }
$('rules-open').onclick = openRules; $('rules-footer').onclick = e => { e.preventDefault(); openRules(); }; $('rules-close').onclick = () => $('rules').close(); $('rules-play').onclick = () => $('rules').close();
function goLobby() {
  if (adapter && view && !['gameEnd', 'roundEnd'].includes(view.phase) && !confirm('Leave this table? Your current solo match will end; online seats can reconnect for 30 seconds.')) return;
  adapter?.close(); adapter = null; view = null; room = null; selected = []; multi = false; $('lobby').hidden = false; $('table-ui').hidden = true; scene.showLobby(); lastVersion = -1;
}
$('home').onclick = goLobby; $('leave').onclick = goLobby;
function prepare() { adapter?.close(); view = null; selected = []; multi = false; lastVersion = -1; localStorage.setItem('callit-name', nameInput()); $('lobby-message').textContent = 'Opening your table…'; }
function startSolo(seed = Date.now()) {
  prepare(); adapter = new LocalAdapter({ name: nameInput(), mode: $('mode').value, seed, onState: receive, onError: text => toast(text, true) });
}
$('solo').onclick = () => startSolo();
function online(command) {
  prepare(); adapter = new SocketAdapter({ command, onState: receive, onError: text => { toast(text, true); $('lobby-message').textContent = text; }, onConnection: text => { $('lobby-message').textContent = text; if (room) $('waiting-status').textContent = text; }, onSession: s => {
    session = s; sessionStorage.setItem(`callit-seat-${s.code}`, JSON.stringify(s)); $('match-label').textContent = `PRIVATE TABLE · ${s.code}`;
    const url = new URL(location); url.searchParams.set('room', s.code); history.replaceState(null, '', url);
  } });
}
$('create').onclick = () => online({ type: 'create', name: nameInput(), mode: $('mode').value });
$('join').onclick = () => { const code = $('room-code').value.trim().toUpperCase(); if (!/^[A-F0-9]{6}$/.test(code)) return toast('Enter the six-character room code.', true); const saved = sessionStorage.getItem(`callit-seat-${code}`); if (saved) { const s = JSON.parse(saved); online({ type: 'resume', code, token: s.token }); } else online({ type: 'join', code, name: nameInput() }); };
$('room-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('join').click(); });
$('room-code').value = params.get('room') || '';
$('copy-invite').onclick = async () => { const url = new URL(location); url.search = `?room=${room.code}`; try { await navigator.clipboard.writeText(url.href); toast('Invite link copied. Send it to your friend.'); } catch { toast(`Share code ${room.code} at ${location.origin}`); } };
$('start-match').onclick = () => adapter.start();
function receive(message) {
  const previous = view; view = message.view; room = message.room;
  $('lobby').hidden = true; $('table-ui').hidden = false;
  $('waiting').hidden = !!view; $('results').hidden = true;
  if (!view) {
    $('invite-code').textContent = room.code; $('waiting-status').textContent = room.connected.length === 2 ? `${name('p1')} is here. Ready when you are.` : 'Waiting for your friend…';
    $('start-match').hidden = session?.playerId !== 'p0'; $('start-match').disabled = room.connected.length !== 2;
    $('turn-panel')?.setAttribute('hidden', ''); $('actions').replaceChildren(); $('card-controls').replaceChildren(); $('instruction').textContent = 'Your private table'; $('hint').textContent = 'Share the room code. Both players use the same real server.';
    $('score-strip')?.setAttribute('hidden', ''); scene.showLobby(); return;
  }
  $('turn-panel')?.removeAttribute('hidden'); $('score-strip')?.removeAttribute('hidden');
  if (previous?.version !== view.version) { selected = []; multi = false; }
  if (view.version !== lastVersion) {
    const e = view.lastEvent;
    const description = eventText(e); $('event-note').textContent = description;
    if (description) announce(description);
    if (e.actor && e.actor !== view.viewer) sound.play(e.type === 'swap' ? 'swap' : e.type === 'call' ? 'call' : e.type === 'draw' ? 'draw' : 'click');
    if (view.phase === 'reveal' && view.active === view.viewer) sound.play('reveal');
    if (['roundEnd', 'gameEnd'].includes(view.phase)) sound.play('win');
    lastVersion = view.version;
  }
  render();
}
function eventText(e) {
  if (!e) return '';
  const who = e.actor === view.viewer ? 'You' : name(e.actor);
  const texts = { draw: `${who} drew ${e.source === 'deck' ? 'a secret card' : 'from the discard pile'}.`, replace: `${who} exchanged ${e.matched === 1 ? 'one card' : `${e.matched} matching cards`}.`, discard: `${who} discarded a card.`, ability: `${who} used ${e.ability}. Choose a target.`, peek: `${who} peeked at one of their cards.`, spy: `${who} spied on an opponent card.`, swap: `${who} swapped a card with the other player.`, call: `${who} called it. One final turn!`, mismatch: `${who} missed the match. Cards exposed; ${e.penalty} card${e.penalty === 1 ? '' : 's'} added.`, roundEnd: 'All secrets are out. Lowest score wins.' };
  return texts[e.type] || '';
}
function act(action, keyboard = false) { if (!adapter || !view) return; instant = keyboard; if (keyboard) document.body.classList.add('keyboard-action'); sound.unlock(); sound.play(action.type === 'call' ? 'call' : action.type === 'draw' ? 'draw' : action.type === 'power' ? 'reveal' : 'click'); selected = []; adapter.action(action); }
function button(text, onClick, style = 'secondary', disabled = false) { const b = document.createElement('button'); b.textContent = text; b.className = style; b.disabled = disabled; b.onclick = onClick; return b; }
function canPick(owner, slot) {
  if (!view || room.status === 'paused' || room.status === 'forfeit') return false;
  if (view.phase === 'setup') return owner === view.viewer && !view.setup.ready && view.setup.seen.length === 0;
  if (view.active !== view.viewer) return false;
  if (view.phase === 'drawn') return owner === view.viewer;
  if (view.phase === 'power') {
    const card = view.hands[owner].find(c => c.slot === slot);
    if (view.power === 'swap') return true;
    return !card.faceUp && (view.power === 'peek' ? owner === view.viewer : owner !== view.viewer);
  }
  return false;
}
function pick(key, keyboard = false) {
  if (key === 'deck' || key === 'discard') { if (view?.phase === 'turn' && view.active === view.viewer) act({ type: 'draw', source: key }, keyboard); return; }
  const [kind, owner, slotText] = key.split(':'); const slot = Number(slotText);
  if (kind !== 'hand' || !canPick(owner, slot)) return;
  const token = `${owner}:${slot}`;
  if (view.phase === 'setup') {
    selected = selected.includes(token) ? selected.filter(t => t !== token) : [...selected, token];
    if (selected.length === 2) return act({ type: 'initialPeek', slots: selected.map(t => Number(t.split(':')[1])) }, keyboard);
  } else if (view.phase === 'drawn') {
    if (!multi) return act({ type: 'replace', slots: [slot] }, keyboard);
    selected = selected.includes(token) ? selected.filter(t => t !== token) : selected.length < 4 ? [...selected, token] : selected;
  } else if (view.phase === 'power') {
    if (view.power !== 'swap') return act({ type: 'power', slot }, keyboard);
    selected = [...selected.filter(t => t.split(':')[0] !== owner), token];
    if (selected.length === 2) return act({ type: 'power', ownSlot: Number(selected.find(t => t.startsWith(view.viewer + ':')).split(':')[1]), otherSlot: Number(selected.find(t => !t.startsWith(view.viewer + ':')).split(':')[1]) }, keyboard);
  }
  instant = keyboard; render();
}
function render() {
  const self = view.viewer, other = view.players.find(p => p !== self), mine = view.active === self;
  $('self-name').textContent = name(self); $('opponent-name').textContent = name(other);
  $('self-score').textContent = `${view.scores[self]} total points`; $('opponent-score').textContent = `${view.scores[other]} total points`;
  $('opponent-status').textContent = room.solo ? 'MEMORY BOT' : room.connected.includes(other) ? 'CONNECTED' : 'RECONNECTING';
  $('match-label').textContent = room.solo ? 'SOLO · PIP HAS A MEMORY, NOT X-RAY VISION' : `PRIVATE TABLE · ${room.code}`;
  $('round-label').textContent = view.maxRounds ? `ROUND ${view.round} / ${view.maxRounds}` : `ROUND ${view.round} · TO 100`;
  let tag = mine ? 'YOUR TURN' : `${name(other).toUpperCase()}'S TURN`, title = '', hint = '';
  const actions = [];
  const add = (text, action, style = 'secondary', disabled = false) => actions.push(button(text, () => act(action), style, disabled));
  if (room.status === 'paused') { tag = 'TABLE PAUSED'; title = 'Hold that thought.'; hint = 'Your friend has 30 seconds to reconnect. Your cards are safe.'; }
  else if (view.phase === 'setup') {
    tag = 'FIRST, A LITTLE MEMORY';
    if (view.setup.ready) { title = 'Secrets tucked away.'; hint = 'Waiting for the other player to hide their two cards.'; }
    else if (view.setup.seen.length) { title = 'Remember these two.'; hint = 'They disappear when you hide them. No rush.'; add('Hide cards · ready →', { type: 'ready' }, 'primary'); }
    else { title = selected.length ? 'Pick one more.' : 'Meet two of your cards.'; hint = 'Tap any two of YOUR numbered card buttons. You only get one look.'; }
  } else if (['roundEnd', 'gameEnd'].includes(view.phase)) { tag = 'SECRETS REVEALED'; title = 'Every point counts.'; hint = 'The creatures are out. See who kept the smallest total.'; showResults(); }
  else if (!mine) { title = view.caller ? 'Their final turn.' : 'A little mischief…'; hint = view.phase === 'power' ? `${name(other)} is choosing a ${view.power} target.` : view.phase === 'drawn' ? 'They have a card. Watch what they keep or discard.' : 'Watch their move. Your turn comes next.'; }
  else if (view.phase === 'turn') { title = view.caller ? 'Your final turn.' : 'Draw. Decide. Repeat.'; hint = view.caller ? 'Your friend called it. This is your last chance to lower your score.' : 'Tap a pile, or call it if you think your score is lowest.'; add('Draw deck · D', { type: 'draw', source: 'deck' }, 'primary', !view.deckCount); add(`Take ${view.discard?.value ?? '—'} · T`, { type: 'draw', source: 'discard' }, 'secondary', !view.discard); if (!view.caller) add('Call it! · C', { type: 'call' }, 'call'); }
  else if (view.phase === 'drawn') {
    const value = view.held.value, power = powerFor(value); title = `${value} · ${CAST[value][0]}`;
    hint = multi ? `Select matching own cards (${selected.length} selected), then exchange. Wrong memories earn penalty cards.` : 'Tap your card to replace it. Or discard the draw and use its ability.';
    if (view.held.source === 'deck') { add('Discard · X', { type: 'discard' }); if (power) add(`${power === 'peek' ? 'Peek at yours' : power === 'spy' ? 'Spy on theirs' : 'Swap a pair'} · P`, { type: 'discard', usePower: true }, 'primary'); }
    actions.push(button(multi ? 'One-card exchange' : 'Match several', () => { multi = !multi; selected = []; render(); }));
    if (multi) add(`Exchange ${selected.length} cards`, { type: 'replace', slots: selected.map(t => Number(t.split(':')[1])) }, 'primary', selected.length < 2);
  } else if (view.phase === 'power') {
    title = view.power === 'peek' ? 'Peek at your secret.' : view.power === 'spy' ? 'Find their weak spot.' : 'A fair little trade.';
    hint = view.power === 'swap' ? selected.length ? 'Now choose a card from the other player.' : 'Choose one of yours and one of theirs. No looking.' : view.power === 'peek' ? 'Tap one of YOUR face-down cards.' : 'Tap one of THEIR face-down cards.';
    add('Skip ability', { type: 'skip' });
  } else if (view.phase === 'reveal') { title = `${view.peek.value} · ${CAST[view.peek.value][0]}`; hint = `A private ${view.power}. Remember that slot, then hide the card.`; add('Hide card · Enter', { type: 'ack' }, 'primary'); }
  if (room.status === 'forfeit') { tag = 'MATCH ENDED'; title = 'Your friend drifted away.'; hint = 'The reconnect deadline passed.'; showResults(true); }
  $('turn-tag').textContent = tag; $('instruction').textContent = title; $('hint').textContent = hint; $('actions').replaceChildren(...actions);
  const controls = [];
  for (const owner of [other, self]) for (const card of view.hands[owner]) {
    const key = `hand:${owner}:${card.slot}`, label = owner === self ? `Y${card.slot + 1}` : `P${card.slot + 1}`;
    const b = button('', () => pick(key)); b.className = `card-slot${selected.includes(`${owner}:${card.slot}`) ? ' selected' : ''}`; b.dataset.card = key; b.disabled = !canPick(owner, card.slot);
    const v = document.createElement('span'); v.className = 'value'; v.textContent = card.value === null ? label : String(card.value); b.append(v);
    const small = document.createElement('span'); small.textContent = card.value === null ? 'HIDDEN' : `${label}·${CAST[card.value][0]}`; b.append(small);
    b.title = card.value === null ? `${owner === self ? 'Your' : 'Opponent'} hidden card ${card.slot + 1}` : `${card.value} · ${CAST[card.value][0]} · ${card.temporary ? 'private reveal' : 'face up'}`;
    b.setAttribute('aria-label', `${owner === self ? 'Your' : 'Opponent'} card ${card.slot + 1}, ${card.value === null ? 'face down' : 'value ' + card.value}${selected.includes(`${owner}:${card.slot}`) ? ', selected' : ''}`); controls.push(b);
  }
  $('card-controls').replaceChildren(...controls); scene.update(view, { instant: instant || reduceMotion(), selected });
  const wideHands = Object.values(view.hands).some(hand => hand.some(card => card.slot >= 4));
  document.body.classList.toggle('wide-hands', wideHands);
  if (wideHands) {
    const rows = [other, self].map(owner => {
      const row = document.createElement('div'); row.className = 'hand-scroll-row'; row.setAttribute('aria-label', owner === self ? 'Your full hand' : 'Opponent full hand');
      const label = document.createElement('span'); label.className = 'hand-scroll-label'; label.textContent = owner === self ? 'YOURS' : 'THEIRS'; row.append(label);
      controls.filter(el => el.dataset.card.startsWith(`hand:${owner}:`)).forEach(el => row.append(el)); return row;
    });
    $('card-controls').replaceChildren(...rows);
  }
  announce(`${tag}. ${title} ${hint}`);
}
function showResults(forfeit = false) {
  $('results').hidden = false;
  const ended = forfeit || view.phase === 'gameEnd', result = view.result;
  $('result-tag').textContent = forfeit ? 'RECONNECT DEADLINE PASSED' : ended ? 'MATCH COMPLETE' : `ROUND ${view.round} COMPLETE`;
  const winner = forfeit ? room.forfeit.winner : ended ? view.winners[0] : result.successfulCall ? result.caller : [...view.players].sort((a, b) => result.points[a] - result.points[b])[0];
  $('result-title').textContent = winner === view.viewer ? ended ? 'Your island. Your win.' : 'Small score. Big grin.' : ended ? `${name(winner)} wins.` : `${name(winner)} takes it.`;
  if (!forfeit && ended && view.winners.length > 1) $('result-title').textContent = 'A shared island victory.';
  $('result-subtitle').textContent = forfeit ? room.forfeit.reason : result.moon ? 'Kamikaze! Two 12s and both 13s.' : result.caller ? result.successfulCall ? `${name(result.caller)} called it and scored zero.` : `${name(result.caller)} called too soon: +10 points.` : 'The draw deck ran out. Lowest sum wins.';
  const rows = view.players.map(id => {
    const row = document.createElement('div'); row.className = 'score-row'; const who = document.createElement('span'); who.textContent = name(id); const points = document.createElement('b'); points.textContent = forfeit ? id === winner ? 'WIN' : 'OUT' : String(result.points[id]); const total = document.createElement('small'); total.textContent = `${view.scores[id]} total`; points.append(total); row.append(who, points); return row;
  }); $('result-scores').replaceChildren(...rows);
  const waiting = ended ? room.rematchReady?.includes(view.viewer) : view.roundReady.includes(view.viewer);
  $('result-action').replaceChildren(button(waiting ? 'Waiting for your friend…' : ended ? 'One more match ↗' : 'Next round →', () => ended ? adapter.rematch() : act({ type: 'nextRound' }), 'primary', waiting));
}
document.addEventListener('keydown', e => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable || e.metaKey || e.ctrlKey || e.altKey || $('rules').open) return;
  instant = true; document.body.classList.add('keyboard-action');
  if (!view) return;
  const k = e.key.toLowerCase();
  if (/^Digit[1-9]$/.test(e.code)) { e.preventDefault(); const owner = e.shiftKey ? view.players.find(p => p !== view.viewer) : view.viewer; pick(`hand:${owner}:${Number(e.code.slice(-1)) - 1}`, true); }
  else if (view.active === view.viewer && room.status !== 'paused') {
    const a = k === 'd' && view.phase === 'turn' ? { type: 'draw', source: 'deck' } : k === 't' && view.phase === 'turn' ? { type: 'draw', source: 'discard' } : k === 'c' && view.phase === 'turn' && !view.caller ? { type: 'call' } : k === 'x' && view.phase === 'drawn' && view.held.source === 'deck' ? { type: 'discard' } : k === 'p' && view.phase === 'drawn' && powerFor(view.held.value) ? { type: 'discard', usePower: true } : k === 'enter' && view.phase === 'reveal' ? { type: 'ack' } : k === 'enter' && view.phase === 'setup' && view.setup.seen.length && !view.setup.ready ? { type: 'ready' } : null;
    if (a) { e.preventDefault(); act(a, true); }
  }
});
if (params.get('test') === '1') window.__CALLIT__ = { startSolo, act: a => act(a, true), pick: key => pick(key, true), getView: () => view, getRoom: () => room, scene, setMode: mode => { $('mode').value = mode; } };
