import { startServer } from '../server.mjs';
import { assertState } from '../engine.mjs';
const app=startServer({port:5818});
function place(s,target,index,rank,suit){
  for(const list of [s.deck,s.discard,...Object.values(s.hands)]){
    const i=list.findIndex(c=>c?.rank===rank&&c.suit===suit);
    if(i>=0){[target[index],list[i]]=[list[i],target[index]];target[index].faceUp=false;return;}
  }
  throw new Error('Missing fixture card');
}
const rigged=new Set();
setInterval(()=>{for(const room of app.rooms.values()){
  const s=room.state;if(!s||s.phase!=='turn'||s.turn!==0||rigged.has(room.code))continue;
  s.active='p1';place(s,s.deck,s.deck.length-1,'Q','spades');place(s,s.hands.p0,0,'Q','hearts');place(s,s.hands.p0,1,'2','hearts');assertState(s);rigged.add(room.code);
}},10);
process.on('SIGTERM',async()=>{await app.close();process.exit(0);});
