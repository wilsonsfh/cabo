import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, reduce as rawReduce, advanceTime, STACK_WINDOW_MS, viewFor, scoreRound, createBot, assertState, RuleError, makeDeck, RANKS, SUITS, cardValue, powerFor } from '../engine.mjs';

// Legacy power tests resolve the new window explicitly without wall-clock waits.
function reduce(s, actor, action) { const next=rawReduce(s,actor,action); return action.type==='discard' && next.pendingPower ? advanceTime(next,next.pendingPower.deadline) : next; }
function started(seed = 4, maxRounds = 0) {
  let s = createGame({ seed, maxRounds });
  for (const id of s.players) { s = reduce(s, id, { type: 'initialPeek', slots: [0, 1] }); s = reduce(s, id, { type: 'ready' }); }
  return s;
}
function place(s, target, index, rank, suit = 'spades') {
  rank = String(rank); if (rank === '1') rank = 'A'; if (rank === '11') rank = 'J'; if (rank === '12') rank = 'Q'; if (rank === '13') rank = 'K';
  for (const list of [s.deck, s.discard, ...Object.values(s.hands)]) {
    const i = list.findIndex(c => c?.rank === rank && c.suit === suit);
    if (i >= 0) { [target[index], list[i]] = [list[i], target[index]]; target[index].faceUp = false; return; }
  }
  throw new Error(`Fixture could not find ${rank} ${suit}`);
}
function hand(s, owner, faces) { faces.forEach(([rank,suit],i) => place(s,s.hands[owner],i,rank,suit)); }
function drawRank(rank, suit = 'spades') {
  let s = started(); place(s,s.deck,s.deck.length-1,rank,suit);
  return reduce(s, s.active, { type: 'draw', source: 'deck' });
}
function assertView(s, id) {
  const v = viewFor(s, id), wire = JSON.stringify(v);
  for (const c of [...s.deck, ...s.discard, ...s.players.flatMap(p => s.hands[p].filter(Boolean)), ...(s.held ? [s.held.card] : [])]) assert.equal(wire.includes(c.id), false, 'Internal identities never cross the view boundary.');
  assert.equal('deck' in v, false); assert.equal('rng' in v, false); assert.equal('initial' in v, false);
  for (const owner of s.players) for (const c of v.hands[owner]) {
    const raw = s.hands[owner][c.slot];
    const permitted = raw.faceUp || ['roundEnd','gameEnd'].includes(s.phase) || owner === id && s.phase === 'setup' && !s.initial[id].ready && s.initial[id].seen.includes(c.slot) || s.phase === 'reveal' && s.peek.viewer === id && s.peek.targets.some(t => t.owner === owner && t.slot === c.slot);
    assert.equal(c.value, permitted ? raw.value : null);
    for (const field of ['rank','suit','color']) assert.equal(c[field], permitted ? raw[field] : undefined);
    assert.equal('id' in c,false);
  }
  if (s.held && s.held.owner !== id) assert.deepEqual(v.held,{value:null});
  if (s.peek && s.peek.viewer !== id) assert.equal(v.peek, null);
}

test('exact 52-card suited deck: 13 unique ranks per suit, opaque UUIDs, no jokers or zeros', () => {
  const deck = makeDeck(); assert.equal(deck.length,52); assert.equal(new Set(deck.map(c=>c.id)).size,52);
  for (const suit of SUITS) assert.deepEqual(deck.filter(c=>c.suit===suit).map(c=>c.rank),RANKS);
  for (const c of deck) {
    assert.match(c.id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(c.value,cardValue(c.rank,c.suit)); assert.equal(c.color,['hearts','diamonds'].includes(c.suit)?'red':'black');
  }
  assert.equal(deck.filter(c=>c.value===-1).length,2); assert.equal(deck.filter(c=>c.value===13).length,2); assert.equal(deck.some(c=>c.value===0),false);
});
test('seeded deals are reproducible apart from intentionally random opaque identity; reducers are immutable', () => {
  const normalize = s => JSON.parse(JSON.stringify(s,(k,v)=>k==='id'?undefined:v));
  assert.deepEqual(normalize(createGame({seed:77})),normalize(createGame({seed:77})));
  const a=createGame(), copy=structuredClone(a); reduce(a,'p0',{type:'initialPeek',slots:[0,1]}); assert.deepEqual(a,copy);
});
test('Ace, number cards, Jack, Queen, red and black King scoring', () => {
  for (const suit of SUITS) { assert.equal(cardValue('A',suit),1); for(let n=2;n<=10;n++) assert.equal(cardValue(String(n),suit),n); assert.equal(cardValue('J',suit),11); assert.equal(cardValue('Q',suit),12); }
  assert.equal(cardValue('K','hearts'),-1); assert.equal(cardValue('K','diamonds'),-1); assert.equal(cardValue('K','spades'),13); assert.equal(cardValue('K','clubs'),13);
  const s=started(); hand(s,'p0',[['K','hearts'],['K','diamonds'],['A','hearts'],['A','diamonds']]); hand(s,'p1',[['K','spades'],['K','clubs'],['J','hearts'],['Q','hearts']]);
  assert.deepEqual(scoreRound(s).sums,{p0:0,p1:49}); assertState(s);
});
test('initial peek exactly two once; hides on readiness; all private fields filtered', () => {
  let s=createGame(); assert.throws(()=>reduce(s,'p0',{type:'ready'}),RuleError);
  assert.throws(()=>reduce(s,'p0',{type:'initialPeek',slots:[0,0]}),{code:'SLOTS'});
  s=reduce(s,'p0',{type:'initialPeek',slots:[1,3]}); assert.equal(viewFor(s,'p0').hands.p0.filter(c=>c.value!==null).length,2); assertView(s,'p0'); assertView(s,'p1');
  assert.throws(()=>reduce(s,'p0',{type:'initialPeek',slots:[0,2]}),{code:'INITIAL_PEEK'});
  s=reduce(s,'p0',{type:'ready'}); assert.equal(viewFor(s,'p0').hands.p0.every(c=>c.value===null),true); assertView(s,'p0');
});
test('typed rejection: illegal phases, other-player moves, injected state and unknown actions', () => {
  const s=started(), other=s.players.find(p=>p!==s.active);
  assert.throws(()=>reduce(s,other,{type:'draw',source:'deck'}),{code:'TURN'});
  assert.throws(()=>reduce(s,s.active,{type:'replace',slots:[0]}),{code:'PHASE'});
  assert.throws(()=>reduce(s,s.active,{type:'draw',source:'deck',state:{}}),{code:'ACTION_FIELDS'});
  assert.throws(()=>reduce(s,s.active,{type:'__proto__'}),RuleError);
});
test('only deck draws exist; every power rank exchanged into the hand stays hidden without power', () => {
  const initial=started(),copy=structuredClone(initial);
  assert.throws(()=>reduce(initial,initial.active,{type:'draw',source:'discard'}),{code:'SOURCE'}); assert.deepEqual(initial,copy);
  for (const rank of ['7','8','9','10','J','Q']) {
    let s=drawRank(rank), actor=s.active; assertView(s,actor); assertView(s,s.players.find(p=>p!==actor));
    assert.equal('source' in s.held,false); assert.equal('source' in viewFor(s,actor).held,false);
    s=reduce(s,actor,{type:'replace',slots:[0]}); assert.equal(s.hands[actor][0].faceUp,false); assert.equal(s.hands[actor][0].rank,rank); assert.equal(s.power,null); assert.notEqual(s.active,actor); assertState(s);
  }
});
test('matching score values collapse into first selected slot, keeping spatial memory', () => {
  let s=started(), actor=s.active; place(s,s.hands[actor],0,'8','hearts'); place(s,s.hands[actor],2,'8','clubs'); place(s,s.deck,s.deck.length-1,'3','spades');
  s=reduce(s,actor,{type:'draw',source:'deck'}); s=reduce(s,actor,{type:'replace',slots:[0,2]});
  assert.equal(s.hands[actor].filter(Boolean).length,3); assert.equal(s.hands[actor][2],null); assert.equal(s.hands[actor][0].value,3); assertState(s);
});
for (const count of [2,3,4]) test(`failed ${count}-card exchange exposes selection and adds correct penalties`,()=>{
  let s=started(), actor=s.active; hand(s,actor,[['2','hearts'],['3','hearts'],['4','hearts'],['5','hearts']]); place(s,s.deck,s.deck.length-1,'A','spades');
  s=reduce(s,actor,{type:'draw',source:'deck'}); s=reduce(s,actor,{type:'replace',slots:Array.from({length:count},(_,i)=>i)});
  assert.equal(s.hands[actor].filter(Boolean).length,count>=3?6:5); assert.equal(s.lastEvent.type,'mismatch'); assert.equal(s.hands[actor].slice(0,count).every(c=>c.faceUp),true); assert.equal(s.hands[actor].at(-1).faceUp,false); assertState(s);
});
for (const rank of [7,8,9,10]) test(`${rank}: private ${rank<=8?'own':'opponent'} peek, explicit hide`,()=>{
  let s=drawRank(rank), actor=s.active, other=s.players.find(p=>p!==actor); s=reduce(s,actor,{type:'discard'}); const owner=rank<=8?actor:other;
  assert.equal(s.phase,'power'); assert.equal(s.power,rank<=8?'peek':'spy');
  s=reduce(s,actor,{type:'power',slot:2}); assert.equal(s.phase,'reveal'); assert.equal(viewFor(s,actor).peek.value,s.hands[owner][2].value); assertView(s,actor); assertView(s,other);
  s=reduce(s,actor,{type:'ack'}); assert.equal(s.active,other); assert.equal(s.peek,null); assertState(s);
});
test('Jack discard automatically starts mandatory blind swap and does not reveal',()=>{
  let s=drawRank('J'), actor=s.active, other=s.players.find(p=>p!==actor); const [a,b]=[s.hands[actor][1].id,s.hands[other][2].id];
  for (const usePower of [true,false]) assert.throws(()=>reduce(s,actor,{type:'discard',usePower}),{code:'ACTION_FIELDS'});
  s=reduce(s,actor,{type:'discard'}); assert.equal(s.power,'blindSwap'); assert.throws(()=>reduce(s,actor,{type:'skip'}),{code:'MANDATORY_POWER'});
  assert.throws(()=>reduce(s,actor,{type:'swapDecision',swapDecision:false}),{code:'PHASE'}); assertView(s,actor); assertView(s,other);
  s=reduce(s,actor,{type:'power',ownSlot:1,otherSlot:2}); assert.equal(s.hands[actor][1].id,b); assert.equal(s.hands[other][2].id,a); assert.equal(s.peek,null); assert.equal(s.active,other); assertState(s);
});
test('Jack may skip only when no legal target pair exists',()=>{
  let s=drawRank('J'), actor=s.active, other=s.players.find(p=>p!==actor); s.discard.push(...s.hands[other]); s.hands[other]=[];
  s=reduce(s,actor,{type:'discard'}); s=reduce(s,actor,{type:'skip'}); assert.notEqual(s.active,actor); assertState(s);
});
for(const decision of [true,false]) test(`Queen privately looks at both cards then explicit swapDecision ${decision}`,()=>{
  let s=drawRank('Q'), actor=s.active, other=s.players.find(p=>p!==actor); const [a,b]=[s.hands[actor][1].id,s.hands[other][2].id];
  s=reduce(s,actor,{type:'discard'}); assert.equal(s.power,'lookSwap'); assert.throws(()=>reduce(s,actor,{type:'skip'}),{code:'MANDATORY_POWER'});
  s=reduce(s,actor,{type:'power',ownSlot:1,otherSlot:2}); assert.equal(s.phase,'reveal'); assert.equal(viewFor(s,actor).peek.cards.length,2); assert.equal(viewFor(s,other).peek,null);
  assertView(s,actor); assertView(s,other); assert.equal(s.hands[actor][1].id,a); assert.equal(s.hands[other][2].id,b);
  for(const action of [{type:'ack'},{type:'skip'},{type:'power',ownSlot:0,otherSlot:0},{type:'swapDecision'},{type:'swapDecision',swapDecision:'false'}]) assert.throws(()=>reduce(s,actor,action),RuleError);
  s=reduce(s,actor,{type:'swapDecision',swapDecision:decision}); assert.equal(s.hands[actor][1].id,decision?b:a); assert.equal(s.hands[other][2].id,decision?a:b); assert.equal(s.peek,null); assert.equal(s.active,other); assertState(s);
});
test('Queen cannot inspect more cards by retargeting or decide before looking',()=>{
  let s=drawRank('Q'), actor=s.active; s=reduce(s,actor,{type:'discard'}); assert.throws(()=>reduce(s,actor,{type:'swapDecision',swapDecision:true}),{code:'PHASE'});
  s=reduce(s,actor,{type:'power',ownSlot:0,otherSlot:0}); assert.throws(()=>reduce(s,actor,{type:'power',ownSlot:1,otherSlot:1}),{code:'PHASE'});
});
test('swaps preserve public face orientation, including the caller as a legal target',()=>{
  let s=started(), caller=s.active, other=s.players.find(p=>p!==caller); place(s,s.deck,s.deck.length-1,'J','spades'); s.hands[caller][0].faceUp=true;
  const id=s.hands[caller][0].id; s=reduce(s,caller,{type:'call'}); assert.deepEqual(s.finalRemaining,[other]); assert.throws(()=>reduce(s,other,{type:'call'}),{code:'CALLED'});
  s=reduce(s,other,{type:'draw',source:'deck'}); s=reduce(s,other,{type:'discard'}); s=reduce(s,other,{type:'power',ownSlot:0,otherSlot:0});
  assert.equal(s.phase,'roundEnd'); assert.equal(s.hands[other][0].id,id); assert.equal(s.hands[other][0].faceUp,true); assertState(s);
});
test('no powers for A–6 or Kings; face-up peeks reject; peek skip remains legal',()=>{
  for(const value of [-1,1,2,3,4,5,6,13]) assert.equal(powerFor(value),null);
  for(const suit of ['hearts','spades']) { let s=drawRank('K',suit),actor=s.active; s=reduce(s,actor,{type:'discard'}); assert.equal(s.power,null); assert.notEqual(s.active,actor); assertState(s); }
  let s=drawRank(7), actor=s.active; s.hands[actor][0].faceUp=true; s=reduce(s,actor,{type:'discard'}); assert.throws(()=>reduce(s,actor,{type:'power',slot:0}),{code:'FACE_UP'}); s=reduce(s,actor,{type:'skip'}); assert.equal(s.phase,'turn');
});
test('last deck draw and Queen decision resolve before deck exhaustion scoring',()=>{
  let s=started(); place(s,s.deck,s.deck.length-1,'Q','spades'); s.discard.push(...s.deck.splice(0,s.deck.length-1)); const actor=s.active;
  s=reduce(s,actor,{type:'draw',source:'deck'}); s=reduce(s,actor,{type:'discard'}); assert.equal(s.phase,'power'); s=reduce(s,actor,{type:'power',ownSlot:0,otherSlot:0});
  assert.equal(s.phase,'reveal'); s=reduce(s,actor,{type:'swapDecision',swapDecision:false}); assert.equal(s.phase,'roundEnd'); assert.equal(s.result.reason,'deck'); assertState(s);
});
test('call scoring remains: tied lowest zero, unsuccessful sum+10, others sum; no Kamikaze',()=>{
  const s=started(); s.caller='p0'; hand(s,'p0',[['A','hearts'],['2','hearts'],['3','hearts'],['4','hearts']]); hand(s,'p1',[['A','clubs'],['2','clubs'],['3','clubs'],['4','clubs']]);
  assert.deepEqual(scoreRound(s).points,{p0:0,p1:10}); place(s,s.hands.p0,0,'5','hearts'); assert.deepEqual(scoreRound(s).points,{p0:24,p1:10});
  hand(s,'p1',[['Q','hearts'],['Q','clubs'],['K','clubs'],['K','spades']]); assert.deepEqual(scoreRound(s).points,{p0:0,p1:50}); assert.equal('moon' in scoreRound(s),false);
});
function finishWithTenPoints(s) {
  const caller=s.active,other=s.players.find(p=>p!==caller); hand(s,caller,[['A','hearts'],['A','diamonds'],['K','hearts'],['K','diamonds']]); hand(s,other,[['A','clubs'],['2','clubs'],['3','clubs'],['4','clubs']]);
  place(s,s.deck,s.deck.length-1,'6','hearts');
  s=reduce(s,caller,{type:'call'}); s=reduce(s,other,{type:'draw',source:'deck'}); s=reduce(s,other,{type:'discard'}); return {s,caller,other};
}
test('classic exact-100 reset only once; >100 ends; both players consent before a new deal',()=>{
  let s=started(), other=s.players.find(p=>p!==s.active); s.scores[other]=90; ({s}=finishWithTenPoints(s)); assert.equal(s.scores[other],50); assert.equal(s.resets[other],true);
  s=reduce(s,'p0',{type:'nextRound'}); assert.equal(s.phase,'roundEnd'); s=reduce(s,'p1',{type:'nextRound'}); assert.equal(s.phase,'setup');
  s=started(); other=s.players.find(p=>p!==s.active); s.scores[other]=90; s.resets[other]=true; ({s}=finishWithTenPoints(s)); assert.equal(s.scores[other],100); assert.equal(s.phase,'roundEnd');
  s=started(); other=s.players.find(p=>p!==s.active); s.scores[other]=91; ({s}=finishWithTenPoints(s)); assert.equal(s.phase,'gameEnd');
});
test('Quick profile never resets 100, never ends early, ends at configured round count',()=>{
  for(const total of [90,102]) { let s=started(4,4),other=s.players.find(p=>p!==s.active); s.scores[other]=total; ({s}=finishWithTenPoints(s)); assert.equal(s.scores[other],total+10); assert.equal(s.phase,'roundEnd'); assert.equal(s.resets[other],false); }
  const {s}=finishWithTenPoints(started(4,1)); assert.equal(s.phase,'gameEnd');
});
test('malformed targets/actions reject as RuleError without mutating state',()=>{
  const s=drawRank(7),copy=structuredClone(s);
  for(const action of [null,[],{},{type:'constructor'},{type:'toString'},{type:'replace',slots:[NaN]},{type:'replace',slots:[-1]},{type:'replace',slots:[100]},{type:'replace',slots:[0,0]},{type:'discard',usePower:'yes'}]) assert.throws(()=>reduce(s,s.active,action),RuleError);
  assert.deepEqual(s,copy);
});
test('1,000 seeded bot-vs-bot Classic games terminate legally; every hidden view leak-checked',()=>{
  let actions=0,queenDecisions=0,jackSwaps=0,stacks=0;
  for(let seed=1;seed<=1000;seed++) {
    let s=createGame({seed}); const bots=Object.fromEntries(s.players.map((p,i)=>[p,createBot(seed+i)])); let steps=0;
    while(s.phase!=='gameEnd' && steps++<5000) {
      for(const p of s.players) { assertView(s,p); bots[p].observe(viewFor(s,p)); }
      const stacker=s.players.find(p=>bots[p].stackAction(viewFor(s,p)));
      if(s.pendingPower&&!stacker){s=advanceTime(s,s.pendingPower.deadline);assertState(s);actions++;continue;}
      const actor=stacker??(s.phase==='setup'?s.players.find(p=>!s.initial[p].ready):s.phase==='roundEnd'?s.players.find(p=>!s.roundReady.includes(p)):(['power','reveal'].includes(s.phase)?s.powerActor:s.active));
      const a=bots[actor].action(viewFor(s,actor)); assert.ok(a); if(a.type==='swapDecision')queenDecisions++; if(s.power==='blindSwap'&&a.type==='power')jackSwaps++;
      if(a.type==='stack')stacks++;
      s=rawReduce(s,actor,a); assertState(s); actions++;
    }
    assert.equal(s.phase,'gameEnd',`Seed ${seed} did not terminate`); s.players.forEach(p=>assertView(s,p));
  }
  assert.ok(queenDecisions>0); assert.ok(jackSwaps>0); assert.ok(stacks>0);
  console.log(JSON.stringify({games:1000,actions,queenDecisions,jackSwaps,stacks}));
});

function stackFixture(rank='5') {
  let s=started(),discarder=s.active,stacker=s.players.find(p=>p!==discarder);
  place(s,s.deck,s.deck.length-1,rank,'spades'); place(s,s.hands[stacker],0,rank,'hearts'); place(s,s.hands[stacker],1,'2','hearts'); place(s,s.hands[discarder],0,rank,'clubs');
  s=rawReduce(s,discarder,{type:'draw',source:'deck'},1000); s=rawReduce(s,discarder,{type:'discard'},1000);
  return {s,discarder,stacker};
}
test('stack success reveals same rank, creates a hole, preserves turn and 52 cards; hidden views leak nothing',()=>{
  let {s,discarder,stacker}=stackFixture(),turn=s.turn,active=s.active;
  assert.equal(viewFor(s,stacker).stackAllowed,true); assert.equal(viewFor(s,discarder).stackAllowed,false); assertView(s,stacker); assertView(s,discarder);
  const id=s.hands[stacker][0].id;s=rawReduce(s,stacker,{type:'stack',slot:0});
  assert.equal(s.hands[stacker][0],null); assert.equal(s.hands[stacker].filter(Boolean).length,3); assert.equal(s.discard.at(-1).id,id); assert.equal(s.discard.at(-1).faceUp,true);
  assert.equal(s.active,active);assert.equal(s.turn,turn);assert.equal(s.lastEvent.type,'stack'); assert.equal(viewFor(s,discarder).discard.rank,'5');
  assertState(s);assertView(s,stacker);assertView(s,discarder);
  assert.throws(()=>reduce(s,stacker,{type:'stack',slot:0}),{code:'STACK_WINDOW'});
});
test('wrong rank rejects the stack, adds one hidden deck card, preserves discard/turn/power state',()=>{
  for(const rank of ['5','Q']) {
    const {s,stacker}=stackFixture(rank),copy=structuredClone(s),before=s.deck.length;
    const n=rawReduce(s,stacker,{type:'stack',slot:1},1100);
    assert.deepEqual(s,copy);assert.equal(n.deck.length,before-1);assert.equal(n.hands[stacker].length,5);
    assert.equal(n.hands[stacker].at(-1).faceUp,false);assert.equal(n.hands[stacker][1].faceUp,false);
    for(const key of ['discard','power','pendingPower','active','turn','scores'])assert.deepEqual(n[key],s[key]);
    assert.equal(n.lastEvent.type,'stackRejected');assert.equal(n.lastEvent.penalty,1);assertState(n);n.players.forEach(p=>assertView(n,p));
  }
});
test('discarder cannot stack own match; occupied own slot required; no initial or empty-pile stack',()=>{
  let {s,discarder,stacker}=stackFixture();assert.throws(()=>reduce(s,discarder,{type:'stack',slot:0}),{code:'STACK_WINDOW'});
  assert.throws(()=>reduce(s,stacker,{type:'stack',slot:63}),{code:'TARGET'});
  assert.throws(()=>reduce(started(),stacker,{type:'stack',slot:0}),{code:'STACK_WINDOW'});
  s.deck.push(...s.discard);s.discard=[];s.stackOpen=false;assert.throws(()=>reduce(s,stacker,{type:'stack',slot:0}),{code:'STACK_WINDOW'});assertState(s);
});
test('drawn power starts only after the injected 2500ms deadline; late stack has no penalty',()=>{
  for(const rank of ['7','8','9','10','J','Q']) {
    const {s,discarder,stacker}=stackFixture(rank);
    assert.equal(s.phase,'stacking');assert.equal(s.power,null);assert.equal(s.pendingPower.deadline,1000+STACK_WINDOW_MS);
    assert.equal(viewFor(s,stacker,1000).stackAllowed,true);assert.equal(advanceTime(s,3499),s);
    assert.throws(()=>rawReduce(s,stacker,{type:'stack',slot:1},3500),{code:'STACK_WINDOW'});
    const n=advanceTime(s,3500);assert.equal(n.phase,'power');assert.equal(n.powerActor,discarder);assert.equal(n.power,powerFor(s.discard.at(-1).value));
    assert.equal(n.deck.length,s.deck.length);assert.equal(n.hands[stacker].length,4);assert.equal(advanceTime(n,9999),n);
    assert.throws(()=>rawReduce(n,stacker,{type:'stack',slot:0},3600),{code:'STACK_WINDOW'});assertState(n);
  }
});
test('same-rank stack cancels discarder power; stacker acts with mandatory/privacy rules and original turn accounting',()=>{
  for(const rank of ['7','8','9','10','J','Q']) {
    let {s,discarder,stacker}=stackFixture(rank);const turn=s.turn;
    s=rawReduce(s,stacker,{type:'stack',slot:0},1100);
    assert.equal(s.pendingPower,null);assert.equal(s.powerActor,stacker);assert.equal(s.active,discarder);assert.equal(s.turn,turn);
    assert.equal(s.lastEvent.cancelledActor,discarder);assert.equal(s.hands[stacker][0],null);
    assert.throws(()=>rawReduce(s,discarder,{type:'power',slot:2}),{code:'TURN'});
    assert.throws(()=>rawReduce(s,stacker,{type:'stack',slot:1}),{code:'STACK_WINDOW'});
    if(rank==='J') {
      assert.throws(()=>rawReduce(s,stacker,{type:'skip'}),{code:'MANDATORY_POWER'});
      s=rawReduce(s,stacker,{type:'power',ownSlot:2,otherSlot:2});assert.equal(s.peek,null);
    } else {
      if(rank==='Q')assert.throws(()=>rawReduce(s,stacker,{type:'skip'}),{code:'MANDATORY_POWER'});
      s=rawReduce(s,stacker,rank==='Q'?{type:'power',ownSlot:2,otherSlot:2}:{type:'power',slot:2});
      assert.equal(viewFor(s,discarder).peek,null);assert.equal(viewFor(s,stacker).peek.cards.length,rank==='Q'?2:1);
      s.players.forEach(p=>assertView(s,p));
      s=rawReduce(s,stacker,rank==='Q'?{type:'swapDecision',swapDecision:false}:{type:'ack'});
    }
    assert.equal(s.active,stacker);assert.equal(s.turn,turn+1);assert.equal(s.power,null);assert.equal(s.stackOpen,false);assertState(s);
  }
});
test('stacker own repeated attempt is ineligible with no penalty; non-power alternating chains retain holes',()=>{
  let {s,discarder,stacker}=stackFixture('5');const active=s.active,turn=s.turn;
  s=rawReduce(s,stacker,{type:'stack',slot:0});const copy=structuredClone(s);
  assert.throws(()=>rawReduce(s,stacker,{type:'stack',slot:1}),{code:'STACK_WINDOW'});assert.deepEqual(s,copy);
  s=rawReduce(s,discarder,{type:'stack',slot:0});assert.equal(s.active,active);assert.equal(s.turn,turn);assertState(s);
});
test('wrong-stack penalty with empty deck follows existing exhaustion: pending power resolves first, no reshuffle',()=>{
  let {s,discarder,stacker}=stackFixture('Q');s.discard.splice(s.discard.length-1,0,...s.deck.splice(0));
  s=rawReduce(s,stacker,{type:'stack',slot:1},1100);assert.equal(s.lastEvent.penalty,0);assert.equal(s.phase,'stacking');assert.equal(s.hands[stacker].length,4);
  s=advanceTime(s,3500);s=rawReduce(s,discarder,{type:'power',ownSlot:2,otherSlot:2});s=rawReduce(s,discarder,{type:'swapDecision',swapDecision:false});
  assert.equal(s.phase,'roundEnd');assert.equal(s.result.reason,'deck');assertState(s);
  ({s,stacker}=stackFixture('5'));s.discard.splice(s.discard.length-1,0,...s.deck.splice(0));s=rawReduce(s,stacker,{type:'stack',slot:1});assert.equal(s.phase,'roundEnd');assert.equal(s.result.reason,'deck');assertState(s);
});
test('rank not score matching allows red King onto black King; exchange retains score-value semantics',()=>{
  let {s,discarder,stacker}=stackFixture('K');assert.equal(s.discard.at(-1).value,13);assert.equal(s.hands[stacker][0].value,-1);
  s=reduce(s,stacker,{type:'stack',slot:0});assert.equal(s.discard.at(-1).value,-1);assertState(s);
  s=started();const actor=s.active;place(s,s.hands[actor],0,'K','hearts');place(s,s.hands[actor],1,'K','spades');place(s,s.deck,s.deck.length-1,'3','hearts');s=reduce(s,actor,{type:'draw',source:'deck'});s=reduce(s,actor,{type:'replace',slots:[0,1]});assert.equal(s.lastEvent.type,'mismatch');assertState(s);
});
test('next active draw closes stack window; replacement opens a fresh one; server order wins',()=>{
  let {s,stacker}=stackFixture();s=reduce(s,stacker,{type:'draw',source:'deck'});assert.equal(s.stackOpen,false);assert.equal(viewFor(s,stacker).stackAllowed,false);assert.throws(()=>reduce(s,stacker,{type:'stack',slot:0}),{code:'STACK_WINDOW'});
  s=reduce(s,stacker,{type:'replace',slots:[1]});const other=s.players.find(p=>p!==stacker);assert.equal(s.discardActor,stacker);assert.equal(viewFor(s,other).stackAllowed,true);assertState(s);
});
test('stacking never alters final-turn accounting or scoring/end conditions',()=>{
  let {s,discarder,stacker}=stackFixture();s=reduce(s,stacker,{type:'stack',slot:0});s=reduce(s,stacker,{type:'call'});
  assert.equal(s.active,discarder);assert.deepEqual(s.finalRemaining,[discarder]);place(s,s.deck,s.deck.length-1,'6','diamonds');s=reduce(s,discarder,{type:'draw',source:'deck'});s=reduce(s,discarder,{type:'discard'});
  assert.equal(s.phase,'roundEnd');assert.equal(s.result.reason,'call');assert.equal(viewFor(s,stacker).stackAllowed,false);assert.throws(()=>reduce(s,stacker,{type:'stack',slot:1}),{code:'STACK_WINDOW'});assertState(s);
});
test('memory bot stacks only learned ranks, remembers exchanged draws, and never probes unknown cards',()=>{
  let {s,discarder,stacker}=stackFixture();const bot=createBot(9);
  assert.equal(createBot(9).stackAction(viewFor(s,stacker)),null,'Unknown hidden matching card is not guessed');
  const learned=viewFor(s,stacker);learned.hands[stacker][0]={...learned.hands[stacker][0],rank:'5',value:5};bot.observe(learned);
  assert.deepEqual(bot.stackAction(viewFor(s,stacker)),{type:'stack',slot:0});
  s=reduce(s,stacker,{type:'stack',slot:0});bot.observe(viewFor(s,stacker));assert.equal(bot.stackAction(viewFor(s,stacker)),null);
  let t=started();const actor=t.active,other=t.players.find(p=>p!==actor),remember=createBot(13);place(t,t.deck,t.deck.length-1,'4','hearts');place(t,t.hands[other],0,'4','clubs');
  t=reduce(t,actor,{type:'draw',source:'deck'});remember.observe(viewFor(t,actor));t=reduce(t,actor,{type:'replace',slots:[2]});remember.observe(viewFor(t,actor));
  t=reduce(t,other,{type:'draw',source:'deck'});t=reduce(t,other,{type:'replace',slots:[0]});remember.observe(viewFor(t,actor));assert.deepEqual(remember.stackAction(viewFor(t,actor)),{type:'stack',slot:2});assertState(t);
});
