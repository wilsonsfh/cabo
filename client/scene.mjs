import { mountEnvironment } from './environment.mjs';

export class PaperTable {
  constructor({ reduced = false } = {}) {
    this.reduced = reduced; this.animations = new Set(); this.previous = new Map();
    this.environment = mountEnvironment(document.body, { reduced, theme: 'auto' });
    this.celebrated = null;
    if (new URLSearchParams(location.search).get('demo') === 'celebrate') {
      document.addEventListener('DOMContentLoaded', () => { this.mountCelebrationDemo().catch(error => console.error('Celebration replay:', error)); }, { once: true });
    }
  }
  capture() {
    this.previous = new Map([...document.querySelectorAll('[data-card]')].map(el => [el.dataset.card,{rect:el.getBoundingClientRect(),face:el.dataset.face}]));
    this.animations.forEach(a => a.cancel()); this.animations.clear();
  }
  update(view, previousView, instant = false) {
    // Mood is independent of card motion: instant updates/reduced motion still show the correct static world.
    this.environment.setMood(['roundEnd','gameEnd'].includes(view.phase) ? 'clear' : view.caller || view.lastEvent?.type === 'call' ? 'tense' : view.phase === 'setup' ? 'calm' : 'rain');
    const finishKey = `${view.round}:${view.version}:${(view.winners || []).join(',')}`;
    if (view.phase === 'gameEnd' && view.winners?.length && this.celebrated !== finishKey) {
      this.celebrated = finishKey; this.environment.celebrate({ seed: view.round * 2252 + view.version });
    }
    if (instant || this.reduced || previousView?.version === view.version) return;
    const event = view.lastEvent || {};
    for (const el of document.querySelectorAll('[data-card]')) {
      const key=el.dataset.card, to=el.getBoundingClientRect(); let from=this.previous.get(key), frames=null;
      if(event.type==='swap') {
        const pair=(event.targets || []).map(t=>`hand:${t.owner}:${t.slot}`), index=pair.indexOf(key);
        if(index>=0) from=this.previous.get(pair[1-index]);
      }
      if(key==='held' && !this.previous.has('held')) from=this.previous.get(view.held?.source || 'deck');
      if(event.type==='replace' && event.targets?.[0] && key===`hand:${event.targets[0].owner}:${event.targets[0].slot}`) from=this.previous.get('held');
      if(from && (Math.abs(from.rect.x-to.x)>2 || Math.abs(from.rect.y-to.y)>2)) {
        frames=[{transform:`translate(${from.rect.x-to.x}px,${from.rect.y-to.y}px) rotate(-3deg)`,opacity:.82},{transform:'translate(0,0) rotate(0)',opacity:1}];
      } else if(key==='discard' && from?.face!==el.dataset.face) {
        // The pile is a visible raised output target, not a draw interaction.
        frames=[{transform:'translateY(-5px) rotate(1.5deg)',opacity:.88},{transform:'translateY(-2px) rotate(0)',opacity:1}];
      } else if(from && from.face!==el.dataset.face) frames=[{transform:'perspective(600px) rotateY(-28deg) scale(.98)',opacity:.7},{transform:'perspective(600px) rotateY(0) scale(1)',opacity:1}];
      else if(!from && key.startsWith('hand:')) frames=[{transform:'translateY(12px) rotate(-2deg)',opacity:.4},{transform:'translateY(0) rotate(0)',opacity:1}];
      if(frames) {
        const animation=el.animate(frames,{duration:280,easing:'cubic-bezier(.23,1,.32,1)'}); this.animations.add(animation);
        animation.onfinish=()=>this.animations.delete(animation); animation.oncancel=()=>this.animations.delete(animation);
      }
    }
  }
  setReduced(value) { this.reduced=value; this.environment.setReduced(value); if(value) { this.animations.forEach(a=>a.finish()); this.animations.clear(); } }
  close() { this.animations.forEach(a=>a.cancel()); this.animations.clear(); this.previous.clear(); this.celebrated=null; this.environment.setMood('calm'); }
  async mountCelebrationDemo() {
    // URL-only promo replay. Produce a genuine seeded final view by reducing local bot actions,
    // then paint the existing result/table DOM; no app/controller hook or debug overlay is needed.
    const [{createGame,reduce,viewFor,createBot,advanceTime},{cardSVG,cardName}] = await Promise.all([import('/engine.mjs'),import('./cards.mjs')]);
    const params=new URLSearchParams(location.search),seed=Number(params.get('seed'))||2252;
    let state=createGame({seed,maxRounds:4});
    const bots=Object.fromEntries(state.players.map((id,i)=>[id,createBot({seed:seed+i+1})]));
    for(let step=0;step<1800&&state.phase!=='gameEnd';step++) {
      if(state.pendingPower)state=advanceTime(state,state.pendingPower.deadline);
      for(const id of state.players)bots[id].observe(viewFor(state,id));
      const actor=state.phase==='setup'?state.players.find(id=>!state.initial[id].ready):state.phase==='roundEnd'?state.players.find(id=>!state.roundReady.includes(id)):(['power','reveal'].includes(state.phase)?state.powerActor:state.active);
      const action=bots[actor].action(viewFor(state,actor));
      if(!action)throw new Error('No legal replay action');
      state=reduce(state,actor,action);
    }
    if(state.phase!=='gameEnd')throw new Error('Replay did not finish');
    const view=viewFor(state,'p0'),get=id=>document.getElementById(id),who=id=>id==='p0'?'You':'Pip';
    this.demoView=view;
    get('lobby').hidden=true;get('table-ui').hidden=false;get('waiting').hidden=true;get('game-layout').hidden=false;get('results').hidden=false;get('chat').hidden=true;
    document.querySelector('.keyboard-help').hidden=true;
    get('match-label').textContent='SOLO · PIP REMEMBERS, NOT CHEATS';get('round-label').textContent='MATCH COMPLETE';
    get('opponent-name').textContent='Pip · memory bot';get('opponent-status').textContent='MEMORY BOT';get('self-name').textContent='You';
    for(const [owner,host] of [['p0','self-hand'],['p1','opponent-hand']]) {
      get(host).replaceChildren(...view.hands[owner].map(card=>{const node=document.createElement('div');node.className='card-slot';node.dataset.card=`hand:${owner}:${card.slot}`;node.dataset.face=`${card.rank}-${card.suit}`;node.innerHTML=cardSVG(card,{prefix:`replay-${owner}-${card.slot}`});node.setAttribute('aria-label',cardName(card));const label=document.createElement('span');label.className='slot-label';label.textContent=`${owner==='p0'?'Y':'P'}${card.slot+1} · OPEN`;node.append(label);return node;}));
      get(owner==='p0'?'self-score':'opponent-score').textContent=`${view.scores[owner]} total`;
    }
    get('piles').replaceChildren(...[['deck',null,`DECK · ${view.deckCount}`],['discard',view.discard,`DISCARD · ${view.discard.value}`]].map(([key,card,label])=>{const node=document.createElement('div');node.className=`pile ${key}`;node.innerHTML=cardSVG(card,{prefix:`replay-${key}`});const caption=document.createElement('span');caption.className='pile-label';caption.textContent=label;node.append(caption);return node;}));
    get('result-tag').textContent='MATCH COMPLETE';get('result-title').textContent=view.winners.length>1?'An even match.':`${who(view.winners[0])} ${view.winners[0]==='p0'?'win':'wins'}.`;
    get('result-subtitle').textContent='Four rounds. One bold call. Well played.';
    get('result-scores').replaceChildren(...view.players.map(id=>{const row=document.createElement('div');row.className='score-row';const label=document.createElement('span');label.textContent=who(id);const value=document.createElement('b');value.textContent=String(view.result.points[id]);const total=document.createElement('small');total.textContent=`${view.scores[id]} total`;value.append(total);row.append(label,value);return row;}));
    const play=document.createElement('button');play.className='primary';play.textContent='One more match ↗';play.onclick=()=>{const url=new URL(location);url.searchParams.delete('demo');url.searchParams.delete('seed');location.assign(url.href);};get('result-action').replaceChildren(play);
    await document.fonts.ready;this.update(view,null,true);document.body.dataset.celebrationReady='true';
  }
}
