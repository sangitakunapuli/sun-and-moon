const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {WebSocketServer,WebSocket}=require('ws');
const {levels,reset,makePlayer,tick,selectLevel}=require('./world');
const publicDir=path.join(__dirname,'public');
function createGameServer(options={}){
 const rooms=new Map(),limits=new Map();let clock=null,frames=0;
 const now=options.now||Date.now,log=options.log||((event,data)=>console.log(JSON.stringify({time:new Date().toISOString(),event,...data})));
 const origins=new Set((options.origins||process.env.ALLOWED_ORIGINS||'http://localhost:3000,http://127.0.0.1:3000,https://sun-and-moon-one.vercel.app,https://sun-and-moon-sans-projects-ad5462fc.vercel.app').split(','));
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(url.pathname==='/health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true,transport:'websocket',database:false}));}
  if(url.pathname==='/api/config'){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({transport:'websocket',websocketUrl:'/ws'}));}
  if(url.pathname.startsWith('/api/')||url.pathname==='/events'){res.writeHead(410,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'This client is outdated. Refresh the page to use WebSockets.'}));}
  if(req.method!=='GET'){res.writeHead(405);return res.end();}
  let pathname;try{pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);}catch{res.writeHead(400);return res.end('Invalid path');}const file=path.resolve(publicDir,'.'+pathname);if(!file.startsWith(publicDir+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-cache'});res.end(data);});
 });
 const wss=new WebSocketServer({noServer:true,maxPayload:4096});
 function send(ws,message){if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<128000)ws.send(JSON.stringify(message));}
 function snapshot(r){return {code:r.code,level:r.level,scene:levels[r.level],players:r.players.map(({token,input,jumpHeld,socket,lastSeen,...p})=>p),bridges:r.bridges,gate:r.gate,stars:r.stars,complete:r.complete,won:r.won,total:r.total,completed:r.completed,bestStars:r.bestStars,levels:levels.map(l=>l.name)};}
 function publish(r,force=false){const state=snapshot(r),text=JSON.stringify(state);if(!force&&text===r.previous)return;r.previous=text;for(const p of r.players)if(p.socket)send(p.socket,{type:'state',state});}
 function ensureClock(){if(clock)return;clock=setInterval(()=>{frames++;for(const r of rooms.values()){tick(r);if(frames%2===0)publish(r);}},1000/60);}
 function stopClockIfEmpty(){if([...rooms.values()].every(r=>r.players.every(p=>!p.socket))){clearInterval(clock);clock=null;}}
 function detach(ws){const r=ws.room,p=ws.player;if(p&&p.socket===ws){p.socket=null;p.connected=false;p.input={};p.lastSeen=now();r.touched=now();publish(r,true);}ws.room=null;ws.player=null;stopClockIfEmpty();}
 function bind(ws,r,p){if(p.socket&&p.socket!==ws){const previous=p.socket;previous.room=null;previous.player=null;previous.close(4002,'Session opened in another tab');}ws.room=r;ws.player=p;p.socket=ws;p.connected=true;p.input={};p.lastSeen=now();r.touched=now();ensureClock();}
 function fail(message,status=400){const e=Error(message);e.status=status;throw e;}
 server.on('upgrade',(req,socket,head)=>{const url=new URL(req.url,'http://localhost');if(url.pathname!=='/ws'||(req.headers.origin&&!origins.has(req.headers.origin))||wss.clients.size>=200){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
 wss.on('connection',(ws,req)=>{ws.isAlive=true;ws.activity=now();ws.messageWindow=now();ws.messages=0;ws.connectionId=crypto.randomBytes(6).toString('hex');const ip=req.socket.remoteAddress;log('connection_open',{connectionId:ws.connectionId});
  ws.on('pong',()=>ws.isAlive=true);
  ws.on('error',()=>{});
  ws.on('message',raw=>{let message;try{if(now()-ws.messageWindow>1000){ws.messages=0;ws.messageWindow=now();}if(++ws.messages>90){ws.close(4008,'Too many messages');return;}message=JSON.parse(raw);const {id,action,data={}}=message;if(typeof action!=='string'||action.length>20)fail('Invalid action');if(typeof id!=='number'||!Number.isSafeInteger(id))fail('Invalid request');
   if(action!=='input'&&action!=='heartbeat')log('game_action',{connectionId:ws.connectionId,action,version:String(data.clientVersion||'unknown').slice(0,30)});
   let result={ok:true};
   if(['create','join','resume'].includes(action)){
    if(ws.player)fail('Leave your current room first.');let r,p;
    if(action==='create'){
     const limit=limits.get(ip)||{time:now(),count:0};if(now()-limit.time>60000){limit.time=now();limit.count=0;}if(++limit.count>10||rooms.size>=100)fail('Please wait before creating another room.',429);limits.set(ip,limit);
     let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));r={code,players:[],total:0,touched:now()};p=makePlayer(data.role==='moon'?'moon':'sun');p.token=crypto.randomBytes(24).toString('hex');r.players.push(p);reset(r);rooms.set(code,r);
    }else{
     r=rooms.get(String(data.code||'').toUpperCase());if(!r)fail('Room expired or server restarted. Create a new room.',404);
     if(action==='resume'){p=r.players.find(p=>p.token===data.token);if(!p)fail('Your session has ended.',403);}
     else{if(r.players.length>=2)fail('This room already has two travelers.',409);p=makePlayer(r.players[0]?.role==='sun'?'moon':'sun');p.token=crypto.randomBytes(24).toString('hex');r.players.push(p);reset(r,r.level);}
    }
    bind(ws,r,p);ws.activity=now();result={code:r.code,token:p.token,role:p.role,state:snapshot(r)};
   }else{
    const r=ws.room,p=ws.player;if(!r||!p||p.socket!==ws)fail('Join a room first.',403);
    if(action!=='heartbeat')ws.activity=now();r.touched=now();
    switch(action){
     case 'input':p.input=Object.fromEntries(['left','right','jump','e'].map(k=>[k,data.input?.[k]===true]));break;
     case 'heartbeat':if(data.active===true)ws.activity=now();break;
     case 'level':if(!selectLevel(r,data.level))fail('Complete the previous levels first.',403);break;
     case 'next':if(r.complete)selectLevel(r,r.won?0:r.level+1);break;
     case 'restart':reset(r,r.level);break;
     case 'respawn':p.x=p.checkpoint;p.y=460;p.vy=0;break;
     case 'leave':detach(ws);r.players=r.players.filter(player=>player!==p);publish(r,true);break;
     default:fail('Unknown action.',404);
    }
    result.state=snapshot(r);
   }
   send(ws,{type:'reply',id,result});if(ws.room)publish(ws.room,true);
  }catch(e){send(ws,{type:'reply',id:message?.id,error:{message:e.message,status:e.status||400}});}});
  ws.on('close',()=>{detach(ws);log('connection_close',{connectionId:ws.connectionId});});
 });
 const maintenance=setInterval(()=>{
  for(const ws of wss.clients){if(!ws.isAlive){ws.terminate();continue;}if(now()-ws.activity>90000){ws.close(4001,'Idle session paused');continue;}ws.isAlive=false;ws.ping();}
  for(const [code,r] of rooms){r.players=r.players.filter(p=>p.socket||now()-p.lastSeen<300000);if(!r.players.length||now()-r.touched>1800000){for(const p of r.players)p.socket?.close(4001,'Room expired');rooms.delete(code);}}
  for(const [ip,limit] of limits)if(now()-limit.time>60000)limits.delete(ip);stopClockIfEmpty();
 },30000);maintenance.unref();
 async function close(){clearInterval(clock);clearInterval(maintenance);for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));}
 return {server,close,rooms,wss};
}
if(require.main===module){const game=createGameServer();game.server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Sun & Moon WebSocket server: http://localhost:'+(process.env.PORT||3000)));process.on('SIGTERM',async()=>{await game.close();process.exit(0);});}
module.exports={createGameServer};
