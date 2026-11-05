const levels = [
 {name:'The First Light',hint:'Moon holds E at the blue shrine so Sun can cross. Sun presses E at the far anchor to secure the bridge. Then trade places at the golden shrine.',sections:[{a:240,b:420,role:'moon'},{a:620,b:800,role:'sun'}],plates:[875,945],platforms:[],stars:[[475,420],[825,420]]},
 {name:'A Bridge Between Us',hint:'Alternate holding bridges and securing anchors. Jump between the stepping stones; meet on both exit switches.',sections:[{a:220,b:420,role:'sun'},{a:630,b:830,role:'moon',anchorY:410}],plates:[920,990],platforms:[{x:450,y:410,w:65},{x:535,y:345,w:65},{x:835,y:410,w:65}],stars:[[560,292],[850,420]]},
 {name:'The Constellation',hint:'Three crossings, alternating powers. Secure each anchor for your partner, then activate the two constellation switches together.',sections:[{a:175,b:345,role:'moon'},{a:470,b:640,role:'sun',anchorY:410},{a:755,b:915,role:'moon',anchorY:410}],plates:[980,1020],platforms:[{x:360,y:410,w:65},{x:655,y:410,w:40},{x:920,y:410,w:40}],stars:[[390,357],[687,357]]}
];
function reset(r,index=0){r.completed=r.completed||[false,false,false];r.bestStars=r.bestStars||[0,0,0];r.level=index;r.bridges=levels[index].sections.map(()=>({active:false,locked:false}));r.gate=false;r.stars=[false,false];r.complete=false;r.won=false;r.players.forEach((p,i)=>Object.assign(p,{x:55+i*45,y:460,vx:0,vy:0,ground:true,checkpoint:55+i*45,input:{},jumpHeld:false}));}
function makePlayer(role){return {role,x:55,y:460,vx:0,vy:0,ground:true,checkpoint:55,input:{},connected:false};}
function near(p,x){return Math.abs(p.x-x)<32&&Math.abs(p.y-460)<12;}
function tick(r){if(r.complete||r.players.length!==2||!r.players.every(p=>p.connected))return;const l=levels[r.level];
 l.sections.forEach((s,i)=>{const bridge=r.bridges[i];const keeper=r.players.find(p=>p.role===s.role),runner=r.players.find(p=>p.role!==s.role);bridge.active=bridge.locked||!!(keeper.input.e&&near(keeper,s.a-40));if(bridge.active&&runner.input.e&&Math.abs(runner.x-(s.b+35))<28&&Math.abs(runner.y-((s.anchorY||490)-30))<14)bridge.locked=true;bridge.active=bridge.active||bridge.locked;});
 if(r.bridges.every(b=>b.locked)&&((near(r.players[0],l.plates[0])&&near(r.players[1],l.plates[1]))||(near(r.players[1],l.plates[0])&&near(r.players[0],l.plates[1]))))r.gate=true;
 for(const p of r.players){const k=p.input;p.vx=(Number(!!k.right)-Number(!!k.left))*3.8;if(k.jump&&p.ground&&!p.jumpHeld){p.vy=-10.8;p.ground=false;}p.jumpHeld=!!k.jump;
 let nx=Math.max(18,Math.min(1060,p.x+p.vx));if(!r.gate&&nx>1040)nx=Math.min(p.x,1040);p.x=nx;const old=p.y;p.vy+=.48;p.y+=p.vy;p.ground=false;
 const floor=!l.sections.some((s,i)=>p.x>s.a&&p.x<s.b&&!r.bridges[i].active);
 const surfaces=[...(floor?[{x:0,w:1100,y:490}]:[]),...l.platforms];for(const s of surfaces){const feet=s.y-30;if(p.x>=s.x-5&&p.x<=s.x+s.w+5&&old<=feet&&p.y>=feet&&p.vy>=0){p.y=feet;p.vy=0;p.ground=true;}}
 l.sections.forEach((s,i)=>{if(r.bridges[i].locked&&p.x>=s.b+15&&p.ground)p.checkpoint=Math.max(p.checkpoint,s.b+35);});
 if(p.y>650){p.x=p.checkpoint;p.y=460;p.vy=0;}
 l.stars.forEach((s,i)=>{if(Math.hypot(p.x-s[0],p.y-20-s[1])<35)r.stars[i]=true;});
 }if(r.gate&&r.players.every(p=>p.x>1040)){r.complete=true;r.won=r.level===2;r.completed[r.level]=true;r.bestStars[r.level]=Math.max(r.bestStars[r.level],r.stars.filter(Boolean).length);r.total=r.bestStars.reduce((a,b)=>a+b,0);}}
function selectLevel(r,index){if(!Number.isInteger(index)||index<0||index>=levels.length||!r.completed.slice(0,index).every(Boolean))return false;reset(r,index);return true;}
module.exports={levels,reset,makePlayer,tick,selectLevel};
