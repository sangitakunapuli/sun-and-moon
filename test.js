const assert=require('assert');const {reset,makePlayer,tick,levels,selectLevel}=require('./world');
function room(level=0){const r={players:[makePlayer('sun'),makePlayer('moon')]};reset(r,level);r.players.forEach(p=>p.connected=true);return r;}
function walk(r,p,x){let n=0;while(Math.abs(p.x-x)>4&&n++<2500){const direction=p.x<x?1:-1;const jump=levels[r.level].hazards.some(h=>direction>0?h.x-p.x<65&&h.x+h.w>p.x:h.x+h.w-p.x>-65&&h.x<p.x);p.input={right:direction>0,left:direction<0,jump:jump&&p.ground&&!p.jumpHeld};tick(r);}p.input={};assert(n<2500,'Path must be traversable');for(let j=0;j<45;j++)tick(r);}
for(let level=0;level<levels.length;level++){
 const r=room(level),l=levels[level];
 for(let i=0;i<l.sections.length;i++){
 const s=l.sections[i],keeper=r.players.find(p=>p.role===s.role),runner=r.players.find(p=>p.role!==s.role);
 walk(r,keeper,s.a-40);keeper.input={e:true};tick(r);assert(r.bridges[i].active,JSON.stringify({level,i,keeper}));assert(!r.bridges[i].locked);
 keeper.input={};tick(r);assert(!r.bridges[i].active,'Releasing power removes unsecured bridge');
 keeper.input={e:true};walk(r,runner,s.b+35);
 if(s.anchorY){runner.input={jump:true};tick(r);runner.input={e:true};for(let j=0;j<60;j++)tick(r);}else{runner.input={e:true};tick(r);}
 assert(r.bridges[i].locked,'Far anchor can be reached and secured');keeper.input={};runner.input={};tick(r);assert(r.bridges[i].active,'Secured bridge stays active');walk(r,keeper,s.b+35);
 }
 walk(r,r.players[0],l.plates[0]);assert(!r.gate,'One switch does not open exit');walk(r,r.players[1],l.plates[1]);tick(r);assert(r.gate,JSON.stringify({level,players:r.players,bridges:r.bridges}));r.players.forEach(p=>p.input={right:true});for(let n=0;n<80;n++)tick(r);assert(r.complete);assert(r.completed[level]);assert.equal(r.total,r.bestStars.reduce((a,b)=>a+b,0));assert.equal(r.won,level===levels.length-1);
}
const r=room();r.players[0].y=700;tick(r);assert.equal(r.players[0].y,460);r.players[1].connected=false;r.players[0].input={right:true};const x=r.players[0].x;tick(r);assert.equal(r.players[0].x,x);console.log('Passed: movement-driven solutions for all 6 scrolling levels, temporary bridges, elevated anchors, simultaneous switches, respawn, disconnect pause.');

const progression=room();assert(!selectLevel(progression,1));assert(!selectLevel(progression,2));assert(!selectLevel(progression,-1));assert(!selectLevel(progression,1.5));progression.completed[0]=true;assert(selectLevel(progression,1));assert(!selectLevel(progression,2));progression.completed[1]=true;assert(selectLevel(progression,2));assert(selectLevel(progression,0));assert(progression.completed[0]&&progression.completed[1]);assert(selectLevel(progression,2));assert.equal(progression.level,2);assert(progression.players.every(p=>p.x<150));assert(!progression.complete);console.log('Passed: sequential unlocks, locked level rejection, replay preserves progression and resets both players.');

for(let i=1;i<levels.length;i++){
 assert(levels[i].width>levels[i-1].width);
 assert(levels[i].sections.length>levels[i-1].sections.length);
}
const hazardRoom=room(5),traveler=hazardRoom.players[0];
traveler.checkpoint=120;traveler.x=levels[5].hazards[0].x+15;tick(hazardRoom);
assert.equal(traveler.x,120,'Brambles return the traveler to the secured checkpoint');
const all=room();for(let i=0;i<levels.length;i++){
 assert(selectLevel(all,i));if(i+1<levels.length)assert(!selectLevel(all,i+1));
 all.completed[i]=true;all.bestStars[i]=1;
}
assert(selectLevel(all,0));assert.equal(all.completed.length,6);assert(all.bestStars.every(n=>n===1));
console.log('Passed: increasing world lengths and teamwork, hazard checkpoints, all six chapter unlocks and replay.');
