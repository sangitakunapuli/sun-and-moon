const crypto = require('crypto');
const { Redis } = require('@upstash/redis');
const { levels, reset, makePlayer, tick, selectLevel } = require('../world');
let client;
function redis() {
  if (!client) client = new Redis({url:process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL, token:process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN, automaticDeserialization:false});
  return client;
}
const TTL=86400, STEP=1000/60;
const cas="if redis.call('GET',KEYS[1]) == ARGV[1] then redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]); return 1 else return 0 end";
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
function view(r){return {code:r.code,level:r.level,scene:levels[r.level],players:r.players.map(({token,input,jumpHeld,lastSeen,...p})=>p),bridges:r.bridges,gate:r.gate,stars:r.stars,complete:r.complete,won:r.won,total:r.total,completed:r.completed,bestStars:r.bestStars,levels:levels.map(l=>l.name)};}
function advance(r,now){
  for(const p of r.players){p.connected=now-p.lastSeen<4000;if(now-p.lastSeen>500)p.input={};}
  const elapsed=Math.min(30,Math.max(0,Math.floor((now-r.lastTick)/STEP)));
  for(let i=0;i<elapsed;i++)tick(r);
  r.lastTick=elapsed===30?now:r.lastTick+elapsed*STEP;
}
async function transact(code,fn){
  const db=redis(),key='sunmoon:room:'+code;
  for(let retry=0;retry<12;retry++){
    const raw=await db.get(key);if(!raw)fail('Room expired or not found. Create a new room.',404);
    const r=JSON.parse(raw),now=Date.now();advance(r,now);const result=fn(r,now);
    if(await db.eval(cas,[key],[raw,JSON.stringify(r),String(TTL)]))return result;
  }
  fail('Room is busy. Please try again.',503);
}
function cleanInput(input={}){return Object.fromEntries(['left','right','jump','e'].map(k=>[k,input[k]===true]));}
async function handle(action,b,ip='local'){
  if(action==='config')return {hosted:true};
  if(action==='create'){
    const db=redis();const limit=await db.incr('sunmoon:create:'+ip+':'+Math.floor(Date.now()/60000));if(limit===1)await db.expire('sunmoon:create:'+ip+':'+Math.floor(Date.now()/60000),120);if(limit>12)fail('Please wait a minute before creating another room.',429);
    const p=makePlayer(b.role==='moon'?'moon':'sun');p.token=crypto.randomBytes(24).toString('hex');p.lastSeen=Date.now();p.connected=true;
    for(let i=0;i<5;i++){const code=crypto.randomBytes(3).toString('hex').toUpperCase(),r={code,players:[p],total:0,lastTick:Date.now()};reset(r);if(await db.set('sunmoon:room:'+code,JSON.stringify(r),{nx:true,ex:TTL}))return {code,token:p.token,role:p.role};}fail('Could not create room. Try again.',503);
  }
  const code=String(b.code||'').toUpperCase();if(!/^[A-F0-9]{6}$/.test(code))fail('Enter a valid six-character room code.');
  return transact(code,(r,now)=>{
    if(action==='join'){
      if(r.players.length>=2)fail('This room already has two travelers.',409);
      const p=makePlayer(r.players.length&&r.players[0].role==='sun'?'moon':'sun');p.token=crypto.randomBytes(24).toString('hex');p.lastSeen=now;p.connected=true;r.players.push(p);reset(r,r.level);return {code,token:p.token,role:p.role};
    }
    const p=r.players.find(p=>p.token===b.token);if(!p)fail('Your room session has ended.',403);p.lastSeen=now;p.connected=true;
    switch(action){
      case 'sync':case 'input':p.input=cleanInput(b.input);break;
      case 'resume':break;
      case 'level':if(!selectLevel(r,b.level))fail('Complete the previous levels first.',403);break;
      case 'next':if(r.complete)selectLevel(r,r.won?0:r.level+1);break;
      case 'restart':reset(r,r.level);break;
      case 'respawn':p.x=p.checkpoint;p.y=460;p.vy=0;break;
      case 'leave':r.players=r.players.filter(player=>player!==p);break;
      default:fail('Unknown game action.',404);
    }
    return {ok:true,state:view(r)};
  });
}
module.exports=async function(req,res){
  res.setHeader('Cache-Control','no-store');
  const action=req.query.action;
  if(req.method!=='POST'&&!(req.method==='GET'&&action==='config')){res.statusCode=405;return res.end();}
  try{
    if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)fail('Invalid request origin.',403);
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(JSON.stringify(body).length>4096)fail('Request too large.',413);
    res.status(200).json(await handle(action,body,req.headers['x-forwarded-for']?.split(',')[0]||'unknown'));
  }catch(e){res.status(e.status||503).json({error:e.status?e.message:'Connection unavailable. Please try again.'});}
};
module.exports.handle=handle;
module.exports.setClient=value=>{client=value;};
