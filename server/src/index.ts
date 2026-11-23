import express from 'express';
import cookieParser from 'cookie-parser';
import argon2 from 'argon2';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import {Pool, type PoolClient} from 'pg';
import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {Ack, Participant, Role, RoomState, Settings, SurveyQuestion} from '../../shared/types.js';
import {advance,createParticipant,disconnect,leave,makeView,newRoom,participant,reconnect,returnLobby,settingsSeconds,skipResults,startCountdown,cancelCountdown,setAvatar,openLobby,chooseGuess,submitGuess,choosePrediction,chooseFinale,submitFinalePercentage,reactionAllowed,repairControllers,rebalance,requestPresentation,canStart} from './core.js';
import {seedQuestions} from './seed.js';
import {createPA,configurePA,readyPA,playPA,passPA,exchangePA,decreePA,votePA,acknowledgePA,advancePA,departPA,publicPA,endPA,repairPAController,botDuePA} from './president.js';
import type {PADecreeAction} from '../../shared/president.js';

const PORT=Number(process.env.PORT||3000);
const SECRET=process.env.SESSION_SECRET||'';
const ADMIN_HASH=process.env.ADMIN_PASSWORD_HASH||'';
const DATABASE_URL=process.env.DATABASE_URL||'';
if(!SECRET||SECRET.length<24)throw Error('SESSION_SECRET must be at least 24 characters');
if(!ADMIN_HASH)throw Error('ADMIN_PASSWORD_HASH is required');
if(!DATABASE_URL)throw Error('DATABASE_URL is required');
const pool=new Pool({connectionString:DATABASE_URL,max:12});
const app=express();app.set('trust proxy',1);app.disable('x-powered-by');
app.use(express.json({limit:'160kb'}));app.use(cookieParser());
app.use((_,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');next();});
const http=createServer(app);const io=new Server(http,{transports:['websocket','polling'],cors:{origin:false}});
const sessions=new Map<string,{attempts:number,until:number}>();
const links=new Map<string,Set<string>>();
const connectionKey=(code:string,id:string)=>`${code}:${id}`;
function remember(code:string,id:string,sid:string){const k=connectionKey(code,id);const set=links.get(k)??new Set<string>();set.add(sid);links.set(k,set);}
function forget(code:string,id:string,sid:string){const k=connectionKey(code,id);const set=links.get(k);if(!set)return false;set.delete(sid);if(!set.size){links.delete(k);return true;}return false;}
function onlineInSockets(code:string,id:string){return (links.get(connectionKey(code,id))?.size??0)>0;}

async function initialize(){
 await pool.query(`CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY,data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS questions (id TEXT NOT NULL,version INTEGER NOT NULL,status TEXT NOT NULL,data JSONB NOT NULL,PRIMARY KEY (id,version));
 CREATE TABLE IF NOT EXISTS seed_registry(id TEXT PRIMARY KEY);`);
 // A one-time migration retires the old statistical/demographic seed questions.
 // Preserve admin-created questions and explicitly re-enabled questions thereafter.
 const retired=await pool.query(`INSERT INTO seed_registry(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id`,['__migration_culture_retire_pew_v1']);
 if(retired.rowCount){
  await pool.query(`UPDATE questions SET status='disabled' WHERE id LIKE 'pew-%' AND version=1 AND status='published'
    AND EXISTS (SELECT 1 FROM seed_registry WHERE seed_registry.id=questions.id)`);
 }
 for(const q of seedQuestions){
  const db=await pool.connect();
  try{
   await db.query('BEGIN');
   const registered=await db.query('SELECT 1 FROM seed_registry WHERE id=$1',[q.id]);
   const existing=await db.query('SELECT version,status FROM questions WHERE id=$1 ORDER BY version DESC FOR UPDATE',[q.id]);
   const latest=existing.rows[0] as {version:number;status:string}|undefined;
   if(!registered.rowCount){
    // New bundled question. A hard-deleted bundled question must NOT be resurrected.
    await db.query('INSERT INTO seed_registry(id) VALUES($1) ON CONFLICT DO NOTHING',[q.id]);
    if(!latest)await db.query(`INSERT INTO questions(id,version,status,data) VALUES($1,$2,'published',$3::jsonb)`,[q.id,q.version,JSON.stringify(q)]);
   }else if(latest&&latest.version<q.version&&latest.status==='published'){
    // Publish wording revisions as NEW versions, but do not overwrite anything
    // edited, disabled, or deleted by an administrator.
    await db.query(`UPDATE questions SET status='superseded' WHERE id=$1 AND version=$2`,[q.id,latest.version]);
    await db.query(`INSERT INTO questions(id,version,status,data) VALUES($1,$2,'published',$3::jsonb)`,[q.id,q.version,JSON.stringify(q)]);
   }
   await db.query('COMMIT');
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 console.info('Database ready; curated survey bank has',seedQuestions.length,'questions');
}
async function published(db:Pool|PoolClient=pool):Promise<SurveyQuestion[]>{
 const result=await db.query(`SELECT DISTINCT ON (id) data FROM questions WHERE status='published' ORDER BY id, version DESC`);
 return result.rows.map(row=>row.data as SurveyQuestion);
}
async function loadRoom(code:string,db:Pool|PoolClient=pool):Promise<RoomState|undefined>{const result=await db.query('SELECT data FROM rooms WHERE code=$1',[code]);return result.rows[0]?.data;}
async function syncRoom(code:string){
 const room=await loadRoom(code);if(!room)return;
 for(const [sid,socket] of io.of('/').sockets){
  if(socket.data.roomCode!==code)continue;
  const me=participant(room,socket.data.participantId);
  if(me){const view=makeView(room,me);if(room.gameId==='president-asshole'){view.paSettings=room.paSettings;view.pa=publicPA(room,me);}socket.emit('room:view',view);}
  else {socket.emit('room:closed',{reason:'You have left this room.'});socket.leave(code);socket.data.roomCode=undefined;}
 }
}
async function mutate<T=void>(code:string,fn:(r:RoomState,db:PoolClient)=>Promise<T>|T):Promise<T>{
 const db=await pool.connect();let result!:T;
 try{
  await db.query('BEGIN');const row=await db.query('SELECT data FROM rooms WHERE code=$1 FOR UPDATE',[code]);
  if(!row.rows[0])throw Error('Room not found or has expired.');
  const room:RoomState=row.rows[0].data;
  result=await fn(room,db);
  if(result==='CLOSE_ROOM' as T){await db.query('DELETE FROM rooms WHERE code=$1',[code]);}
  else {room.updatedAt=Date.now();await db.query('UPDATE rooms SET data=$2::jsonb, updated_at=NOW() WHERE code=$1',[code,JSON.stringify(room)]);}
  await db.query('COMMIT');
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 if(result==='CLOSE_ROOM' as T)io.to(code).emit('room:closed',{reason:'The room creator closed the room.'});
 else await syncRoom(code);
 return result;
}
function safeCode(input:string){const code=String(input??'').trim().toUpperCase();if(!/^[A-Z]{4}$/.test(code))throw Error('Enter a four-letter room code.');return code;}
function roleValid(input:unknown):input is Role{return input==='host'||input==='player';}
function safeAck(ack:unknown,response:Ack){if(typeof ack==='function')(ack as (v:Ack)=>void)(response);}
function getPlayer(room:RoomState,socketId:string,who:string){const p=participant(room,who);if(!p)throw Error('Participant no longer in room.');return p;}
function ensurePrimary(r:RoomState,id:string){if(r.primaryId!==id)throw Error('Only the Primary Controller can do that.');}
function ensureCreator(r:RoomState,id:string){if(r.creatorId!==id)throw Error('Only the room creator can change these settings.');}
function ensureSurvey(r:RoomState){if((r.gameId??'survey-show')!=='survey-show')throw Error('This action belongs to Survey Show.');}
function ensurePresident(r:RoomState){if(r.gameId!=='president-asshole')throw Error('This action belongs to President / Asshole.');}
function validateSettings(payload:Partial<Settings>){
 if(payload.rating!==undefined&&!['family','standard','adults'].includes(payload.rating))throw Error('Invalid rating');
 if(payload.pace!==undefined&&!['fast','normal','relaxed'].includes(payload.pace))throw Error('Invalid pace');
 if(payload.finale!==undefined&&!['showdown','top3','rank'].includes(payload.finale))throw Error('Invalid finale');
}
const sockHandler=(socket:import('socket.io').Socket,event:string,cb:(code:string,id:string,data:any)=>Promise<any>)=>{
 socket.on(event,async(payload:any,ack:unknown)=>{
  try{
   const code=socket.data.roomCode,id=socket.data.participantId;
   if(!code||!id)throw Error('Join a room first.');
   const result=await cb(code,id,payload??{});
   safeAck(ack,{ok:true,...result});
  }catch(e){safeAck(ack,{ok:false,error:e instanceof Error?e.message:'Action failed'});}
 });
};
io.on('connection',socket=>{
 socket.on('room:create',async(payload:any,ack:unknown)=>{
  try{
   if(payload?.role!==undefined&&payload.role!=='host')throw Error('Only hosts can create rooms.');
   if(payload?.gameId!==undefined&&!['survey-show','president-asshole'].includes(payload.gameId))throw Error('Unknown game.');
   const role:Role='host';
   let room!:RoomState,me!:Participant,inserted=false;
   for(let tries=0;tries<25&&!inserted;tries++){
    const code=Array.from(randomBytes(4),n=>String.fromCharCode(65+n%26)).join('');
    room=newRoom(code);if(payload?.gameId==='president-asshole'){room.gameId='president-asshole';createPA(room);}me=createParticipant(room,role,String(payload.name??''));
    const result=await pool.query('INSERT INTO rooms(code,data) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING RETURNING code',[code,JSON.stringify(room)]);
    inserted=result.rowCount===1;
   }
   if(!inserted)throw Error('Room code allocation failed.');
   socket.data.roomCode=room.code;socket.data.participantId=me.id;socket.join(room.code);remember(room.code,me.id,socket.id);
   safeAck(ack,{ok:true,code:room.code,id:me.id,token:me.token});await syncRoom(room.code);
  }catch(e){safeAck(ack,{ok:false,error:e instanceof Error?e.message:'Room creation failed'});}
 });
 socket.on('room:join',async(payload:any,ack:unknown)=>{
  try{
   const code=safeCode(payload?.code);const role=payload?.role;
   if(!roleValid(role))throw Error('Choose a role.');
   let me!:Participant;
   await mutate(code,r=>{
    const old=r.participants.find(p=>p.token===payload?.token&&typeof payload?.token==='string'&&payload.token.length>10);
    if(old){me=old;reconnect(r,me);}
    else me=createParticipant(r,role,String(payload?.name??''));
   });
   socket.data.roomCode=code;socket.data.participantId=me.id;socket.join(code);remember(code,me.id,socket.id);
   safeAck(ack,{ok:true,code,id:me.id,token:me.token});await syncRoom(code);
  }catch(e){safeAck(ack,{ok:false,error:e instanceof Error?e.message:'Unable to join'});}
 });
 sockHandler(socket,'room:openLobby',(code,id)=>mutate(code,r=>{openLobby(r,getPlayer(r,socket.id,id));}));
 sockHandler(socket,'room:requestPresentation',(code,id)=>mutate(code,r=>{requestPresentation(r,getPlayer(r,socket.id,id));}));
 sockHandler(socket,'room:avatar',(code,id,data)=>mutate(code,r=>{setAvatar(r,getPlayer(r,socket.id,id),String(data.avatar??''));}));
 sockHandler(socket,'president:settings',(code,id,data)=>mutate(code,r=>{ensureCreator(r,id);if(!['setup','lobby'].includes(r.status))throw Error('Settings are locked after play begins.');if(r.gameId!=='president-asshole')throw Error('Wrong game.');configurePA(r,data); }));
 sockHandler(socket,'president:ready',(code,id,data)=>mutate(code,r=>{if(r.gameId!=='president-asshole')throw Error('Wrong game.');readyPA(r,id,Boolean(data.ready));}));
 sockHandler(socket,'president:play',(code,id,data)=>mutate(code,r=>{ensurePresident(r);advancePA(r);playPA(r,id,data.cards,Date.now(),Boolean(data.social));}));
 sockHandler(socket,'president:pass',(code,id)=>mutate(code,r=>{ensurePresident(r);advancePA(r);passPA(r,id);}));
 sockHandler(socket,'president:exchange',(code,id,data)=>mutate(code,r=>{ensurePresident(r);advancePA(r);exchangePA(r,id,data.cards);}));
 sockHandler(socket,'president:decree',(code,id,data)=>mutate(code,r=>{ensurePresident(r);advancePA(r);decreePA(r,id,data.action as PADecreeAction|undefined,data.nominees as PADecreeAction[]|undefined);}));
 sockHandler(socket,'president:vote',(code,id,data)=>mutate(code,r=>{ensurePresident(r);advancePA(r);votePA(r,id,Number(data.index));}));
 sockHandler(socket,'president:ack',(code,id)=>mutate(code,r=>{ensurePresident(r);acknowledgePA(r,id);}));
 sockHandler(socket,'president:end',(code,id)=>mutate(code,r=>{ensurePresident(r);endPA(r,id);}));
 sockHandler(socket,'room:settings',(code,id,data)=>mutate(code,r=>{ensureSurvey(r);ensureCreator(r,id);if(!['setup','lobby'].includes(r.status))throw Error('Settings can only change during host setup or between matches.');validateSettings(data);const {rating,pace,finale}=data;Object.assign(r.settings,Object.fromEntries(Object.entries({rating,pace,finale}).filter(([,v])=>v!==undefined)));}));
 sockHandler(socket,'room:start',(code,id)=>mutate(code,async(r,db)=>{ensureSurvey(r);ensurePrimary(r,id);startCountdown(r,await published(db));}));
 sockHandler(socket,'room:cancel',(code,id)=>mutate(code,r=>{ensureSurvey(r);ensurePrimary(r,id);cancelCountdown(r);}));
 sockHandler(socket,'game:guess',(code,id,data)=>mutate(code,r=>{ensureSurvey(r);advance(r,[]);chooseGuess(r,getPlayer(r,socket.id,id),Number(data.value));advance(r,[]);}));
 sockHandler(socket,'game:guessSubmit',(code,id,data)=>mutate(code,r=>{ensureSurvey(r);advance(r,[]);submitGuess(r,getPlayer(r,socket.id,id),Number(data.value));advance(r,[]);}));
 sockHandler(socket,'game:predict',(code,id,data)=>mutate(code,r=>{ensureSurvey(r);advance(r,[]);choosePrediction(r,getPlayer(r,socket.id,id),data.choice);advance(r,[]);}));
 sockHandler(socket,'game:finale',(code,id,data)=>mutate(code,r=>{ensureSurvey(r);advance(r,[]);chooseFinale(r,getPlayer(r,socket.id,id),data.value);advance(r,[]);}));
 sockHandler(socket,'game:finaleSubmit',(code,id,data)=>mutate(code,r=>{ensureSurvey(r);advance(r,[]);submitFinalePercentage(r,getPlayer(r,socket.id,id),Number(data.value));advance(r,[]);}));
 sockHandler(socket,'game:skip',(code,id)=>mutate(code,r=>{ensureSurvey(r);ensurePrimary(r,id);skipResults(r);}));
 sockHandler(socket,'game:lobby',(code,id)=>mutate(code,r=>{ensureSurvey(r);ensurePrimary(r,id);returnLobby(r);}));
 sockHandler(socket,'room:react',async(code,id,data)=>{
  const reaction=await mutate(code,r=>reactionAllowed(r,id,String(data.id??'')));
  if(reaction)io.to(code).emit('room:reaction',reaction);
  return {accepted:Boolean(reaction)};
 });
 sockHandler(socket,'room:leave',async(code,id)=>{
  const result=await mutate(code,r=>{const departing=getPlayer(r,socket.id,id);const wasPrimary=r.primaryId===id;if(r.gameId==='president-asshole'&&departing.role==='player')departPA(r,id);const outcome=leave(r,departing);if(outcome==='closed')return 'CLOSE_ROOM' as any;if(r.gameId==='president-asshole'){if(wasPrimary)repairPAController(r,Date.now(),true);advancePA(r);}else advance(r,[]);return undefined;});
  forget(code,id,socket.id);socket.leave(code);socket.data.roomCode=undefined;socket.data.participantId=undefined;
  return {closed:result==='CLOSE_ROOM'};
 });
 socket.on('disconnect',async()=>{
  const code=socket.data.roomCode,id=socket.data.participantId;
  if(code&&id&&forget(code,id,socket.id)&&!onlineInSockets(code,id))try{await mutate(code,r=>disconnect(r,id));}catch{/* room already closed */}
 });
});

const b64=(value:string)=>Buffer.from(value).toString('base64url');
const mac=(value:string)=>createHmac('sha256',SECRET).update(value).digest('base64url');
const validToken=(cookie:unknown)=>{
 if(typeof cookie!=='string')return false;
 const [payload,signature]=cookie.split('.');if(!payload||!signature)return false;
 const expect=Buffer.from(mac(payload));const got=Buffer.from(signature);
 if(expect.length!==got.length||!timingSafeEqual(expect,got))return false;
 try{const data=JSON.parse(Buffer.from(payload,'base64url').toString());return data.kind==='admin'&&Date.now()-data.time<8*3600_000&&Date.now()>=data.time;}catch{return false;}
};
const sessionCookie=(req:express.Request,res:express.Response)=>{
 const payload=b64(JSON.stringify({kind:'admin',time:Date.now(),nonce:randomBytes(16).toString('hex')}));
 res.cookie('party_admin',`${payload}.${mac(payload)}`,{httpOnly:true,sameSite:'strict',secure:req.secure,maxAge:8*3600_000,path:'/'});
};
const authenticate:express.RequestHandler=(req,res,next)=>{if(!validToken(req.cookies.party_admin)){res.status(401).json({error:'Log in to continue.'});return;}next();};
const csrfFor=(cookie:string)=>mac(`csrf:${cookie}`);
const mutatingAdmin:express.RequestHandler=(req,res,next)=>{if(req.headers['x-csrf-token']!==csrfFor(req.cookies.party_admin)){res.status(403).json({error:'Invalid CSRF token.'});return;}next();};
const adminAction=(fn:(req:express.Request,res:express.Response)=>Promise<void>):express.RequestHandler=>(req,res)=>{fn(req,res).catch(e=>res.status(400).json({error:e instanceof Error?e.message:'Request failed'}));};
app.get('/api/health',(_,res)=>res.json({ok:true,uptime:process.uptime()}));
app.get('/api/rooms/:code',adminAction(async(req,res)=>{
 const code=safeCode(req.params.code);const room=await loadRoom(code);
 if(!room){res.status(404).json({error:'Room not found or has expired.'});return;}
 res.json({code:room.code,gameId:room.gameId??'survey-show',status:room.status,playerCount:room.participants.filter(p=>p.role==='player').length+(room.gameId==='president-asshole'?(room.paSettings?.botCount??0):0)});
}));
app.get('/api/admin/session',(req,res)=>res.json(validToken(req.cookies.party_admin)?{authenticated:true,csrf:csrfFor(req.cookies.party_admin)}:{authenticated:false}));
app.post('/api/admin/login',adminAction(async(req,res)=>{
 const key=req.ip||'unknown';const entry=sessions.get(key)??{attempts:0,until:0};
 if(entry.until>Date.now()){res.status(429).json({error:'Too many attempts; try again later.'});return;}
 const ok=typeof req.body?.password==='string'&&await argon2.verify(ADMIN_HASH,req.body.password);
 if(!ok){entry.attempts++;if(entry.attempts>=5){entry.until=Date.now()+15*60_000;entry.attempts=0;}sessions.set(key,entry);res.status(401).json({error:'Invalid password.'});return;}
 sessions.delete(key);sessionCookie(req,res);res.json({ok:true});
}));
app.post('/api/admin/logout',authenticate,mutatingAdmin,(_,res)=>{res.clearCookie('party_admin',{path:'/'});res.json({ok:true});});
app.get('/api/admin/questions',authenticate,adminAction(async(_,res)=>{
 const r=await pool.query('SELECT id,version,status,data FROM questions ORDER BY id,version DESC');res.json(r.rows);
}));
function validateQuestion(q:SurveyQuestion){
 const count=q.text.trim().split(/\s+/).length;
 if(count<6||count>25)throw Error(`Game-show question must be a concise 6–25 words (currently ${count}).`);
 if(/\baccording to\b/i.test(q.text))throw Error('Remove the unnecessary according-to prefix from the playable question.');
 if(!q.source?.publisher||!Number.isInteger(q.source.year)||!q.source.url||!q.source.originalWording)throw Error('Source publisher, year, link, and original wording are required.');
 if(!['family','standard','adults'].includes(q.rating)||!['percentage','top3','rank'].includes(q.type))throw Error('Invalid type or rating.');
 if(q.type==='percentage'&&(!Number.isInteger(q.answer)||q.answer!<0||q.answer!>100))throw Error('Answer must be a whole number between 0 and 100.');
 if(q.type!=='percentage'){
  const opts=q.options??[];if(q.type==='top3'&&(opts.length<6||opts.length>8))throw Error('Top 3 requires 6–8 options.');
  if(q.type==='rank'&&opts.length!==5)throw Error('Rank finale requires exactly five options.');
  if(new Set(opts.map(o=>o.id)).size!==opts.length||opts.some(o=>!o.label?.trim()||o.percent<0||o.percent>100))throw Error('Invalid finale options.');
 }
}
app.post('/api/admin/questions',authenticate,mutatingAdmin,adminAction(async(req,res)=>{
 const input=req.body as SurveyQuestion;const id=`custom-${randomBytes(8).toString('hex')}`;
 const q:SurveyQuestion={...input,id,version:1};validateQuestion(q);
 await pool.query('INSERT INTO questions(id,version,status,data) VALUES($1,1,$2,$3::jsonb)',[id,'draft',JSON.stringify(q)]);
 res.json({ok:true,id,version:1});
}));
app.post('/api/admin/questions/:id/draft',authenticate,mutatingAdmin,adminAction(async(req,res)=>{
 const id=req.params.id;const previous=await pool.query('SELECT version,data FROM questions WHERE id=$1 ORDER BY version DESC LIMIT 1',[id]);if(!previous.rows[0])throw Error('Question missing.');
 const q:SurveyQuestion={...previous.rows[0].data,...req.body,id,version:Number(previous.rows[0].version)+1};validateQuestion(q);
 await pool.query('INSERT INTO questions(id,version,status,data) VALUES($1,$2,$3,$4::jsonb)',[id,q.version,'draft',JSON.stringify(q)]);
 res.json({ok:true,id,version:q.version});
}));
app.post('/api/admin/questions/:id/publish',authenticate,mutatingAdmin,adminAction(async(req,res)=>{
 const id=req.params.id,version=Number(req.body?.version);
 const db=await pool.connect();try{
  await db.query('BEGIN');const found=await db.query('SELECT data FROM questions WHERE id=$1 AND version=$2',[id,version]);if(!found.rows[0])throw Error('Draft not found.');validateQuestion(found.rows[0].data);
  await db.query("UPDATE questions SET status='superseded' WHERE id=$1 AND status='published'",[id]);
  await db.query("UPDATE questions SET status='published' WHERE id=$1 AND version=$2",[id,version]);await db.query('COMMIT');
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 res.json({ok:true});
}));
app.post('/api/admin/questions/:id/disable',authenticate,mutatingAdmin,adminAction(async(req,res)=>{
 const id=req.params.id;const result=await pool.query("UPDATE questions SET status='disabled' WHERE id=$1 AND status='published'",[id]);res.json({ok:true,disabled:result.rowCount});
}));
app.post('/api/admin/questions/:id/enable',authenticate,mutatingAdmin,adminAction(async(req,res)=>{
 const id=req.params.id;const result=await pool.query("UPDATE questions SET status='published' WHERE (id,version)=(SELECT id,version FROM questions WHERE id=$1 AND status='disabled' ORDER BY version DESC LIMIT 1)",[id]);res.json({ok:true,enabled:result.rowCount});
}));
app.delete('/api/admin/questions/:id',authenticate,mutatingAdmin,adminAction(async(req,res)=>{
 if(req.body?.confirmation!==`DELETE ${req.params.id}`)throw Error(`Confirmation must be DELETE ${req.params.id}`);
 const result=await pool.query('DELETE FROM questions WHERE id=$1',[req.params.id]);res.json({ok:true,versionsDeleted:result.rowCount});
}));
app.get('/api/admin/summary',authenticate,adminAction(async(_,res)=>{
 const [q,r]=await Promise.all([pool.query('SELECT status,count(*)::int AS count FROM questions GROUP BY status'),pool.query('SELECT count(*)::int AS count FROM rooms')]);res.json({questions:q.rows,rooms:r.rows[0]?.count??0});
}));

const staticDir=join(dirname(fileURLToPath(import.meta.url)),'../../../public');
app.use(express.static(staticDir,{maxAge:'1h'}));
app.get('*',(_,res)=>res.sendFile(join(staticDir,'index.html')));

let ticking=false;
async function tick(){
 if(ticking)return;ticking=true;
 try{
  const r=await pool.query('SELECT code,data FROM rooms');
  const now=Date.now();
  for(const row of r.rows){const state:RoomState=row.data;
   const paDue=state.gameId==='president-asshole'&&Boolean(state.pa&&(state.pa.stage==='play'&&Number(state.pa.turnEndsAt)<=now||state.pa.stage!=='ready'&&state.pa.stage!=='play'&&Number(state.pa.stageEndsAt)<=now||botDuePA(state,now)));
   const due=state.status==='countdown'&&Number(state.countdownEndsAt)<=now || state.status==='playing'&&Number(state.game?.phaseEndsAt)<=now || state.status==='resultsReveal'&&Number(state.game?.phaseEndsAt)<=now;
   const grace=state.participants.some(p=>p.disconnectedAt&&now-p.disconnectedAt>=(state.gameId==='president-asshole'?(state.paSettings?.graceSeconds??30)*1000:30000)&&(state.gameId!=='president-asshole'||p.role==='player'));
   const expired=state.allOfflineSince&&now-state.allOfflineSince>=15*60_000;
   if(!due&&!paDue&&!grace&&!expired)continue;
   if(expired){await pool.query('DELETE FROM rooms WHERE code=$1',[state.code]);io.to(state.code).emit('room:closed',{reason:'Room expired after 15 minutes offline.'});continue;}
   await mutate(state.code,async(room,db)=>{if(room.gameId==='president-asshole'){
    const timeoutIds=room.participants.filter(p=>p.role==='player'&&p.disconnectedAt&&now-p.disconnectedAt>=(room.paSettings?.graceSeconds??30)*1000).map(p=>p.id);
    for(const id of timeoutIds){departPA(room,id,now);room.participants=room.participants.filter(p=>p.id!==id);}repairPAController(room,now);advancePA(room,now);
   }else advance(room,due&&room.status==='countdown'?await published(db):[],now);});
  }
 }catch(e){console.error('tick',e);}finally{ticking=false;}
}
async function main(){await initialize();
 // Restore state after restarts; all browser sessions reconnect with their existing token.
 const r=await pool.query('SELECT code,data FROM rooms');for(const row of r.rows){
  try{await mutate(row.code,async(room,db)=>{
   for(const p of room.participants){p.online=false;p.disconnectedAt??=Date.now();}
   room.allOfflineSince??=Date.now();
   if(room.gameId==='president-asshole')advancePA(room);else advance(room,await published(db));
  });}catch(e){console.error('Restore room',row.code,e);}
 }
 setInterval(tick,350).unref();http.listen(PORT,'0.0.0.0',()=>console.info(`Curtbox listening on :${PORT}`));
}
main().catch(e=>{console.error(e);process.exit(1);});
