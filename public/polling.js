// Shared with deterministic fake-clock tests; no database work while suspended.
(function(root){
class RoomPoller {
 constructor(o){this.o=o;this.timer=null;this.running=false;this.version=0;this.failures=0;this.blocked=false;this.lastActivity=0;this.inflight=null;}
 start(){this.stop();this.blocked=false;this.running=true;this.failures=0;this.lastActivity=this.o.now();this.run(this.version);}
 stop(){this.running=false;this.version++;this.o.clear(this.timer);this.timer=null;if(this.inflight)this.inflight.abort();}
 pause(reason){const was=this.running;this.stop();if(was)this.o.status(reason);}
 activity(){this.lastActivity=this.o.now();if(!this.running&&!this.blocked&&!this.o.hidden())this.start();}
 async run(version){
  if(!this.running||version!==this.version)return;
  if(this.o.hidden()){this.pause('hidden');return;}
  if(this.o.now()-this.lastActivity>=60000){this.pause('idle');return;}
  let delay=120;const controller=new AbortController();this.inflight=controller;
  try{
   const state=await this.o.request(controller.signal);
   if(version!==this.version)return;
   this.failures=0;this.o.state(state);
   delay=state.complete||state.players.length<2||!state.players.every(p=>p.connected)?3000:120;
  }catch(e){
   if(version!==this.version)return;
   this.failures++;
   if([401,403,404,429].includes(e.status)||this.failures>=8){this.blocked=true;this.pause(e.code==='QUOTA_EXCEEDED'?'quota':'stopped');return;}
   delay=Math.min(30000,1000*2**(this.failures-1));this.o.status('retry');
  }finally{if(this.inflight===controller)this.inflight=null;}
  if(this.running&&version===this.version){const remaining=60000-(this.o.now()-this.lastActivity);this.timer=this.o.set(()=>this.run(version),Math.max(0,Math.min(delay,remaining)));}
 }
}
if(typeof module==='object')module.exports=RoomPoller;else root.RoomPoller=RoomPoller;
})(typeof window==='object'?window:this);
