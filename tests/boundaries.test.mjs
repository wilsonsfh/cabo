import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {startServer} from '../server.mjs';
import {WebSocket} from '../vendor/ws/wrapper.mjs';
import {makeDeck} from '../engine.mjs';
import {cardSVG,cardName} from '../client/cards.mjs';
const app=startServer({port:0});await once(app.server,'listening');const port=app.server.address().port,base=`http://127.0.0.1:${port}`;
after(()=>app.close());
const request=(path,headers={},method='GET')=>new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path,headers,method},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.end();});
async function peer(command){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`),messages=[];ws.on('message',d=>messages.push(JSON.parse(d)));await once(ws,'open');ws.send(JSON.stringify(command));await wait(()=>messages.find(m=>m.type==='session'));return {ws,messages};}
async function wait(fn){const end=Date.now()+2000;while(Date.now()<end){const result=fn();if(result)return result;await new Promise(r=>setTimeout(r,5));}throw new Error('Timed out');}
test('standard deck artwork: every visible face has mirrored rank indices and no undefined content',()=>{
  for(const c of makeDeck()){
    const svg=cardSVG(c,{prefix:'test'});assert.equal(svg.includes('undefined'),false);assert.equal(svg.includes('rotate(180 80 112)'),true);assert.equal(svg.includes(`<text x="17"`),true);assert.equal(svg.includes(`>${c.rank}</text>`),true);assert.equal(cardName(c),`${c.rank} of ${c.suit} · ${c.value} point${c.value===1?'':'s'}`);
  }
});
test('hidden artwork never renders a rank even if extra secret fields are accidentally passed',()=>{
  const svg=cardSVG({rank:'K',suit:'hearts',value:null},{prefix:'hidden'});assert.equal(svg.includes('>K</text>'),false);assert.equal(svg.includes('weave'),true);assert.equal(svg.includes('court'),false);
});
test('strict script CSP and zero-install static assets are served locally',async()=>{
  const r=await request('/');assert.equal(r.status,200);assert.match(r.headers['content-security-policy'],/script-src 'self';/);assert.equal(r.headers['x-content-type-options'],'nosniff');assert.equal(r.headers['referrer-policy'],'no-referrer');
  for(const file of ['/app.mjs','/cards.mjs','/engine.mjs','/style.css','/vendor/fonts/caveat-latin-500-normal.woff2'])assert.equal((await request(file)).status,200,file);
});
test('Host, method and private-file boundaries reject',async()=>{
  assert.equal((await request('/',{Host:'attacker.example'})).status,403);assert.equal((await request('/',{},'POST')).status,405);
  for(const file of ['/server.mjs','/tests/engine.test.mjs','/../server.mjs','/%2e%2e/server.mjs','/%2e%2e%2fserver.mjs','/vendor/ws/wrapper.mjs'])assert.notEqual((await request(file)).status,200,file);
});
test('cross-origin WebSocket upgrade rejects',async()=>{
  const status=await new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,{origin:'https://attacker.example'});ws.on('unexpected-response',(_,res)=>{resolve(res.statusCode);res.resume();ws.terminate();});ws.on('open',()=>{ws.close();reject(new Error('Cross-origin opened'));});ws.on('error',()=>{});});assert.equal(status,403);
});
test('chat is authenticated by room seat, bounded, rate-limited and does not advance the game revision',async()=>{
  const a=await peer({type:'create',name:'A',mode:'quick'}),code=a.messages.find(m=>m.type==='session').code,b=await peer({type:'join',name:'B',code});
  try{
    a.ws.send(JSON.stringify({type:'start'}));await wait(()=>a.messages.some(m=>m.view));const initial=a.messages.filter(m=>m.view).at(-1).view.version;
    a.ws.send(JSON.stringify({type:'chat',text:'<b>literal only</b>'}));const received=await wait(()=>b.messages.find(m=>m.room?.chat?.length===1));assert.equal(received.room.chat[0].text,'<b>literal only</b>');assert.equal(received.view.version,initial);
    a.ws.send(JSON.stringify({type:'chat',text:'too soon'}));await wait(()=>a.messages.some(m=>m.code==='RATE_LIMIT'));
    b.ws.send(JSON.stringify({type:'chat',text:'x'.repeat(281)}));await wait(()=>b.messages.some(m=>m.code==='CHAT'));
    assert.equal(app.rooms.get(code).chat.length,1);
  }finally{a.ws.terminate();b.ws.terminate();}
});
