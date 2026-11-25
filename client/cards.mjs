import { rng, seedOf, wobble } from './environment.mjs';
const INK = '#202d37', RED = '#a53737', PAPER = '#f5eddb', BLUE = '#264e60', GOLD = '#b38a44', PLUM = '#65516d', MINT = '#c2d8c5';
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const SUITS = ['hearts','diamonds','clubs','spades'];
const POWER_MARKS = {'7':'PEEK OWN','8':'PEEK OWN','9':'PEEK OTHER','10':'PEEK OTHER',J:'BLIND SWAP',Q:'LOOK + SWAP'};
const suitPaths = {
  hearts: 'M0 9 C-3 6 -10 1 -10 -4 C-10 -11 -2 -12 0 -6 C3 -12 10 -10 10 -4 C10 1 3 6 0 9Z',
  diamonds: 'M0 -12 L9 0 0 12 -9 0Z',
  spades: 'M0 -12 C-4 -7 -11 -2 -10 3 C-9 9 -3 10 0 4 C0 8 -2 10 -4 12 L4 12 C2 10 0 8 0 4 C4 10 10 8 10 3 C11 -2 4 -8 0 -12Z',
  clubs: 'M0 -12 C-7 -12 -8 -4 -3 -2 C-9 -6 -14 0 -10 5 C-7 10 -2 7 0 4 C0 8 -2 10 -4 12 L4 12 C2 10 0 8 0 4 C3 9 9 9 11 4 C14 -2 7 -6 3 -2 C8 -5 7 -12 0 -12Z'
};
export const suitSymbol = suit => ({hearts:'♥',diamonds:'♦',clubs:'♣',spades:'♠'}[suit] || '');
export const cardName = card => !card || card.value === null ? 'Face down' : `${card.rank} of ${card.suit} · ${card.value} point${card.value === 1 ? '' : 's'}`;
function pip(suit,x,y,size=15,flip=false,color=null) {
  return `<path d="${suitPaths[suit]}" fill="${color || (['hearts','diamonds'].includes(suit)?RED:INK)}" transform="translate(${x} ${y}) rotate(${flip?180:0}) scale(${size/24})"/>`;
}
function seeded(seed) { let n=seed>>>0; return ()=>{ n=(Math.imul(n,1664525)+1013904223)>>>0; return n/4294967296; }; }
function wobbly(points,seed=12,amount=.5) {
  const rand=seeded(seed); return points.map(([x,y],i)=>`${i?'L':'M'}${(x+(rand()-.5)*amount).toFixed(2)} ${(y+(rand()-.5)*amount).toFixed(2)}`).join(' ');
}
function grain(seed) {
  // Static ink flecks in one path, not a live feTurbulence filter on every card.
  const r=rng(seed); let d='';
  for(let i=0;i<38;i++){const x=(8+r()*144).toFixed(2),y=(8+r()*208).toFixed(2);d+=`M${x} ${y}h.22`;}
  return `<path d="${d}" stroke="${INK}" stroke-width=".45" stroke-linecap="round" opacity=".075"/>`;
}
function handEdge() {
  const points=[[10,3],[150,3],[157,10],[157,214],[150,221],[10,221],[3,214],[3,10]];
  return `<path class="card-ink-edge" d="${wobble(points,rng(seedOf('lowkey-stock')),{closed:true,amp:.32,step:18})}" fill="none" stroke="${PLUM}" stroke-width=".65" opacity=".24"/>`;
}
function court(rank,suit,prefix) {
  const red=['hearts','diamonds'].includes(suit), coat=red?RED:BLUE;
  const crown=rank==='J'
    ? `<path d="M61 49 Q72 30 96 42 L100 51 62 55Z" fill="${coat}"/><path d="M68 40 Q70 27 84 29 L77 43" fill="${GOLD}"/><path d="M62 51 L101 48"/>`
    : `<path d="M61 48 L59 31 70 37 79 25 89 36 101 29 96 49Z" fill="${GOLD}"/><path d="M62 43 L97 43"/><circle cx="79" cy="35" r="2" fill="${coat}"/>`;
  const hair=rank==='Q'
    ? `<path d="M65 47 Q52 55 57 77 L67 91 78 84 91 89 99 73 95 48Z" fill="${GOLD}"/><path d="M59 58 Q54 69 63 80 M95 56 Q103 67 94 81"/>`
    : `<path d="M65 47 L94 47 96 61 90 76 65 71 60 57Z" fill="${INK}"/>`;
  const face=`<path d="M68 49 Q84 44 92 51 L92 61 97 65 91 67 89 77 Q78 82 69 72 L65 60Z" fill="${PAPER}"/><path d="M78 56 L87 55 M84 58 L87 58 M88 59 L87 66 91 67 M83 72 Q87 74 90 71 M70 57 Q65 54 67 63 L72 66" fill="none"/>`;
  const beard=rank==='K'?`<path d="M71 68 Q76 74 88 73 L87 86 80 91 73 83Z" fill="${GOLD}"/><path d="M75 74 L79 84 M80 76 L83 85 M75 69 Q81 66 87 70"/>`:'';
  const ornament=rank==='Q'
    ? `<path d="M105 106 L109 62"/><path d="M109 72 Q119 66 120 76 Q112 78 109 82" fill="${BLUE}"/><g fill="${coat}"><circle cx="110" cy="57" r="5"/><circle cx="104" cy="59" r="4"/><circle cx="115" cy="61" r="4"/><circle cx="109" cy="64" r="4"/></g><circle cx="110" cy="60" r="3" fill="${GOLD}"/>`
    : rank==='J'
      ? `<path d="M111 105 L110 38 115 30 118 38 114 105" fill="${PAPER}"/><path d="M105 87 L120 87 M113 39 L113 82"/><path d="M107 91 L117 91 116 105 108 105Z" fill="${GOLD}"/>`
      : `<path d="M110 103 L110 48" stroke-width="3"/><path d="M103 48 L110 39 117 48 110 56Z" fill="${GOLD}"/><circle cx="110" cy="48" r="2" fill="${coat}"/>`;
  const half=`<g stroke="${INK}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M39 112 L42 90 Q53 78 68 78 L83 83 94 77 117 88 122 112Z" fill="${coat}"/>
    <path d="M42 92 L61 84 86 112 67 112Z" fill="${GOLD}"/>
    <path d="M92 80 L103 85 88 112 77 112Z" fill="${PAPER}"/>
    <path d="M45 96 L62 89 M48 101 L66 94 M51 106 L70 99 M57 111 L75 104 M103 93 L115 100 M100 99 L117 108" fill="none" opacity=".7"/>
    ${hair}${face}${beard}${crown}
    <path d="M65 76 L70 88 79 82 85 90 95 77 90 91 65 91 59 80Z" fill="${PAPER}"/>
    <path d="M66 81 L68 88 M71 81 L73 87 M85 82 L86 87 M91 81 L89 88"/>
    ${ornament}<path d="M103 98 Q109 94 114 96 L116 101 109 106 103 103Z" fill="${PAPER}"/>
    ${pip(suit,51,77,17,false,coat)}
  </g>`;
  return `<defs><clipPath id="${prefix}-court"><rect x="36" y="25" width="88" height="174" rx="1"/></clipPath></defs><g clip-path="url(#${prefix}-court)"><rect x="36" y="25" width="88" height="174" fill="${PAPER}" stroke="${coat}" stroke-width="1.2"/>${half}<g transform="rotate(180 80 112)">${half}</g><path d="M37 112 Q79 109 123 112" fill="none" stroke="${INK}" stroke-width="1.1"/></g>`;
}
const patterns = {
  A:[[80,112,47]], 2:[[80,61],[80,163]], 3:[[80,55],[80,112],[80,169]],
  4:[[54,58],[106,58],[54,166],[106,166]],
  5:[[54,58],[106,58],[80,112],[54,166],[106,166]],
  6:[[54,55],[106,55],[54,112],[106,112],[54,169],[106,169]],
  7:[[54,55],[106,55],[80,82],[54,112],[106,112],[54,169],[106,169]],
  8:[[54,55],[106,55],[80,82],[54,112],[106,112],[80,142],[54,169],[106,169]],
  9:[[54,48],[106,48],[54,90],[106,90],[80,112],[54,134],[106,134],[54,176],[106,176]],
  10:[[54,48],[106,48],[80,68],[54,90],[106,90],[54,134],[106,134],[80,156],[54,176],[106,176]]
};
function back(prefix) {
  return `<defs><pattern id="${prefix}-weave" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 6 L6 0 12 6 6 12Z M0 0 L12 12 M12 0 L0 12" stroke="${PAPER}" stroke-width=".6" fill="none" opacity=".45"/></pattern></defs>
  <rect x="9" y="9" width="142" height="206" rx="7" fill="${BLUE}"/>
  <rect x="13" y="13" width="134" height="198" rx="5" fill="url(#${prefix}-weave)" stroke="${PAPER}" stroke-width=".8"/>
  <path d="M80 28 Q128 66 128 112 Q128 158 80 196 Q32 158 32 112 Q32 66 80 28Z" fill="${BLUE}" stroke="${PAPER}" stroke-width="1.8"/>
  <path d="M80 34 Q122 70 122 112 Q122 154 80 190 Q38 154 38 112 Q38 70 80 34Z" fill="none" stroke="${PAPER}" stroke-width=".7"/>
  <circle cx="80" cy="112" r="31" fill="${PLUM}"/>
  <g stroke="${PAPER}" fill="none" stroke-width="1.1">${Array.from({length:8},(_,i)=>`<path d="M80 73 Q102 94 80 112 Q58 94 80 73Z" transform="rotate(${i*45} 80 112)"/>`).join('')}<circle cx="80" cy="112" r="30"/><path d="M80 103L87 112 80 121 73 112Z" fill="${PAPER}"/></g>
  <g fill="${MINT}" stroke="${PAPER}" stroke-width=".7"><path d="M80 53 Q91 54 91 62 Q90 73 80 76 Q68 64 80 53Z"/><path d="M80 53 Q91 54 91 62 Q90 73 80 76 Q68 64 80 53Z" transform="rotate(180 80 112)"/></g>
  <path d="M78 74Q81 63 87 57 M82 150Q79 161 73 167" fill="none" stroke="${BLUE}" stroke-width="1.1"/>
  <g fill="${PAPER}"><path d="M26 19A5 5 0 1 0 26 29A6 6 0 0 1 26 19Z M138 19A5 5 0 1 0 138 29A6 6 0 0 1 138 19Z M22 195A5 5 0 1 0 22 205A6 6 0 0 1 22 195Z M134 195A5 5 0 1 0 134 205A6 6 0 0 1 134 195Z"/></g>`;
}
export function cardSVG(card=null,{prefix='card'}={}) {
  const visible=!!card && RANKS.includes(card.rank) && SUITS.includes(card.suit) && card.value!==null;
  const safe=String(prefix).replace(/[^a-zA-Z0-9_-]/g,'');
  const base=`<rect x="1.2" y="1.2" width="157.6" height="221.6" rx="10" fill="${PAPER}" stroke="${INK}" stroke-opacity=".32" stroke-width="1.2"/>`;
  let face;
  if (!visible) face=back(safe);
  else {
    const color=['hearts','diamonds'].includes(card.suit)?RED:INK;
    const index=`<g fill="${color}"><text x="17" y="28" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="24" letter-spacing="-1">${card.rank}</text>${pip(card.suit,17,41,18)}</g>`;
    const content=['J','Q','K'].includes(card.rank)?court(card.rank,card.suit,safe):patterns[card.rank].map(([x,y,size=26])=>pip(card.suit,x,y,size,y>112)).join('');
    const mark=POWER_MARKS[card.rank]||(card.rank==='K'&&color===RED?'−1 POINT':'');
    const footer=mark?`<text class="cabo-card-power" x="80" y="210" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,system-ui,sans-serif" font-size="10.5" font-weight="650" letter-spacing=".6" fill="${INK}">${mark}</text>`:'';
    face=`${index}<g transform="rotate(180 80 112)">${index}</g>${content}${footer}`;
  }
  return `<svg class="poker-svg" viewBox="0 0 160 224" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${base}${handEdge()}${grain(visible?RANKS.indexOf(card.rank)*13+SUITS.indexOf(card.suit):123)}${face}</svg>`;
}
export function tableSVG() {
  const ellipse=(rx,ry,seed)=>wobbly(Array.from({length:121},(_,i)=>{const a=i/120*Math.PI*2;return[400+Math.cos(a)*rx,295+Math.sin(a)*ry];}),seed,1.8);
  const hatch=Array.from({length:36},(_,i)=>{const x=48+i*20; return `<path d="M${x} 29 l-8 15 M${x} 545 l8 15"/>`;}).join('');
  return `<svg class="table-drawing" viewBox="0 0 800 590" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="${ellipse(380,272,18)}" fill="currentColor" opacity=".055"/><g fill="none" stroke="currentColor" stroke-width="1.2" opacity=".32"><path class="table-stroke" d="${ellipse(382,274,17)}"/><path d="${ellipse(370,263,27)}" stroke-width=".6"/>${hatch}</g><g fill="none" stroke="currentColor" opacity=".11"><path d="M354 280 L400 248 446 280 400 312Z M358 300 L400 268 442 300 400 332Z"/></g></svg>`;
}
export function heroSVG() {
  const cards=[null,{rank:'7',suit:'spades',value:7},{rank:'Q',suit:'hearts',value:12},{rank:'K',suit:'diamonds',value:-1}];
  return `<div class="hero-fan" aria-label="Hand-drawn playing cards: seven of spades, queen of hearts, red king worth minus one">${cards.map((card,i)=>`<div class="hero-playing-card fan-${i}">${cardSVG(card,{prefix:`hero-${i}`})}</div>`).join('')}</div><svg class="annotation-arrow" viewBox="0 0 190 90" aria-hidden="true"><path d="M174 76 C136 88 93 77 69 53 Q57 38 60 16 M47 32 L60 15 72 33" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}
