// Compatibility tombstone: old polling clients must never access a database.
module.exports=(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.query.action==='config'&&req.method==='GET'){
  return res.status(200).json({transport:'websocket',websocketUrl:process.env.GAME_SERVER_URL||null});
 }
 return res.status(410).json({error:'This version has moved to WebSockets. Refresh the page.',code:'CLIENT_OUTDATED'});
};
