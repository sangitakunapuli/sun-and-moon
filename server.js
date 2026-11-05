const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {levels,reset,makePlayer,tick,selectLevel}=require('./world');const rooms=new Map();
function view(r){return {code:r.code,level:r.level,scene:levels[r.level],players:r.players.map(({token,input,jumpHeld,...p})=>p),bridges:r.bridges,gate:r.gate,stars:r.stars,complete:r.complete,won:r.won,total:r.total,completed:r.completed,bestStars:r.bestStars,levels:levels.map(l=>l.name)};}
function publish(r){const data='data: '+JSON.stringify(view(r))+'\n\n';r.streams.forEach(s=>s.res.write(data));}
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://localhost');const json=(v,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(v));};
 if(u.pathname==='/api/config')return json({hosted:false});
 if(u.pathname==='/events'){const r=rooms.get(u.searchParams.get('room')),p=r&&r.players.find(p=>p.token===u.searchParams.get('token'));if(!p)return json({error:'Room session not found'},404);res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});const s={res,p};r.streams.add(s);p.connected=true;publish(r);req.on('close',()=>{r.streams.delete(s);p.connected=[...r.streams].some(s=>s.p===p);p.input={};publish(r);});return;}
 if(req.method==='POST'){let body='';for await(const chunk of req){body+=chunk;if(body.length>5000){res.destroy();return;}}let b;try{b=JSON.parse(body);}catch{return json({error:'Invalid request'},400);}
 if(u.pathname==='/api/create'){const code=crypto.randomBytes(3).toString('hex').toUpperCase();const r={code,players:[makePlayer(b.role==='moon'?'moon':'sun')],streams:new Set(),total:0};r.players[0].token=crypto.randomBytes(20).toString('hex');reset(r);rooms.set(code,r);return json({code,token:r.players[0].token,role:r.players[0].role});}
 const r=rooms.get(String(b.code||'').toUpperCase());if(!r)return json({error:'That room was not found. Check the code.'},404);
 if(u.pathname==='/api/join'){if(r.players.length>=2)return json({error:'This room already has two travelers.'},409);const p=makePlayer(r.players[0].role==='sun'?'moon':'sun');p.token=crypto.randomBytes(20).toString('hex');r.players.push(p);reset(r,r.level);publish(r);return json({code:r.code,token:p.token,role:p.role});}
 const p=r.players.find(p=>p.token===b.token);if(!p)return json({error:'Invalid session'},403);
 if(u.pathname==='/api/input')p.input=b.input||{};
 else if(u.pathname==='/api/next'&&r.complete){selectLevel(r,r.won?0:r.level+1);publish(r);}
 else if(u.pathname==='/api/level'){if(!selectLevel(r,b.level))return json({error:'Complete the previous levels first.'},403);publish(r);}
 else if(u.pathname==='/api/leave'){p.input={};r.players=r.players.filter(player=>player!==p);for(const stream of r.streams){if(stream.p===p){stream.res.end();r.streams.delete(stream);}}publish(r);}
 else if(u.pathname==='/api/respawn'){p.x=p.checkpoint;p.y=460;p.vy=0;}
 else if(u.pathname==='/api/restart')reset(r,r.level);
 return json({ok:true});}
 const file=path.join(__dirname,'public',u.pathname==='/'?'index.html':u.pathname);if(!file.startsWith(path.join(__dirname,'public')+'/'))return json({},403);fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(data);});});
setInterval(()=>{rooms.forEach(r=>{tick(r);publish(r);});},1000/60);
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Sun & Moon running at http://localhost:'+(process.env.PORT||3000)));
