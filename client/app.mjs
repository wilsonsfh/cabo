import { LocalAdapter, SocketAdapter } from './transport.mjs';
import { PaperTable } from './scene.mjs';
import { cardSVG, cardName, heroSVG, tableSVG, suitSymbol } from './cards.mjs';
import { Sound } from './audio.mjs';
import { powerFor, POWER_LABELS } from '/engine.mjs';

const $=id=>document.getElementById(id), sound=new Sound();
const params=new URLSearchParams(location.search), preference=matchMedia('(prefers-reduced-motion: reduce)');
let userReduced=localStorage.getItem('callit-reduced')==='true';
let adapter=null,view=null,room=null,session=null,selected=[],multi=false,instant=false,toastTimer,lastChat='';
const reduceMotion=()=>userReduced||preference.matches;
const scene=new PaperTable({reduced:reduceMotion()});
$('hero-art').innerHTML=heroSVG(); $('table-art').innerHTML=tableSVG();
function announce(text){$('announcer').textContent=text;}
function toast(text,isError=false){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4000);announce(text);if(isError)sound.play('error');}
function name(id){return room?.names?.[id]||(id===view?.viewer?'You':'Friend');}
function nameInput(){return $('name').value.trim()||'You';}
function settings(){ $('sound').textContent=sound.enabled?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sound.enabled));$('motion').textContent=reduceMotion()?'Less motion on':'Less motion';$('motion').setAttribute('aria-pressed',String(reduceMotion()));document.body.classList.toggle('reduce-motion',reduceMotion());scene.setReduced(reduceMotion()); }
function updateRulesCopy(){
  const rules=$('rules-content');
  rules.querySelector('ol').innerHTML='<li><strong>Draw or call.</strong> Draw privately from the deck only. The discard pile is for discarding, never drawing. Calling uses your turn and gives your friend one final turn.</li><li><strong>Exchange or discard.</strong> Replace one of your cards, or several matching values. Discarding a drawn 7/8, 9/10, J or Q opens a 2.5-second stacking window; its power starts if no one stacks. Exchanging it into your hand never does.</li><li><strong>Keep it low.</strong> A = 1, numbers = their number, J = 11, Q = 12. Red K = −1; black K = 13.</li>';
  const paragraphs=rules.querySelectorAll(':scope > p');
  paragraphs[1].textContent='Jack: after the stacking window, the acting player must perform a mandatory blind swap of one own and one opponent card. Skip is available only when no legal pair exists.';
  paragraphs[2].textContent='Queen: after the stacking window, the acting player performs a private look at one own and one opponent card. Then explicitly swap that pair or keep both cards.';
  const details=rules.querySelector('details'),copy=details.querySelectorAll('p');
  copy[0].textContent='Replace several own cards only if their score values match. A failed match exposes them and adds the draw; selecting three or four adds another unseen deck penalty card if available. Deck replacements stay hidden. Holes preserve the remaining card positions.';
  copy[1].textContent='Caller lowest or tied: 0 points; otherwise their sum +10. Everyone else scores their sum. No Jokers or Kamikaze. Quick is exactly four rounds. Classic ends above 100; exactly 100 resets to 50 once. Deck exhaustion ends a round after the current action resolves.';
  const stack=document.createElement('p');stack.textContent='Stack: after the other player discards, tap one own card to attempt the same rank. A match is revealed on the pile and leaves a hole, without changing turns. Stacking a power cancels the discarder’s power and gives it to you. A wrong rank adds one hidden deck penalty card. Power discards offer 2.5 seconds to stack, then close; late/ineligible attempts have no penalty. No stacking during an active power or private reveal. Ordinary windows close on the next draw or discard; non-power alternating chains remain allowed. These window/chain choices are provisional.';details.before(stack);
}
updateRulesCopy();
$('sound').onclick=()=>{sound.toggle();sound.play('click');settings();};
$('motion').onclick=()=>{userReduced=!userReduced;localStorage.setItem('callit-reduced',String(userReduced));settings();};
preference.addEventListener('change',settings);settings();
document.addEventListener('pointerdown',()=>{instant=false;document.body.classList.remove('keyboard-action');sound.unlock();},{passive:true});
$('name').value=localStorage.getItem('callit-name')||'';
const guide=$('rules'), grip=$('rules-drag');
let guideOpener=null, drag=null;
function placeGuide(x,y){
  const rect=guide.getBoundingClientRect();
  guide.style.left=`${Math.max(8,Math.min(x,innerWidth-rect.width-8))}px`;
  guide.style.top=`${Math.max(8,Math.min(y,innerHeight-rect.height-8))}px`;
  guide.style.right='auto';
}
function openRules(){guideOpener=document.activeElement;if(!guide.open)guide.show();}
function closeRules(){const restore=guide.contains(document.activeElement);guide.close();if(restore)guideOpener?.focus();}
for(const tab of [$('rules-tab'),$('pip-tab')]){
  tab.onclick=()=>{for(const item of [$('rules-tab'),$('pip-tab')]){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;$(item.getAttribute('aria-controls')).hidden=!active;}guide.querySelector('.guide-body').scrollTop=0;};
  tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();const next=e.key==='Home'?$('rules-tab'):e.key==='End'?$('pip-tab'):tab===$('rules-tab')?$('pip-tab'):$('rules-tab');next.click();next.focus();}};
}
grip.onpointerdown=e=>{if(e.button!==0)return;const rect=guide.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX-rect.left,y:e.clientY-rect.top};grip.setPointerCapture(e.pointerId);};
grip.onpointermove=e=>{if(drag?.id===e.pointerId)placeGuide(e.clientX-drag.x,e.clientY-drag.y);};
grip.onpointerup=grip.onpointercancel=()=>{drag=null;};
grip.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(e.key==='Home'){guide.style.left='';guide.style.top='';guide.style.right='';return;}const rect=guide.getBoundingClientRect(),step=e.shiftKey?4:24;placeGuide(rect.left+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0),rect.top+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0));};
window.addEventListener('resize',()=>{if(guide.open){const rect=guide.getBoundingClientRect();placeGuide(rect.left,rect.top);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&guide.open){e.preventDefault();closeRules();}});
$('rules-open').onclick=openRules;$('rules-footer').onclick=openRules;$('rules-close').onclick=closeRules;$('rules-play').onclick=closeRules;
function goLobby(){
  if(adapter&&view&&!['gameEnd','roundEnd'].includes(view.phase)&&!confirm('Leave this table? Solo progress ends. Online seats can reconnect for 30 seconds.'))return;
  adapter?.close();scene.close();adapter=null;view=null;room=null;session=null;selected=[];multi=false;lastChat='';$('lobby').hidden=false;$('table-ui').hidden=true;window.scrollTo({top:0,behavior:'instant'});
}
$('home').onclick=goLobby;$('leave').onclick=goLobby;
function prepare(){adapter?.close();scene.close();view=null;room=null;session=null;selected=[];multi=false;lastChat='';localStorage.setItem('callit-name',nameInput());$('lobby-message').textContent='Opening your table…';}
function startSolo(seed=Date.now()){prepare();adapter=new LocalAdapter({name:nameInput(),mode:$('mode').value,seed,onState:receive,onError:text=>toast(text,true)});window.scrollTo({top:0,behavior:'instant'});}
$('solo').onclick=()=>startSolo();
function online(command){
  prepare();adapter=new SocketAdapter({command,onState:receive,onError:text=>{toast(text,true);$('lobby-message').textContent=text;},onConnection:text=>{$('lobby-message').textContent=text;if(room)$('waiting-status').textContent=text;},onSession:s=>{
    session=s;sessionStorage.setItem(`callit-seat-${s.code}`,JSON.stringify(s));const url=new URL(location);url.searchParams.set('room',s.code);history.replaceState(null,'',url);
  }});
}
$('create').onclick=()=>online({type:'create',name:nameInput(),mode:$('mode').value});
$('join').onclick=()=>{const code=$('room-code').value.trim().toUpperCase();if(!/^[A-F0-9]{6}$/.test(code))return toast('Enter the six-character room code.',true);const saved=sessionStorage.getItem(`callit-seat-${code}`);if(saved){const s=JSON.parse(saved);online({type:'resume',code,token:s.token});}else online({type:'join',code,name:nameInput()});};
$('room-code').addEventListener('keydown',e=>{if(e.key==='Enter')$('join').click();});$('room-code').value=params.get('room')||'';if(params.has('room'))$('join-details').open=true;
$('copy-invite').onclick=async()=>{const url=new URL(location);url.search=`?room=${room.code}`;try{await navigator.clipboard.writeText(url.href);toast('Invite copied. Send it to your friend.');}catch{toast(`Share code ${room.code} at ${location.origin}`);}};
$('start-match').onclick=()=>adapter.start();
$('chat-form').onsubmit=e=>{e.preventDefault();const text=$('chat-input').value.trim();if(!text||!adapter?.chat)return;adapter.chat(text);$('chat-input').value='';};
function updateChat(){
  $('chat').hidden=!!room.solo;
  if(room.solo)return;
  const messages=room.chat||[],key=JSON.stringify(messages);if(key===lastChat)return;lastChat=key;
  const nodes=messages.map(m=>{const p=document.createElement('p'),b=document.createElement('b');b.textContent=name(m.actor);p.append(b,document.createTextNode(m.text));return p;});
  $('chat-messages').replaceChildren(...nodes);$('chat-messages').scrollTop=$('chat-messages').scrollHeight;
  $('chat-note').textContent=room.connected.length===2?'Only this table · not encrypted':'Your friend is away';
}
function receive(message){
  const previous=view;view=message.view;room=message.room;$('lobby').hidden=true;$('table-ui').hidden=false;$('waiting').hidden=!!view;$('game-layout').hidden=!view;
  if(!view){$('invite-code').textContent=room.code;$('waiting-status').textContent=room.connected.length===2?`${name('p1')} is here. Ready when you are.`:'Waiting for your friend…';$('start-match').hidden=session?.playerId!=='p0';$('start-match').disabled=room.connected.length!==2;$('match-label').textContent=`PRIVATE TABLE · ${room.code}`;$('round-label').textContent='TWO PLAYERS';return;}
  if(previous?.version!==view.version){
    const ownSetupUnchanged=previous?.phase==='setup'&&view.phase==='setup'&&previous.round===view.round&&!view.setup.ready&&!view.setup.seen.length;
    if(!ownSetupUnchanged)selected=[];
    multi=false;const e=view.lastEvent;if(e.actor&&e.actor!==view.viewer)sound.play(e.type==='swap'?'swap':e.type==='call'?'call':e.type==='draw'?'draw':'click');if(view.phase==='reveal'&&view.active===view.viewer)sound.play('reveal');if(['roundEnd','gameEnd'].includes(view.phase))sound.play('win');
    if(e.type==='stack'&&e.actor===view.viewer)toast(e.ability?'You won the power. Choose your target.':'Stacked. One fewer card.');
    if(e.type==='stack'&&e.cancelledActor===view.viewer)toast('Your power was cancelled. The stacker uses it.');
  }
  render(previous);updateChat();
}
function eventText(e){
  if(!e)return'';const who=e.actor===view.viewer?'You':name(e.actor);
  return ({draw:`${who} drew a secret deck card.`,replace:`${who} exchanged ${e.matched===1?'one card':`${e.matched} matching cards`}.`,discard:`${who} discarded a card.`,stack:e.ability?`${who} won ${POWER_LABELS[e.ability]}. Original turn unchanged.`:`${who} stacked a matching rank. Turn unchanged.`,powerPending:`${who} discarded a power. Stack within 2.5 seconds.`,stackRejected:`${who} tried a wrong stack. ${e.penalty} hidden penalty card added.`,ability:`${who} discarded and started ${POWER_LABELS[e.ability]||'a power'}.`,peek:`${who} peeked at one own card.`,spy:`${who} peeked at an opponent card.`,look:`${who} looked at a pair privately.`,keep:`${who} kept the cards in place.`,swap:`${who} swapped a pair.`,call:`${who} called CABO. One final turn.`,mismatch:`${who} missed a match. ${e.penalty} penalty card${e.penalty===1?'':'s'} added.`,roundEnd:'Cards up. The lowest score wins.'})[e.type]||'';
}
function act(action,keyboard=false){if(!adapter||!view||room.status==='paused'||room.status==='forfeit')return;instant=keyboard;if(keyboard)document.body.classList.add('keyboard-action');sound.unlock();sound.play(action.type==='call'?'call':action.type==='draw'?'draw':'click');selected=[];adapter.action(action);}
function button(text,onClick,style='secondary',disabled=false){const b=document.createElement('button');b.textContent=text;b.className=style;b.disabled=disabled;b.onclick=onClick;b.dataset.focus=text;return b;}
function canPick(owner,slot){
  if(!view||['paused','forfeit'].includes(room.status))return false;
  if(view.phase==='setup')return owner===view.viewer&&!view.setup.ready&&!view.setup.seen.length;
  if(view.stackAllowed&&owner===view.viewer)return true;
  if((['power','reveal'].includes(view.phase)?view.powerActor:view.active)!==view.viewer)return false;
  if(view.phase==='drawn')return owner===view.viewer;
  if(view.phase==='power'){const card=view.hands[owner].find(c=>c.slot===slot);if(['blindSwap','lookSwap'].includes(view.power))return true;return !card.faceUp&&(view.power==='peek'?owner===view.viewer:owner!==view.viewer);}
  return false;
}
function pick(key,keyboard=false){
  if(key==='deck'){if(view?.phase==='turn'&&view.active===view.viewer)act({type:'draw',source:'deck'},keyboard);return;}
  const [kind,owner,index]=key.split(':'),slot=Number(index);if(kind!=='hand'||!canPick(owner,slot))return;const token=`${owner}:${slot}`;
  if(view.stackAllowed&&owner===view.viewer)return act({type:'stack',slot},keyboard);
  if(view.phase==='setup'){selected=selected.includes(token)?selected.filter(t=>t!==token):[...selected,token];if(selected.length===2)return act({type:'initialPeek',slots:selected.map(t=>Number(t.split(':')[1]))},keyboard);}
  else if(view.phase==='drawn'){if(!multi)return act({type:'replace',slots:[slot]},keyboard);selected=selected.includes(token)?selected.filter(t=>t!==token):selected.length<4?[...selected,token]:selected;}
  else if(view.phase==='power'){if(!['blindSwap','lookSwap'].includes(view.power))return act({type:'power',slot},keyboard);selected=[...selected.filter(t=>t.split(':')[0]!==owner),token];if(selected.length===2)return act({type:'power',ownSlot:Number(selected.find(t=>t.startsWith(view.viewer+':')).split(':')[1]),otherSlot:Number(selected.find(t=>!t.startsWith(view.viewer+':')).split(':')[1])},keyboard);}
  instant=keyboard;render(view);
}
function renderHand(owner,id){
  const cards=view.hands[owner],host=$(id),last=Math.max(3,...cards.map(c=>c.slot)),nodes=[];
  for(let slot=0;slot<=last;slot++){
    const card=cards.find(c=>c.slot===slot);if(!card){const gap=document.createElement('span');gap.className='empty-slot';gap.textContent='—';gap.setAttribute('aria-label',`Empty slot ${slot+1}`);nodes.push(gap);continue;}
    const key=`hand:${owner}:${slot}`,own=owner===view.viewer,b=button('',()=>pick(key));b.className=`card-slot${selected.includes(`${owner}:${slot}`)?' selected':''}${own&&view.stackAllowed?' stack-card':''}`;b.dataset.card=key;b.dataset.focus=key;b.dataset.face=card.rank?`${card.rank}-${card.suit}`:'hidden';b.disabled=!canPick(owner,slot);
    b.innerHTML=cardSVG(card,{prefix:key});const label=document.createElement('span');label.className=`slot-label${card.temporary?' private-label':''}`;label.textContent=`${own?'Y':'P'}${slot+1}${card.temporary?' · PEEK':card.faceUp?' · OPEN':''}`;b.append(label);
    b.setAttribute('aria-label',`${own&&view.stackAllowed?'Stack this card: ':''}${own?'Your':'Opponent'} card ${slot+1}, ${cardName(card)}${card.temporary?', private reveal':''}${selected.includes(`${owner}:${slot}`)?', selected':''}`);b.setAttribute('aria-pressed',String(selected.includes(`${owner}:${slot}`)));nodes.push(b);
  }
  host.classList.toggle('has-extra',last>=4);host.replaceChildren(...nodes);
}
function renderPiles(){
  const mine=view.active===view.viewer&&view.phase==='turn'&&room.status==='playing';
  const pile=(key,card,label,disabled)=>{const b=button('',()=>pick(key),`pile ${key}`,disabled);b.dataset.card=key;b.dataset.focus=key;b.dataset.face=card?.rank?`${card.rank}-${card.suit}`:'hidden';b.innerHTML=cardSVG(card,{prefix:key});const small=document.createElement('span');small.className='pile-label';small.textContent=label;b.append(small);b.setAttribute('aria-label',key==='deck'?`Draw deck, ${view.deckCount} cards`:key==='held'?`Drawn card: ${cardName(card)}`:`Discard pile, discarding only: ${cardName(card)}`);return b;};
  const nodes=[pile('deck',null,`DECK · ${view.deckCount}`,!mine||!view.deckCount)];
  if(view.discard)nodes.push(pile('discard',view.discard,`DISCARD · ${view.discard.value}`,true));
  if(view.held)nodes.push(pile('held',view.held,view.active===view.viewer?'YOUR DRAW':'THEIR DRAW',true));
  $('piles').replaceChildren(...nodes);
}
function render(previous){
  const focus=document.activeElement?.dataset.focus;scene.capture();const self=view.viewer,other=view.players.find(p=>p!==self),mine=(['power','reveal'].includes(view.phase)?view.powerActor:view.active)===self,actions=[];
  $('self-name').textContent=name(self);$('opponent-name').textContent=name(other);$('self-score').textContent=`${view.scores[self]} total`;$('opponent-score').textContent=`${view.scores[other]} total`;$('opponent-status').textContent=room.solo?'MEMORY BOT':room.connected.includes(other)?'CONNECTED':'RECONNECTING';
  $('self-name').closest('.seat').querySelector('.avatar').textContent=name(self).slice(0,1);$('opponent-name').closest('.seat').querySelector('.avatar').textContent=name(other).slice(0,1);
  $('match-label').textContent=room.solo?'SOLO · PIP REMEMBERS, NOT CHEATS':`PRIVATE TABLE · ${room.code}`;$('round-label').textContent=view.maxRounds?`ROUND ${view.round} / ${view.maxRounds}`:`ROUND ${view.round} · TO 100`;
  const add=(text,a,style='secondary',disabled=false)=>actions.push(button(text,()=>act(a),style,disabled));
  let tag=mine?'YOUR TURN':`${name(other).toUpperCase()}'S TURN`,title='',hint='';
  const ended=['roundEnd','gameEnd'].includes(view.phase);$('results').hidden=!ended&&room.status!=='forfeit';
  if(room.status==='paused'){tag='TABLE PAUSED';title='Hold that thought.';hint='Your friend has 30 seconds to reconnect. No moves until then.';}
  else if(view.phase==='setup'){
    tag='YOUR FIRST LOOK';
    if(view.setup.ready){title='Secrets tucked away.';hint='Waiting for the other player to hide their cards.';}
    else if(view.setup.seen.length){title='Remember these two.';hint='Only you can see them. Hide them when you’re ready.';add('Hide cards · ready →',{type:'ready'},'primary');}
    else{title=selected.length?'One more secret.':'Meet two of yours.';hint='Tap any two cards in your hand. You get one look.';}
  }else if(ended){tag='CARDS UP';title='Every point counts.';hint='All cards are now visible.';showResults();}
  else if(view.phase==='stacking'){tag='POWER PENDING';title='A chance to stack.';hint='Power begins after the 2.5-second window, unless the other player stacks.';}
  else if(!mine){title=view.caller?'Their final turn.':'A little suspense.';hint=view.phase==='power'?`${name(other)} is choosing a target.`:view.phase==='reveal'?`${name(other)} is looking privately.`:view.phase==='drawn'?'They have a card. Watch what they keep.':'Your turn is next.';}
  else if(view.phase==='turn'){title=view.caller?'Your final turn.':'Make your move.';hint=view.caller?'They called CABO. One last chance to lower your score.':'Draw from the deck only. Or call CABO if your score is lowest.';add('Draw a card',{type:'draw',source:'deck'},'primary',!view.deckCount);if(!view.caller)add('Call CABO',{type:'call'},'call');}
  else if(view.phase==='drawn'){
    const power=powerFor(view.held.value);title=`${view.held.rank}${suitSymbol(view.held.suit)}. Keep it?`;hint=multi?`Choose matching own cards. ${selected.length} selected.`:power?'Tap your card to exchange. Discard opens a 2.5-second stacking window; its power starts if no one stacks.':'Tap your card to exchange. Or discard the draw.';
    add(power?`Discard: ${POWER_LABELS[power]}`:'Discard draw',{type:'discard'},multi?'secondary':'primary');
    actions.push(button(multi?'One-card exchange':'Match several',()=>{multi=!multi;selected=[];render(view);},'plain'));
    if(multi)add(`Exchange ${selected.length}`,{type:'replace',slots:selected.map(t=>Number(t.split(':')[1]))},'primary',selected.length<2);
  }else if(view.phase==='power'){
    title=POWER_LABELS[view.power];const pair=['blindSwap','lookSwap'].includes(view.power);
    hint=pair?(selected.length?'Now choose a card from the other hand.':view.power==='blindSwap'?'Choose one of yours and one of theirs. This swap is mandatory, without looking.':'Choose one of yours and one of theirs. Look first, then decide.'):view.power==='peek'?'Choose one of your hidden cards.':'Choose one of their hidden cards.';
    if(!pair||!view.hands[self].length||!view.hands[other].length)add(pair?'No targets · end turn':'Skip ability',{type:'skip'});
  }else if(view.phase==='reveal'){
    if(view.power==='lookSwap'){const [a,b]=view.peek.cards;title='Your call. Swap?';hint=`Yours: ${a.rank}${suitSymbol(a.suit)} (${a.value}). Theirs: ${b.rank}${suitSymbol(b.suit)} (${b.value}). Only you see this pair.`;add('Swap these cards',{type:'swapDecision',swapDecision:true},'primary');add('Keep them',{type:'swapDecision',swapDecision:false});}
    else{title='A secret, just for you.';hint=`${view.peek.rank}${suitSymbol(view.peek.suit)} · ${view.peek.value} points. Remember its place.`;add('Hide card →',{type:'ack'},'primary');}
  }
  const stackReady=view.stackAllowed&&room.status==='playing';
  $('turn-panel').classList.toggle('stack-ready',stackReady);
  if(stackReady){tag='STACK';title=`Match rank ${view.discard.rank}.`;hint=`Tap one own card to stack. Wrong rank adds one hidden deck card. ${view.pendingPower?'Stack to cancel their power and use it yourself.':mine?'Or draw to close this window.':'The turn stays with the other player.'}`;actions.push(button('Stack',()=>{document.querySelector('#self-hand button:not(:disabled)')?.focus();toast('Choose one own card to stack.');},'primary'));}
  if(room.status==='forfeit'){tag='MATCH ENDED';title='Your friend left.';hint='The reconnect deadline passed.';showResults(true);}
  $('turn-tag').textContent=tag;$('instruction').textContent=title;$('hint').textContent=hint;$('actions').replaceChildren(...actions);$('event-note').textContent=eventText(view.lastEvent);
  if(view.pendingPower){const countdown=document.createElement('span');countdown.id='power-countdown';countdown.dataset.deadline=String(view.pendingPower.deadline);countdown.textContent=` · Power pending: ${((Math.max(0,view.pendingPower.deadline-Date.now()))/1000).toFixed(1)}s`;countdown.setAttribute('role','timer');$('hint').append(countdown);}
  renderHand(other,'opponent-hand');renderHand(self,'self-hand');renderPiles();scene.update(view,previous,instant||reduceMotion());
  if(focus){const target=[...document.querySelectorAll('[data-focus]')].find(el=>el.dataset.focus===focus&&!el.disabled);target?.focus({preventScroll:true});}
  announce(`${tag}. ${title} ${hint}`);
}
function showResults(forfeit=false){
  $('results').hidden=false;const ended=forfeit||view.phase==='gameEnd',result=view.result;
  $('result-tag').textContent=forfeit?'RECONNECT DEADLINE PASSED':ended?'MATCH COMPLETE':`ROUND ${view.round} COMPLETE`;
  const winner=forfeit?room.forfeit.winner:ended?view.winners[0]:[...view.players].sort((a,b)=>result.points[a]-result.points[b])[0];
  $('result-title').textContent=winner===view.viewer?ended?'Low score. Big win.':'That’s lowkey good.':`${name(winner)} ${ended?'wins.':'takes the round.'}`;
  if(!forfeit&&ended&&view.winners.length>1)$('result-title').textContent='A shared victory.';
  $('result-subtitle').textContent=forfeit?room.forfeit.reason:result.caller?result.successfulCall?`${name(result.caller)} called it and scored zero.`:`${name(result.caller)} called too soon: sum +10.`:'The deck ran out. Lowest sum wins.';
  const rows=view.players.map(id=>{const row=document.createElement('div');row.className='score-row';const who=document.createElement('span');who.textContent=name(id);const points=document.createElement('b');points.textContent=forfeit?id===winner?'WIN':'OUT':String(result.points[id]);const total=document.createElement('small');total.textContent=`${view.scores[id]} total`;points.append(total);row.append(who,points);return row;});$('result-scores').replaceChildren(...rows);
  const waiting=ended?room.rematchReady?.includes(view.viewer):view.roundReady.includes(view.viewer);$('result-action').replaceChildren(button(waiting?'Waiting for your friend…':ended?'One more match ↗':'Next round →',()=>ended?adapter.rematch():act({type:'nextRound'}),'primary',waiting));
}
document.addEventListener('keydown',e=>{
  if(guide.contains(e.target)&&['Enter',' '].includes(e.key))return;
  if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.target.isContentEditable||e.metaKey||e.ctrlKey||e.altKey)return;
  instant=true;document.body.classList.add('keyboard-action');if(!view)return;const k=e.key.toLowerCase();
  if(/^Digit[1-9]$/.test(e.code)){e.preventDefault();pick(`hand:${e.shiftKey?view.players.find(p=>p!==view.viewer):view.viewer}:${Number(e.code.slice(-1))-1}`,true);}
  else if(room.status!=='paused'){
    const a=k==='enter'&&view.phase==='setup'&&view.setup.seen.length&&!view.setup.ready?{type:'ready'}:(['power','reveal'].includes(view.phase)?view.powerActor:view.active)!==view.viewer?null:k==='d'&&view.phase==='turn'?{type:'draw',source:'deck'}:k==='c'&&view.phase==='turn'&&!view.caller?{type:'call'}:k==='x'&&view.phase==='drawn'?{type:'discard'}:k==='enter'&&view.phase==='reveal'&&view.power!=='lookSwap'?{type:'ack'}:null;
    if(a){e.preventDefault();act(a,true);}
  }
});
if(params.get('test')==='1')window.__CALLIT__={startSolo,act:a=>act(a,true),pick:key=>pick(key,true),getView:()=>view,getRoom:()=>room,scene,setMode:mode=>{$('mode').value=mode;}};

// Display only: authoritative server/solo clock advances the game.
setInterval(()=>{const el=$('power-countdown');if(el)el.textContent=` · Power pending: ${(Math.max(0,Number(el.dataset.deadline)-Date.now())/1000).toFixed(1)}s`;},100);
