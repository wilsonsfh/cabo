// Cabo's little waterside world. Original SVG; no assets, runtime filters or render loop.
// Seeded ink/wash/hatch approach adapted from the local Hub-v3 kit and Unfold sketch.
const NS = 'http://www.w3.org/2000/svg';
let sequence = 0;
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function seedOf(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  parent?.append(node); return node;
}
const rect = (x, y, w, h) => [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const ellipse = (x,y,rx,ry,n=30) => Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return [x+Math.cos(a)*rx,y+Math.sin(a)*ry];});
function object(parent,x,y,s,cls) {return el('g',{transform:`translate(${x} ${y}) scale(${s})`,class:`env-object ${cls}`,'data-x':x,'data-y':y,'data-scale':s},parent);}
export function wobble(points, r, { amp = 1.1, step = 16, closed = false } = {}) {
  const src=closed?[...points,points[0]]:points, out=[];
  for(let i=0;i<src.length-1;i++) {
    const [x,y]=src[i],[xx,yy]=src[i+1],d=Math.hypot(xx-x,yy-y)||1,n=Math.max(1,Math.round(d/step));
    for(let k=0;k<n;k++){const t=k/n,j=(r()-.5)*amp*2;out.push([x+(xx-x)*t-(yy-y)/d*j,y+(yy-y)*t+(xx-x)/d*j]);}
  }
  if(!closed)out.push(src.at(-1));
  if(out.length<2)return '';
  const f=v=>Math.round(v*10)/10;let d=`M${out[0].map(f).join(' ')}`;
  for(let i=1;i<out.length-1;i++)d+=`Q${out[i].map(f).join(' ')} ${f((out[i][0]+out[i+1][0])/2)} ${f((out[i][1]+out[i+1][1])/2)}`;
  return d+(closed?'Z':`L${out.at(-1).map(f).join(' ')}`);
}
function ink(g,points,r,{closed=false,amp=1.1,thin=false,double=false}={}) {
  const p=el('path',{d:wobble(points,r,{closed,amp}),class:`env-ink${thin?' env-thin':''}`},g);
  if(double)el('path',{d:wobble(points,r,{closed,amp:amp*1.3}),class:'env-ink env-ink-second'},g);
  return p;
}
function wash(g,points,r,color,opacity=.8) {
  // Two flat, slightly misregistered pigment shapes; intentionally no SVG filter.
  el('path',{d:wobble(points,r,{closed:true,amp:2}),fill:`var(--env-${color})`,opacity},g);
  el('path',{d:wobble(points.map(([x,y])=>[x+1.5,y-1]),r,{closed:true,amp:1.8}),fill:`var(--env-${color})`,opacity:opacity*.18},g);
}
function shape(g,points,r,color,options={}) {wash(g,points,r,color,options.opacity??.8);ink(g,points,r,{closed:true,...options});}
function hatch(svg,g,points,r,id,gap=9) {
  const defs=svg.querySelector('defs'), clip=el('clipPath',{id},defs);
  el('path',{d:wobble(points,r,{closed:true,amp:.3})},clip);
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const lines=[];
  for(let x=x0-(y1-y0);x<x1;x+=gap)lines.push(wobble([[x,y1],[x+(y1-y0)*.55,y0]],r,{amp:.4}));
  el('path',{d:lines.join(' '),class:'env-ink env-hatch','clip-path':`url(#${id})`},g);
}
function tree(svg,parent,r,x,y,s,id,{motion=true}={}) {
  const g=object(parent,x,y,s,'env-tree');
  wash(g,ellipse(0,4,54,13),r,'shadow',.22);
  const trunk=[[-9,2],[-5,-124],[4,-127],[12,3]];shape(g,trunk,r,'wood');
  ink(g,[[-1,-6],[-2,-108]],r,{thin:true});ink(g,[[0,-70],[-31,-108]],r);
  ink(g,[[2,-91],[31,-136]],r);hatch(svg,g,trunk,r,`${id}-bark`,7);
  const canopy=el('g',{class:motion?'env-canopy env-motion':'env-canopy'},g);
  const pts=[[-71,-126],[-79,-150],[-63,-174],[-38,-179],[-30,-207],[-1,-216],[26,-205],[39,-181],[68,-177],[82,-156],[76,-127],[50,-113],[22,-116],[-3,-108],[-30,-114],[-54,-111]];
  shape(canopy,pts,r,'leaf',{double:true});
  wash(canopy,ellipse(-28,-160,32,31),r,'mint',.24);
  ink(canopy,[[-56,-140],[-32,-146],[-18,-166]],r,{thin:true});
  ink(canopy,[[16,-179],[36,-153],[59,-148]],r,{thin:true});
}
function house(svg,parent,r,x,y,s,id) {
  const g=object(parent,x,y,s,'env-house');
  wash(g,[[0,7],[125,25],[179,4],[83,-20]],r,'shadow',.24);
  const side=[[90,-94],[132,-113],[132,-8],[90,12]];shape(g,side,r,'wood');hatch(svg,g,side,r,`${id}-wall`,10);
  shape(g,[[0,-91],[90,-91],[90,12],[0,0]],r,'house');
  shape(g,[[-14,-93],[44,-146],[106,-92]],r,'roof',{double:true});
  shape(g,[[44,-146],[83,-164],[144,-114],[106,-92]],r,'plum');
  ink(g,[[83,-164],[144,-114]],r,{double:true});
  shape(g,rect(75,-169,15,26),r,'wood');
  ink(g,[[14,-20],[40,-17]],r,{thin:true});
  shape(g,[[57,8],[57,-35],[77,-34],[77,11]],r,'plum');
  const window=el('g',{class:'env-window env-motion'},g);
  shape(window,rect(17,-70,29,32),r,'lamp');
  ink(window,[[31,-70],[31,-38]],r);ink(window,[[17,-54],[46,-54]],r);
  const cat=el('g',{class:'env-cat'},g);
  shape(cat,[[27,-133],[24,-146],[27,-157],[33,-151],[41,-155],[46,-146],[44,-132]],r,'plum');
  ink(cat,[[44,-133],[56,-131],[58,-139],[53,-143]],r);
  el('path',{d:'M30 -145h1 M39 -145h1',class:'env-cat-eyes'},cat);
}
function pond(parent,r,x,y,s) {
  const g=object(parent,x,y,s,'env-pond');
  shape(g,ellipse(0,0,158,63),r,'water',{opacity:.75,double:true});
  ink(g,ellipse(-5,4,143,51),r,{closed:true,thin:true});
  for(const [px,py,ps] of [[-86,-17,1],[60,24,.8],[99,-18,.65]]) {
    const pad=el('g',{transform:`translate(${px} ${py}) scale(${ps})`},g);
    shape(pad,[[1,0],[20,-4],[17,-11],[2,-17],[-17,-11],[-24,2],[-14,12],[4,15],[20,7]],r,'mint');
    ink(pad,[[0,0],[16,-7]],r,{thin:true});
    if(px<0){shape(pad,[[-4,-13],[-8,-22],[-1,-18],[4,-24],[9,-15],[1,-11]],r,'flower');}
  }
  const ripple=el('g',{class:'env-ripple env-motion'},g);
  ink(ripple,ellipse(4,19,29,8),r,{closed:true,thin:true});
  const duck=el('g',{class:'env-duck env-motion'},g);
  shape(duck,[[0,13],[-19,10],[-24,3],[-22,-3],[-7,-8],[3,-6],[6,-21],[13,-24],[21,-20],[22,-12],[16,-6],[21,2],[12,10]],r,'duck');
  shape(duck,[[21,-17],[32,-12],[21,-9]],r,'lamp');
  ink(duck,[[-13,0],[-5,5],[5,1]],r,{thin:true});
  el('circle',{cx:16,cy:-17,r:1.6,fill:'var(--env-ink)'},duck);
  ink(g,[[-114,35],[-94,36]],r,{thin:true});ink(g,[[83,6],[113,5]],r,{thin:true});
}
function grass(parent,r,x,y,count,spread) {
  let d='';
  for(let i=0;i<count;i++) {const px=x+(r()-.5)*spread,py=y+(r()-.5)*24;
    d+=wobble([[px-5,py-6],[px,py],[px+2,py-12]],r,{amp:.6});}
  el('path',{d,class:'env-ink env-grass'},parent);
}
function createScene(mobile,id) {
  const r=rng(seedOf(`lowkey-waterside-${mobile?'pocket':'wide'}`));
  const W=mobile?390:1440,H=mobile?1250:1000;
  const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,preserveAspectRatio:'none',class:`environment-drawing ${mobile?'env-pocket':'env-wide'}`,'aria-hidden':'true',focusable:'false'});
  const defs=el('defs',{},svg);
  const back=el('g',{class:'env-land'},svg);
  if(mobile) {
    wash(back,[[-20,1060],[50,1040],[131,1080],[245,1070],[410,1025],[410,1260],[-20,1260]],r,'ground',.72);
    // Pocket scene is simplified: one small tree, a pond and a little house, not a scaled desktop.
    tree(svg,back,r,5,925,.64,`${id}-t`,{motion:false});
    house(svg,back,r,307,1118,.56,id);
    pond(back,r,49,1192,.68);grass(back,r,285,1226,10,160);grass(back,r,5,1000,5,45);
    const sky=el('g',{class:'env-sky'},svg);
    shape(object(sky,347,760,1,'env-moon'),ellipse(0,0,16,16),r,'lamp',{opacity:.55});
  } else {
    wash(back,[[-30,857],[127,823],[269,869],[404,896],[670,926],[947,899],[1211,836],[1470,803],[1470,1040],[-30,1040]],r,'ground',.62);
    tree(svg,back,r,-30,645,1.15,`${id}-left`);
    tree(svg,back,r,1422,761,1.05,`${id}-right`);
    house(svg,back,r,1290,327,.92,id);
    pond(back,r,165,898,1.15);
    grass(back,r,98,731,13,180);grass(back,r,426,971,17,260);grass(back,r,1273,930,18,260);
    const rocks=el('g',{class:'env-extra'},back);
    shape(rocks,[[359,910],[363,897],[375,892],[390,898],[397,909]],r,'stone');
    shape(rocks,[[1214,856],[1220,842],[1239,838],[1253,854]],r,'stone');
    const sky=el('g',{class:'env-sky'},svg);
    shape(object(sky,1190,220,1,'env-moon'),ellipse(0,0,29,29),r,'lamp',{opacity:.56});
    const birds=el('g',{class:'env-birds env-motion'},sky);
    ink(birds,[[1129,189],[1137,183],[1146,190],[1153,184],[1161,188]],r,{thin:true});
    ink(birds,[[1184,218],[1192,211],[1200,217],[1207,213],[1214,216]],r,{thin:true});
  }
  const warmth=el('g',{class:'env-warmth'},svg);
  wash(warmth,mobile?[[-10,1065],[120,1100],[250,1070],[405,1045],[405,1260],[-10,1260]]:[[-20,862],[200,880],[660,932],[1030,898],[1460,805],[1460,1020],[-20,1020]],r,'lamp',.2);
  const sun=object(svg,mobile?342:1190,mobile?750:220,1,'env-sun');
  shape(sun,ellipse(0,0,mobile?16:30,mobile?16:30),r,'lamp');
  let rays='';for(let i=0;i<10;i++){const a=i*Math.PI/5,inner=mobile?23:40,outer=mobile?30:53;rays+=wobble([[Math.cos(a)*inner,Math.sin(a)*inner],[Math.cos(a)*outer,Math.sin(a)*outer]],r,{amp:.6});}
  el('path',{d:rays,class:'env-ink env-sun-rays'},sun);
  el('path',{d:'M-42 34l5 -8 3 9 9 2 -8 4 -1 9 -5 -7 -9 1 6 -6Z M-53 42a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M-34 55a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0',class:'env-still-splash'},sun);
  return svg;
}
function createRain(id) {
  // A single standalone SVG root is translated by CSS. Its pattern is rasterised into
  // one compositor surface rather than forcing the static landscape to repaint.
  const atmosphere=document.createElement('div');atmosphere.className='env-rain';
  const svg=el('svg',{class:'env-rain-sheet env-motion','aria-hidden':'true',focusable:'false',width:'100%',height:'100%'});atmosphere.append(svg);
  const defs=el('defs',{},svg),pattern=el('pattern',{id:`${id}-rain`,width:108,height:108,patternUnits:'userSpaceOnUse'},defs);
  el('path',{d:'M12 0l-8 19 M65 23l-7 17 M95 70l-8 19 M35 80l-7 17',class:'env-rain-ink'},pattern);
  el('rect',{width:'100%',height:'100%',fill:`url(#${id}-rain)`},svg);
  return atmosphere;
}
export function mountEnvironment(rootEl = document.body, { reduced = false, theme = 'auto' } = {}) {
  const root=document.createElement('div');root.className='table-environment';root.setAttribute('aria-hidden','true');
  const id=`lowkey-env-${++sequence}`;root.append(createScene(false,`${id}-wide`),createScene(true,`${id}-pocket`),createRain(id));rootEl.prepend(root);
  const motion=matchMedia('(prefers-reduced-motion: reduce)'), appearance=matchMedia('(prefers-color-scheme: dark)');
  let manualReduced=!!reduced, mode=theme, destroyed=false, settleTimer=null, burst=null;
  const fit=()=>{
    const bounds=root.getBoundingClientRect(),table=document.getElementById('table'),tb=table?.getClientRects().length?table.getBoundingClientRect():null;
    for(const svg of root.querySelectorAll('.environment-drawing')) {
      const mobile=svg.classList.contains('env-pocket'),W=mobile?390:1440,H=mobile?1250:1000,sx=bounds.width/W,sy=bounds.height/H;
      if(!sx||!sy)continue;
      for(const node of svg.querySelectorAll('.env-object')) {
        let x=Number(node.dataset.x),y=Number(node.dataset.y),s=Number(node.dataset.scale);
        if(mobile&&node.classList.contains('env-sun')&&tb){x=(tb.right-bounds.left+2)/sx;y=(tb.top-bounds.top+58)/sy;}
        if(!mobile&&bounds.width<=850&&node.classList.contains('env-sun')&&tb){x=(tb.right-bounds.left-18)/sx;y=(tb.top-bounds.top+55)/sy;}
        if(mobile&&node.classList.contains('env-pond'))y=(bounds.height-24)/sy;
        node.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s} ${(s*sx/sy).toFixed(4)})`);
      }
    }
  };
  const sizeObserver=new ResizeObserver(fit);sizeObserver.observe(root);fit();
  const effects=new Set();
  const stopEffects=()=>{effects.forEach(a=>a.cancel());effects.clear();clearTimeout(settleTimer);burst?.remove();burst=null;root.classList.remove('env-celebrating');};
  const syncMotion=()=>{const off=manualReduced||motion.matches;root.dataset.reduced=String(off);root.dataset.paused=String(off||document.hidden);if(off)stopEffects();else root.getAnimations({subtree:true}).forEach(a=>document.hidden?a.pause():a.play());};
  const syncTheme=()=>{root.dataset.theme=mode==='auto'?(appearance.matches?'dark':'light'):mode;};
  function setTheme(value='auto'){mode=['light','dark','auto'].includes(value)?value:'auto';syncTheme();}
  function setReduced(value){manualReduced=!!value;syncMotion();}
  function setMood(value='calm'){root.dataset.mood=['calm','rain','tense','clear'].includes(value)?value:'calm';fit();if(value!=='clear'){root.classList.remove('env-finished');stopEffects();}if(document.hidden)queueMicrotask(syncMotion);}
  function celebrate({seed=2252}={}) {
    stopEffects();setMood('clear');root.classList.add('env-finished');
    // Reduced motion has no particles or hopping: the permanent sun/wash and small ink mark remain.
    if(manualReduced||motion.matches)return;
    root.classList.add('env-celebrating');
    const r=rng(seedOf(`lowkey-win-${seed}`)),mobile=matchMedia('(max-width:600px)').matches;
    const W=mobile?390:1440,H=mobile?1250:1000,cx=mobile?195:927,cy=mobile?890:530;
    burst=el('svg',{class:'ink-celebration',viewBox:`0 0 ${W} ${H}`,preserveAspectRatio:'none','aria-hidden':'true',focusable:'false'});root.append(burst);
    for(let i=0;i<26;i++) {
      const angle=r()*Math.PI*2,reach=(mobile?100:260)+r()*(mobile?125:430),dx=Math.cos(angle)*reach,dy=Math.sin(angle)*reach;
      const particle=el('path',{d:i%3===0?'M-5 0Q-2 -6 4 -2L2 5Z':i%3===1?'M-3 -5L3 -3 2 6 -3 4Z':'M-5 0Q0 -6 5 0Q0 5 -5 0Z',fill:`var(--env-${['lamp','mint','flower','plum'][i%4]})`,stroke:'var(--env-ink)','stroke-width':.65},burst);
      const animation=particle.animate([{transform:`translate(${cx}px,${cy}px) rotate(0deg) scale(.2)`,opacity:0},{transform:`translate(${cx+dx*.48}px,${cy+dy*.6-35}px) rotate(${80+i*17}deg) scale(${mobile?1.2:1.8})`,opacity:.9,offset:.25},{transform:`translate(${cx+dx}px,${cy+dy+60}px) rotate(${190+i*29}deg) scale(1.2)`,opacity:0}],{duration:2600+r()*650,delay:i*14,easing:'cubic-bezier(.16,.7,.25,1)',fill:'both'});
      effects.add(animation);animation.onfinish=()=>effects.delete(animation);
    }
    const animate=(node,frames,options)=>{const a=node.animate(frames,options);effects.add(a);a.onfinish=()=>effects.delete(a);};
    root.querySelectorAll('.env-duck').forEach(node=>animate(node,[{transform:'translateY(0)'},{transform:'translateY(-12px) rotate(-5deg)'},{transform:'translateY(0)'},{transform:'translateY(-7px) rotate(4deg)'},{transform:'translateY(0)'}],{duration:1200,delay:200,easing:'ease-in-out'}));
    root.querySelectorAll('.env-cat').forEach(node=>animate(node,[{transform:'translateY(0) rotate(0)'},{transform:'translateY(-7px) rotate(-4deg)'},{transform:'translateY(0) rotate(0)'}],{duration:700,delay:300,iterations:2,easing:'ease-in-out'}));
    root.querySelectorAll('.env-birds').forEach(node=>animate(node,[{transform:'translate(0,0)'},{transform:'translate(-14px,-7px) rotate(-3deg)'},{transform:'translate(0,0)'}],{duration:1000,iterations:2,easing:'ease-in-out'}));
    settleTimer=setTimeout(()=>{stopEffects();root.dataset.settled='true';},4000);
    syncMotion();
  }
  document.addEventListener('visibilitychange',syncMotion);motion.addEventListener('change',syncMotion);appearance.addEventListener('change',syncTheme);
  setTheme(theme);setMood('calm');syncMotion();
  return {setTheme,setReduced,setMood,celebrate,destroy(){if(destroyed)return;destroyed=true;stopEffects();sizeObserver.disconnect();document.removeEventListener('visibilitychange',syncMotion);motion.removeEventListener('change',syncMotion);appearance.removeEventListener('change',syncTheme);root.remove();}};
}
