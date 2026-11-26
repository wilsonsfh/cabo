import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGame, createBot, reduce, viewFor, advanceTime } from '../engine.mjs';

// The browser imports the engine from the site root; resolve that URL for Node.
const source = (await readFile(new URL('../client/transport.mjs', import.meta.url), 'utf8'))
  .replace("'/engine.mjs'", JSON.stringify(new URL('../engine.mjs', import.meta.url).href));
const { LocalAdapter } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('solo bot leaves a readable pause between actions and cancels on exit', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const updates = [];
  const adapter = new LocalAdapter({ seed: 4, onState: value => updates.push(value), onError: assert.fail });
  t.after(() => adapter.close());
  t.mock.timers.tick(1000);
  assert.equal(updates.length, 1, 'the bot must not race the card animation');
  t.mock.timers.tick(100);
  assert.equal(updates.length, 2);
  t.mock.timers.tick(1000);
  assert.equal(updates.length, 2, 'each action gets its own pause');
  t.mock.timers.tick(100);
  assert.equal(updates.length, 3);
  adapter.close();
  t.mock.timers.tick(5000);
  assert.equal(updates.length, 3);
});

test('bot holds a private look longer before resolving its power', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let state = createGame({ seed: 4 });
  const bots = { p0: createBot(5), p1: createBot(6) };
  for (let i = 0; i < 500 && !(state.phase === 'reveal' && state.powerActor === 'p1'); i++) {
    if (state.pendingPower) state = advanceTime(state, state.pendingPower.deadline);
    for (const id of state.players) bots[id].observe(viewFor(state, id));
    const actor = state.phase === 'setup' ? state.players.find(id => !state.initial[id].ready)
      : state.phase === 'roundEnd' ? state.players.find(id => !state.roundReady.includes(id))
      : ['power', 'reveal'].includes(state.phase) ? state.powerActor : state.active;
    state = reduce(state, actor, bots[actor].action(viewFor(state, actor)));
  }
  assert.equal(state.phase, 'reveal');
  assert.equal(state.powerActor, 'p1');
  const adapter = new LocalAdapter({ seed: 4, onState: () => {}, onError: assert.fail });
  t.after(() => adapter.close());
  adapter.state = state;
  adapter.emit();
  const version = state.version;
  t.mock.timers.tick(1500);
  assert.equal(adapter.state.version, version, 'the look should remain visible long enough to follow');
  t.mock.timers.tick(100);
  assert.ok(adapter.state.version > version);
});
