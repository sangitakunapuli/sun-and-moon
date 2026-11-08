// Each chapter is a continuous world; shrines alternate the player who holds the bridge.
const chapters = [
 ['The First Light',2200,3,160,0],
 ['A Bridge Between Us',2800,4,185,1],
 ['The Constellation',3400,5,205,2],
 ['Bramble Observatory',4000,6,220,3],
 ['The Midnight Ascent',4600,7,240,4],
 ['Where Dawn Meets Dusk',5200,8,255,5]
];
const levels=chapters.map(([name,width,count,gap,difficulty],level)=>{
 const sections=[],platforms=[],hazards=[],stars=[];
 const spacing=(width-650)/count;
 for(let i=0;i<count;i++){
  const a=Math.round(330+i*spacing),b=a+gap;
  const raised=difficulty>0&&(i+level)%2===0;
  sections.push({a,b,role:(i+level)%2?'sun':'moon',...(raised?{anchorY:410}:{})});
  if(raised)platforms.push({x:b+5,y:410,w:65});
  // Brambles live on solid land, leaving room to land before the next shrine.
  if(difficulty>=2&&i<count-1)hazards.push({x:b+115,w:Math.min(48+difficulty*5,80)});
  stars.push([b+35,raised?345:410]);
 }
 return {name,width,sections,platforms,hazards,stars,plates:[width-245,width-155],
  hint:level===0?'Hold E at your shrine while your partner crosses and secures the far anchor with E. Trade roles, then stand on both exit switches.':'Alternate bridge powers, jump over brambles, and jump to raised anchors to secure them with E. Secured bridges are checkpoints. Meet on both exit switches.'};
});
function reset(r,index=0){r.completed=r.completed||levels.map(()=>false);r.bestStars=r.bestStars||levels.map(()=>0);r.level=index;r.bridges=levels[index].sections.map(()=>({active:false,locked:false}));r.gate=false;r.stars=levels[index].stars.map(()=>false);r.complete=false;r.won=false;r.players.forEach((p,i)=>Object.assign(p,{x:55+i*45,y:460,vx:0,vy:0,ground:true,checkpoint:55+i*45,input:{},jumpHeld:false}));}
function makePlayer(role){return {role,x:55,y:460,vx:0,vy:0,ground:true,checkpoint:55,input:{},connected:false};}
function near(p,x){return Math.abs(p.x-x)<32&&Math.abs(p.y-460)<12;}
function tick(r){if(r.complete||r.players.length!==2||!r.players.every(p=>p.connected))return;const l=levels[r.level];
 l.sections.forEach((s,i)=>{const bridge=r.bridges[i];const keeper=r.players.find(p=>p.role===s.role),runner=r.players.find(p=>p.role!==s.role);bridge.active=bridge.locked||!!(keeper.input.e&&near(keeper,s.a-40));if(bridge.active&&runner.input.e&&Math.abs(runner.x-(s.b+35))<28&&Math.abs(runner.y-((s.anchorY||490)-30))<14)bridge.locked=true;bridge.active=bridge.active||bridge.locked;});
 if(r.bridges.every(b=>b.locked)&&((near(r.players[0],l.plates[0])&&near(r.players[1],l.plates[1]))||(near(r.players[1],l.plates[0])&&near(r.players[0],l.plates[1]))))r.gate=true;
 for(const p of r.players){const k=p.input;p.vx=(Number(!!k.right)-Number(!!k.left))*3.8;if(k.jump&&p.ground&&!p.jumpHeld){p.vy=-10.8;p.ground=false;}p.jumpHeld=!!k.jump;
 let nx=Math.max(18,Math.min(l.width-30,p.x+p.vx));if(!r.gate&&nx>l.width-60)nx=Math.min(p.x,l.width-60);p.x=nx;const old=p.y;p.vy+=.48;p.y+=p.vy;p.ground=false;
 const floor=!l.sections.some((s,i)=>p.x>s.a&&p.x<s.b&&!r.bridges[i].active);
 const surfaces=[...(floor?[{x:0,w:l.width,y:490}]:[]),...l.platforms];for(const s of surfaces){const feet=s.y-30;if(p.x>=s.x-5&&p.x<=s.x+s.w+5&&old<=feet&&p.y>=feet&&p.vy>=0){p.y=feet;p.vy=0;p.ground=true;}}
 l.sections.forEach((s,i)=>{if(r.bridges[i].locked&&p.x>=s.b+15&&p.ground)p.checkpoint=Math.max(p.checkpoint,s.b+35);});
 if(p.y>650||l.hazards.some(h=>p.x>h.x-10&&p.x<h.x+h.w+10&&p.y>435)){p.x=p.checkpoint;p.y=460;p.vy=0;}
 l.stars.forEach((s,i)=>{if(Math.hypot(p.x-s[0],p.y-20-s[1])<35)r.stars[i]=true;});
 }if(r.gate&&r.players.every(p=>p.x>l.width-60)){r.complete=true;r.won=r.level===levels.length-1;r.completed[r.level]=true;r.bestStars[r.level]=Math.max(r.bestStars[r.level],r.stars.filter(Boolean).length);r.total=r.bestStars.reduce((a,b)=>a+b,0);}}
function selectLevel(r,index){if(!Number.isInteger(index)||index<0||index>=levels.length||!r.completed.slice(0,index).every(Boolean))return false;reset(r,index);return true;}
module.exports={levels,reset,makePlayer,tick,selectLevel};
