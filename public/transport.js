(function(root){
class GameConnection{
 constructor(url,onState,onStatus){this.url=url;this.onState=onState;this.onStatus=onStatus;this.socket=null;this.pending=new Map();this.nextId=0;this.session=null;this.connecting=null;this.manual=false;this.attempts=0;this.retryTimer=null;this.heartbeat=null;}
 async open(){if(this.socket?.readyState===1)return;if(this.connecting)return this.connecting;this.manual=false;
  const ws=new WebSocket(this.url);this.socket=ws;
  this.connecting=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{ws.close();reject(Error('Server is waking up or unavailable. Please try again.'));},20000);
   ws.onopen=()=>{clearTimeout(timeout);this.heartbeat=setInterval(()=>{if(this.session)this.request('heartbeat',{active:false}).catch(()=>{});},20000);resolve();};
   ws.onerror=()=>{clearTimeout(timeout);reject(Error('Could not connect to the game server. Please try again.'));};
   ws.onmessage=e=>{let message;try{message=JSON.parse(e.data);}catch{return;}if(message.type==='state'){this.onState(message.state);return;}if(message.type==='reply'){const job=this.pending.get(message.id);if(!job)return;clearTimeout(job.timer);this.pending.delete(message.id);if(message.error){const err=Error(message.error.message);err.status=message.error.status;job.reject(err);}else job.resolve(message.result);}};
   ws.onclose=e=>{clearTimeout(timeout);if(this.socket!==ws){reject(Error('Connection replaced'));return;}clearInterval(this.heartbeat);for(const job of this.pending.values()){clearTimeout(job.timer);job.reject(Error('Connection closed'));}this.pending.clear();if(this.socket===ws){this.socket=null;this.connecting=null;}reject(Error('Connection closed'));
    if(!this.manual&&this.session&&![4001,4002,4008].includes(e.code)&&this.attempts<5){this.onStatus('reconnecting');this.retryTimer=setTimeout(async()=>{this.attempts++;try{await this.request('resume',this.session);}catch(err){if([403,404].includes(err.status)){this.suspend();this.onStatus('expired');}}},Math.min(15000,1000*2**this.attempts));}else if(!this.manual&&this.session)this.onStatus(e.code===4002?'replaced':'paused');};
  }).finally(()=>{this.connecting=null;});return this.connecting;
 }
 async request(action,data={}){await this.open();return new Promise((resolve,reject)=>{const id=++this.nextId,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Server response timed out.'));},10000);this.pending.set(id,{resolve,reject,timer});this.socket.send(JSON.stringify({id,action,data:{...data,clientVersion:'ws-1'}}));}).then(result=>{if(['create','join','resume'].includes(action)){this.attempts=0;this.session={code:result.code,token:result.token,role:result.role};if(result.state)this.onState(result.state);}if(action==='leave')this.session=null;return result;});}
 suspend(){this.manual=true;clearTimeout(this.retryTimer);clearInterval(this.heartbeat);this.socket?.close(1000,'Paused');}
 disconnect(){this.session=null;this.suspend();}
}
root.GameConnection=GameConnection;
})(window);
