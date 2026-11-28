import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {io, type Socket} from 'socket.io-client';
import {QRCodeSVG} from 'qrcode.react';
import {ConnectionName} from './ConnectionName';
import {AVATARS,REACTIONS,allowedRating} from '../../shared/types';
import type {Ack,Choice,PublicGame,RoomView,Role,Settings,SourceInfo} from '../../shared/types';
import {useGameAudio} from './audio';
import {roomFromPath,roomPath} from './roomRoute';
import {PresidentAsshole,PASettingsEditor} from './PresidentAsshole';
import {installTvNavigation} from './tvNavigation';

type Session={code:string;token:string;id:string;role:Role};
type ReactEvent={id:string;emoji:string;label:string;by:string;at:number;sound:string};
type Response=Ack&{accepted?:boolean};
type Step='games'|'choose'|'joinCode'|'joinRole'|'create'|'roomLoading'|'roomMissing';
type RoomInfo={gameId:string;status:string;playerCount:number};
const PHASE:Record<string,string>={guess:'Make your guess',predict:'Higher or lower?',predictReveal:'Predictions',answerReveal:'Survey says!',scoreReveal:'Points awarded',finaleInput:'Final round',finaleReveal:'Final reveal',finaleScore:'Final scores'};
const roomFromUrl=()=>roomFromPath(location.pathname);
const sessionKey=(code:string)=>'curtbox.session.'+code;
function storedSession(code:string):Session|undefined{try{const raw=localStorage.getItem(sessionKey(code));return raw?JSON.parse(raw) as Session:undefined;}catch{return undefined;}}
function saveSession(s:Session){localStorage.setItem(sessionKey(s.code),JSON.stringify(s));localStorage.setItem('curtbox.lastRoom',s.code);}
function legacyAudioOn(){try{return localStorage.getItem('curtbox.audioOn')!=='false';}catch{return true;}}
function useStored<T>(key:string,initial:T):[T,(v:T)=>void]{const [v,setV]=useState<T>(()=>{try{const x=localStorage.getItem(key);return x?JSON.parse(x) as T:initial;}catch{return initial;}});const update=(value:T)=>{setV(value);localStorage.setItem(key,JSON.stringify(value));};return [v,update];}
const timeLabel=(ms:number)=>`${Math.max(0,Math.ceil(ms/1000))}s`;
const points=(v:number)=>v.toLocaleString('en-US');
const errorMessage=(e:unknown)=>e instanceof Error?e.message:String(e);
function useNow(){const [now,setNow]=useState(Date.now());useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),180);return()=>clearInterval(timer);},[]);return now;}

function App(){
 useEffect(() => installTvNavigation(), []);
 const socket=useRef<Socket|null>(null);
 const session=useRef<Session|undefined>(undefined);
 const [connected,setConnected]=useState(false);
 const [view,setView]=useState<RoomView|null>(null);
 const [step,setStep]=useState<Step>(roomFromUrl()?'roomLoading':'games');
 const [code,setCode]=useState(roomFromUrl());
 const [roomGame,setRoomGame]=useState('survey-show');
 const [roomInfo,setRoomInfo]=useState<RoomInfo|null>(null);
 const [role,setRole]=useState<Role>('player');
 const [name,setName]=useStored('curtbox.playerName','');
 const [hostReady,setHostReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [showQR,setShowQR]=useState(false);
 const [showAudio,setShowAudio]=useState(false);
 const [showSettings,setShowSettings]=useState(false);
 // Separate categories; migrate an older disabled master switch for each one.
 const [musicOn,setMusicOn]=useStored('curtbox.musicOn',legacyAudioOn());
 const [effectsOn,setEffectsOn]=useStored('curtbox.effectsOn',legacyAudioOn());
 const [musicVolume,setMusicVolume]=useStored('curtbox.musicVolume',0.24);
 const [effectsVolume,setEffectsVolume]=useStored('curtbox.effectsVolume',0.6);
 const [eventSound,setEventSound]=useState<ReactEvent>();
 const [reactions,setReactions]=useState<ReactEvent[]>([]);
 const [reactionOpen,setReactionOpen]=useState(false);
 const [reactionCounts,setReactionCounts]=useStored<Record<string,number>>('curtbox.reactionCounts',{});
 const [lastReact,setLastReact]=useState(0);
 const [sourceOpen,setSourceOpen]=useState(false);
 const [guessValue,setGuessValue]=useState(50);
 const [finaleChoices,setFinaleChoices]=useState<string[]>([]);
 const [admin,setAdmin]=useState(location.pathname.startsWith('/admin'));
 const now=useNow();
 const offset=useRef(0);
 const host=!!view&&view.me.role==='host';
 const surveyAudioActive=host&&view?.gameId==='survey-show'&&!view?.me.hostWaiting;
 const audio=useGameAudio({musicEnabled:musicOn&&surveyAudioActive,effectsEnabled:effectsOn&&surveyAudioActive,game:view?.game,roomStatus:view?.status,musicVolume,effectsVolume,eventSound});
 // Direct links bypass game selection and code entry, but still require a valid
 // room and explicit role selection for visitors without an existing session.
 useEffect(()=>{
  const requested=roomFromUrl();
  if(!requested)return;
  const canonical=roomPath(requested);
  if(location.pathname!==canonical)history.replaceState(null,'',canonical+location.search+location.hash);
  let active=true;
  void (async()=>{
   try{
    const response=await fetch(`/api/rooms/${requested}`);
    const info=await response.json() as RoomInfo&{error?:string};
    if(!response.ok)throw Error(info.error||'Room not found or has expired.');
    if(!active)return;
    setRoomGame(info.gameId);setRoomInfo(info);setCode(requested);
    setStep('joinRole');
   }catch(e){
    if(!active)return;
    setStep('roomMissing');setError(errorMessage(e));
   }
  })();
  return()=>{active=false;};
 },[]);
 useEffect(()=>{
  const s=io({transports:['websocket','polling'],reconnection:true});socket.current=s;
  s.on('connect',()=>{
   setConnected(true);
   const previous=session.current??storedSession(roomFromUrl()||localStorage.getItem('curtbox.lastRoom')||'');
   if(previous){session.current=previous;setHostReady(previous.role==='host');s.emit('room:join',{code:previous.code,role:previous.role,token:previous.token},(r:Ack)=>{if(!r.ok){setView(null);setError(r.error||'Could not reconnect.');localStorage.removeItem(sessionKey(previous.code));session.current=undefined;}});}
  });
  s.on('disconnect',()=>setConnected(false));
  s.on('room:view',(r:RoomView)=>{offset.current=Date.now()-r.serverNow;setView(r);setCode(r.code);setError('');});
  s.on('room:closed',(r:{reason:string})=>{setView(null);setError(r.reason);if(session.current)localStorage.removeItem(sessionKey(session.current.code));session.current=undefined;history.replaceState(null,'','/');setStep('games');});
  s.on('room:reaction',(r:ReactEvent)=>{setReactions(old=>[...old.slice(-12),r]);setEventSound(r);});
  return()=>{s.disconnect();socket.current=null;};
 },[]);
 useEffect(()=>{setSourceOpen(false);},[view?.game?.question?.id,view?.game?.phase]);
 useEffect(()=>{setGuessValue(typeof view?.game?.myDraft==='number'?view.game.myDraft:50);setFinaleChoices(Array.isArray(view?.game?.myDraft)?view.game.myDraft:[]);},[view?.game?.question?.id,view?.game?.phase]);
 const action=useCallback((event:string,data:unknown={})=>new Promise<Response>((resolve,reject)=>{
  if(!socket.current?.connected){reject(Error('Not connected to the server.'));return;}
  socket.current.timeout(7000).emit(event,data,(err:Error|null,r?:Response)=>{if(err)reject(Error('Server did not respond.'));else if(!r?.ok)reject(Error(r?.error||'Action failed.'));else resolve(r);});
 }),[]);
 const run=useCallback(async(event:string,data:unknown={})=>{try{setError('');return await action(event,data);}catch(e){setError(errorMessage(e));return undefined;}},[action]);
 const enter=async(mode:'create'|'join',joinRole:Role='host')=>{
  if(busy)return;setBusy(true);setError('');
  try{
   const normalized=code.trim().toUpperCase();
   const old=mode==='join'?storedSession(normalized):undefined;
   const result=await action(mode==='create'?'room:create':'room:join',mode==='create'?{gameId:roomGame}:{code:normalized,role:joinRole,name:joinRole==='player'?name:'',token:old?.role===joinRole?old.token:undefined});
   if(!result.code||!result.id||!result.token)throw Error('Room response was incomplete.');
   const s:Session={code:result.code,id:result.id,token:result.token,role:mode==='create'?'host':joinRole};
   session.current=s;saveSession(s);setHostReady(mode==='create'?false:joinRole!=='host'?false:false);history.replaceState(null,'',roomPath(s.code));
  }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 };
 const validateCode=async()=>{
  const normalized=code.trim().toUpperCase();if(!/^[A-Z]{4}$/.test(normalized)){setError('Enter a four-letter room code.');return;}
  setBusy(true);setError('');
  try{const res=await fetch(`/api/rooms/${normalized}`);const result=await res.json();if(!res.ok)throw Error(result.error||'Room not found.');setRoomGame(result.gameId);setRoomInfo(result as RoomInfo);setCode(normalized);setStep('joinRole');history.replaceState(null,'',roomPath(normalized));}
  catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 };
 const leave=async()=>{if(await run('room:leave')){if(view)localStorage.removeItem(sessionKey(view.code));session.current=undefined;setView(null);setStep('games');history.replaceState(null,'','/');}};
 const react=async(id:string)=>{if(now-lastReact<3000)return;const r=await run('room:react',{id});if(r?.accepted){setLastReact(Date.now());setReactionCounts({...reactionCounts,[id]:(reactionCounts[id]??0)+1});}};
 const g=view?.game;
 const seconds=Math.max(0,((view?.status==='countdown'?view.countdownEndsAt:g?.phaseEndsAt)??0)-now+offset.current);
 const players=view?.participants.filter(p=>p.role==='player')??[];
 const active=!!view&&!!g&&g.scores[view.me.id]!==undefined&&view.status==='playing';
 const myTurn=!!view&&g?.currentPlayerId===view.me.id;
 const allowed=view?REACTIONS.filter(r=>allowedRating(view.settings.rating,r.rating)):[];
 const favorite=useMemo(()=>[...allowed].sort((a,b)=>(reactionCounts[b.id]??0)-(reactionCounts[a.id]??0)).slice(0,4),[view?.settings.rating,reactionCounts]);
 const showAdmin=admin&&!view;
 if(showAdmin)return <Admin onBack={()=>{setAdmin(false);history.replaceState(null,'','/');}}/>;
 if(view?.gameId==='president-asshole')return <div className={'app room-app '+(host?'presenter-app':'player-app')}>
  {host?<header className="room-header pa-host-header"><div className="room-brand">◈ CURTBOX <span className="breadcrumb">/ PRESIDENT / ASSHOLE</span></div>
   <div className="header-actions"><span className={'status'+(connected?' online':'')}>{connected?'Connected':'Reconnecting'}</span><span className="room-code">{view.code}</span><button className="btn btn-small" onClick={()=>setShowQR(true)}>QR code</button>{view.status!=='setup'&&!view.me.hostWaiting&&<button className="btn btn-small" onClick={()=>setShowSettings(true)}>Settings</button>}<button className="btn btn-small btn-danger" onClick={()=>void leave()}>Leave</button>
   <details className="tv-host-menu"><summary aria-label="Open TV host menu">Menu ▾</summary><div className="tv-host-menu-options"><button type="button" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setShowQR(true);}}>QR code</button>{view.status!=='setup'&&!view.me.hostWaiting&&<button type="button" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setShowSettings(true);}}>Settings</button>}<button type="button" className="tv-host-leave" onClick={()=>void leave()}>Leave room</button></div></details></div></header>:<header className="player-minimal-header"><button className="btn btn-small btn-danger" onClick={()=>void leave()}>Leave</button></header>}
  {error&&<div role="alert" className="room-error alert">{error}<button onClick={()=>setError('')}>×</button></div>}
  {host&&view.status==='setup'?<div className="setup-wrap"><div className="panel"><div className="section-kicker">PRESIDENT / ASSHOLE · HOST SETUP</div><h1>Set up the table</h1><p className="helper">Configure the rules and timers, then open the lobby. Players join from their own phones.</p>{view.paSettings&&<PASettingsEditor settings={view.paSettings} onChange={data=>void run('president:settings',data)}/>}<button className="btn btn-primary btn-full" onClick={()=>void run('room:openLobby')}>Open lobby →</button><div className="join-link">Room code: <strong>{view.code}</strong></div></div></div>:host&&view.me.hostWaiting?<div className="panel"><h2>Host display queue</h2><button className="btn" onClick={()=>void run('room:requestPresentation')}>Request presentation</button></div>:<PresidentAsshole view={view} now={now} offset={offset.current} onAction={(event,data)=>run(event,data)} settingsOpen={showSettings} onCloseSettings={()=>setShowSettings(false)} onSettingsChange={data=>void run('president:settings',data)}/>}
  {showQR&&<div className="modal-backdrop" onClick={()=>setShowQR(false)}><div className="modal panel" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Join room {view.code}</h2><button className="btn btn-small" onClick={()=>setShowQR(false)}>Close</button></div><div className="qr-frame"><QRCodeSVG value={`${location.origin}${roomPath(view.code)}`} size={210}/></div></div></div>}

 </div>;
 if(!view)return <div className="app"><header className="site-header"><button className="brand" onClick={()=>{history.replaceState(null,'','/');setStep('games');setError('');}}>◈ <span>CURTBOX</span></button><span className="header-hint">LOCAL PARTY GAMES</span><button className="text-button" onClick={()=>{history.replaceState(null,'','/admin');setAdmin(true);}}>Admin</button></header><main className="welcome-wrap">
  <div className="intro"><div className="pixel-kicker">PRESS START TO PLAY</div><h1>Game night,<br/><span>your rules.</span></h1><p>Simple party games on your own screen. One screen hosts the show. Everyone else plays on their phone.</p></div>
  <section className="entry-panel">
   {step==='roomLoading'&&<><div className="section-kicker">ROOM {code}</div><h2>Opening room…</h2><p className="helper">Checking that this room is available.</p></>}
   {step==='roomMissing'&&<><div className="section-kicker">ROOM {code}</div><h2>Room unavailable</h2><p className="helper">This room may have closed, expired, or the link may be incorrect.</p><button className="btn btn-primary btn-full" onClick={()=>{history.replaceState(null,'','/');setError('');setStep('games');}}>Back to Curtbox →</button></>}
   {step==='games'&&<><div className="section-kicker">GAME LIBRARY</div><h2>Choose a game</h2><button className="game-card" onClick={()=>{setRoomGame('survey-show');setStep('choose');}}><span className="game-icon">▦</span><span><strong>Survey Show</strong><small>Guess the percentage. Beat the crowd.</small></span><span className="game-arrow">→</span></button><button className="game-card" onClick={()=>{setRoomGame('president-asshole');setStep('choose');}}><span className="game-icon">♠</span><span><strong>President / Asshole</strong><small>Climb the ranks. Rewrite the rules.</small></span><span className="game-arrow">→</span></button></>}
   {step==='choose'&&<><Back onClick={()=>setStep('games')}/><div className="section-kicker">{roomGame==='president-asshole'?'PRESIDENT / ASSHOLE':'SURVEY SHOW'}</div><h2>How do you want to play?</h2><div className="choice-stack"><button className="choice-card" onClick={()=>setStep('joinCode')}><span><strong>Join existing room</strong><small>Enter the code shown on a host screen.</small></span><span>→</span></button><button className="choice-card" onClick={()=>setStep('create')}><span><strong>Create new room</strong><small>Set up a new show as its host.</small></span><span>→</span></button></div></>}
   {step==='joinCode'&&<><Back onClick={()=>setStep('choose')}/><div className="section-kicker">JOIN A ROOM</div><h2>Enter room code</h2><form onSubmit={e=>{e.preventDefault();void validateCode();}}><label className="field-label" htmlFor="join-code">Four-letter code</label><input id="join-code" className="code-input" maxLength={4} placeholder="ABCD" autoCapitalize="characters" autoComplete="off" value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g,''))}/><button className="btn btn-primary btn-full" disabled={busy||code.length!==4}>Continue →</button></form></>}
   {step==='joinRole'&&<><Back onClick={()=>{history.replaceState(null,'','/');setStep('joinCode');setError('');}}/><div className="section-kicker">ROOM {code.toUpperCase()} · {roomInfo?.gameId==='president-asshole'?'PRESIDENT / ASSHOLE':roomInfo?.gameId==='survey-show'?'SURVEY SHOW':'CURTBOX'}</div><h2>How are you joining?</h2>{roomInfo&&<p className="helper">{roomInfo.playerCount} player{roomInfo.playerCount===1?'':'s'} joined · {roomInfo.status==='setup'?'Host setting up':roomInfo.status==='lobby'?'Lobby open':roomInfo.status==='playing'?'Game in progress':roomInfo.status==='countdown'?'Starting soon':'Room active'}</p>}<div className="choice-stack"><button className={'choice-card'+(role==='player'?' choice-active':'')} onClick={()=>setRole('player')}><span><strong>Player</strong><small>Play on this device. No host setup.</small></span><span>●</span></button><button className={'choice-card'+(role==='host'?' choice-active':'')} onClick={()=>setRole('host')}><span><strong>Host</strong><small>Show the presentation on this screen.</small></span><span>▣</span></button></div>{role==='player'&&<><label className="field-label" htmlFor="player-name">Your display name</label><input id="player-name" autoComplete="nickname" maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="Enter a name"/></>}<button className="btn btn-primary btn-full" disabled={busy||(role==='player'&&!name.trim())} onClick={()=>void enter('join',role)}>Join as {role} →</button></>}
   {step==='create'&&<><Back onClick={()=>setStep('choose')}/><div className="section-kicker">{roomGame==='president-asshole'?'PRESIDENT / ASSHOLE':'SURVEY SHOW'}</div><h2>Create a room</h2><p className="helper">You'll be the host. Curtbox generates the room code automatically.</p><button className="btn btn-primary btn-full" disabled={busy} onClick={()=>void enter('create')}>Create room →</button></>}
   {error&&<div role="alert" className="alert">{error}</div>}
  </section></main><footer className="site-footer">CURTBOX <span>•</span> SELF-HOSTED PARTY GAMES</footer></div>;
 return <div className={'app room-app'+(host?' presenter-app':' player-app')}>
  {host?<header className="room-header"><div className="room-brand"><span className="brand-symbol">◈</span> CURTBOX <span className="breadcrumb">/ SURVEY SHOW</span></div><div className="header-actions"><span className={'status'+(connected?' online':'')}>{connected?'Connected':'Reconnecting'}</span><span className="room-code">{view.code}</span><button className="btn btn-small" onClick={()=>setShowQR(true)}>QR code</button><button className="btn btn-small" onClick={()=>{audio.unlock();setShowAudio(true);}}>Audio</button>{(musicOn||effectsOn)&&!audio.unlocked&&<button className="btn btn-small sound-enable" onClick={audio.unlock}>🔊 Enable audio</button>}{view.me.creator&&view.status==='lobby'&&<button className="btn btn-small" onClick={()=>setShowSettings(true)}>Settings</button>}<button className="btn btn-small btn-danger" onClick={()=>void leave()}>Leave</button></div></header>:<header className="player-minimal-header"><span className="visually-hidden">Player controls</span><button className="btn btn-small btn-danger" onClick={()=>void leave()}>Leave</button></header>}
  {error&&<div className="room-error alert" role="alert">{error}<button onClick={()=>setError('')}>×</button></div>}
  {host?(view.me.hostWaiting?<div className="waiting-screen panel"><h2>Presentation queue</h2><p>This room has reached its host display limit.</p><strong>Queue position {view.me.queuePosition??'—'}</strong><button className="btn" onClick={()=>void run('room:requestPresentation')}>Request presentation</button></div>:view.status==='setup'?<div className="setup-wrap"><div className="panel"><div className="section-kicker">HOST SETUP · ROOM {view.code}</div><h1>Set up your show</h1><p className="helper">Choose how Survey Show will play. When you're ready, open the lobby so players can join.</p><HostSettings settings={view.settings} onUpdate={data=>void run('room:settings',data)}/><button className="btn btn-primary btn-full" onClick={async()=>{if(await run('room:openLobby')){audio.unlock();setHostReady(true);}}}>Open lobby →</button><div className="join-link"><strong>Room code: {view.code}</strong><span>Share this code with your players.</span></div></div></div>:!hostReady?<div className="setup-wrap"><div className="panel"><div className="section-kicker">HOST DISPLAY · ROOM {view.code}</div><h1>Host setup</h1><p className="helper">Your screen will show the public presentation only. Players join from their own devices.</p><label className="checkbox-row"><input type="checkbox" checked={musicOn} onChange={e=>setMusicOn(e.target.checked)}/><span>Enable presentation music</span></label><label className="checkbox-row"><input type="checkbox" checked={effectsOn} onChange={e=>setEffectsOn(e.target.checked)}/><span>Enable presentation sound effects</span></label><button className="btn" onClick={audio.unlock}>Enable browser audio</button><button className="btn btn-primary btn-full" onClick={()=>{audio.unlock();setHostReady(true);}}>Continue to presentation →</button></div></div>:<GameStage view={view} now={now} offset={offset.current} reactions={reactions} onQR={()=>setShowQR(true)}/>):<div className="player-layout"><div className="player-column">
   {(view.status==='setup'||view.status==='lobby'||view.status==='countdown')&&<div className="panel"><h2>{view.status==='countdown'?`Starting in ${timeLabel(seconds)}`:'Choose an avatar'}</h2><div className="avatar-grid">{AVATARS.map(a=><button key={a} className={'avatar'+(view.participants.find(p=>p.id===view.me.id)?.avatar===a?' avatar-picked':'')} disabled={players.some(p=>p.id!==view.me.id&&p.avatar===a)} onClick={()=>void run('room:avatar',{avatar:a})} aria-label={`Choose ${a}`}>{a}</button>)}</div>{view.me.primary&&view.status==='lobby'&&<button className="btn btn-primary btn-full" disabled={players.length<2} onClick={()=>void run('room:start')}>Start game</button>}{view.me.primary&&view.status==='countdown'&&<button className="btn btn-full" onClick={()=>void run('room:cancel')}>Cancel countdown</button>}{view.status==='setup'&&<p className="helper">Waiting for the host to finish setting up the room.</p>}</div>}
   {view.status==='playing'&&g&&<div className="panel question-panel"><div className="question-top"><span className="section-kicker">{g.phase.startsWith('finale')?'FINALE':g.round===1?'ROUND 1':'ROUND 2'} · {PHASE[g.phase]??g.phase}</span><span className="countdown-badge">{timeLabel(seconds)}</span></div><h2 className="player-question">{g.question?.text??'Get ready for the next question…'}</h2>{!active?<p className="helper">You're watching this round. You can join as a player when the next match starts.</p>:<>
    {g.phase==='guess'&&(myTurn?<><p className="helper">Choose a percentage, then press Submit. The timer always runs to zero, and you can change and resubmit until then.</p><PercentagePicker value={guessValue} onChange={setGuessValue} onPreview={value=>void run('game:guess',{value})} disabled={seconds<=0}/><button className="btn btn-primary btn-full" disabled={seconds<=0||!connected} onClick={()=>void run('game:guessSubmit',{value:guessValue})}>Submit {guessValue}%</button>{g.mySubmitted&&<div className="success-line">Submitted {g.mySubmittedValue}%. Adjust and submit again to change your answer.</div>}</>:<div className="waiting-answer">Waiting for the active player…</div>)}
    {g.phase==='predict'&&(myTurn?<div className="waiting-answer">Your guess: {g.publicGuess}% · Waiting for predictions.</div>:<><p className="helper">The guess was <strong>{g.publicGuess}%</strong>. What does the survey say?</p><div className="answer-grid">{(['higher','lower',...(g.round>1?['muchHigher','muchLower']:[])] as Choice[]).map(choice=>{const valid=choice==='higher'?g.publicGuess!<100:choice==='lower'?g.publicGuess!>0:choice==='muchHigher'?g.publicGuess!<=85:g.publicGuess!>=15;return <button key={choice} className={'answer-choice'+(g.myPrediction===choice?' selected':'')} disabled={!valid||g.mySubmitted} onClick={()=>void run('game:predict',{choice})}>{({higher:'↑ Higher',lower:'↓ Lower',muchHigher:'⇈ Much higher',muchLower:'⇊ Much lower'})[choice]}</button>;})}</div>{g.mySubmitted&&<div className="success-line">Answer received</div>}</>)}
    {g.phase==='finaleInput'&&(g.finalMode==='showdown'?<><p className="helper">Choose a percentage and press Submit before time runs out. You can resubmit until the deadline.</p><PercentagePicker value={guessValue} onChange={setGuessValue} onPreview={value=>void run('game:finale',{value})} disabled={seconds<=0}/><button className="btn btn-primary btn-full" disabled={seconds<=0||!connected} onClick={()=>void run('game:finaleSubmit',{value:guessValue})}>Submit {guessValue}%</button>{g.mySubmitted&&<div className="success-line">Submitted {g.mySubmittedValue}%. Adjust and submit again to change your answer.</div>}</>:<><p className="helper">{g.finalMode==='top3'?'Pick the three most popular answers. Each tap chooses an answer.':'Tap the answers in order, highest percentage first.'}</p><div className="answer-list">{(g.question?.options??[]).map(opt=>{const index=finaleChoices.indexOf(opt.id);return <button key={opt.id} disabled={index<0&&finaleChoices.length>=(g.finalMode==='top3'?3:(g.question?.options?.length??5))} className={'answer-choice'+(index>=0?' selected':'')} onClick={()=>{const next=index>=0?finaleChoices.filter(id=>id!==opt.id):[...finaleChoices,opt.id];setFinaleChoices(next);void run('game:finale',{value:next});}}><span>{index>=0?`${index+1}.`:''} {opt.label}</span><span>{index>=0?'✓':'+'}</span></button>;})}</div>{g.mySubmitted&&<div className="success-line">All choices received</div>}</>)}
    {['predictReveal','answerReveal','scoreReveal','finaleReveal','finaleScore'].includes(g.phase)&&<div className="result-inset">{g.actual!==undefined?<><span>Survey says</span><strong>{g.actual}%</strong></>:<strong>Answers are in</strong>}{Object.keys(g.lastPoints).length>0&&<p>Points are on the board.</p>}{g.source&&<><button className="text-button" onClick={()=>setSourceOpen(!sourceOpen)}>Source: {g.source.publisher} · {g.source.year} {sourceOpen?'▴':'▾'}</button>{sourceOpen&&<SourceDetails source={g.source}/>}</>}</div>}
   </>}</div>}
   {(view.status==='resultsReveal'||view.status==='results')&&g&&<div className="panel results-panel"><h2>{view.status==='results'?'Game over':'Results are being revealed'}</h2><p className="helper">See the host screen for scores and highlights.</p>{view.me.primary&&view.status==='resultsReveal'&&<button className="btn btn-full" onClick={()=>void run('game:skip')}>Skip reveal</button>}{view.me.primary&&view.status==='results'&&<button className="btn btn-primary btn-full" onClick={()=>void run('game:lobby')}>Return to lobby →</button>}</div>}
   <div className="reaction-bar"><div className="panel-title">QUICK REACTIONS</div><div className="reaction-buttons">{favorite.map(r=><button key={r.id} disabled={now-lastReact<3000} title={r.label} onClick={()=>void react(r.id)}>{r.emoji}</button>)}<button title="All reactions" onClick={()=>setReactionOpen(!reactionOpen)}>＋</button></div>{reactionOpen&&<div className="reaction-all">{allowed.map(r=><button key={r.id} disabled={now-lastReact<3000} title={r.label} onClick={()=>void react(r.id)}>{r.emoji} <span>{r.label}</span></button>)}</div>}</div>
  </div></div>}
  {showQR&&<div className="modal-backdrop" onClick={()=>setShowQR(false)}><div className="modal panel" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Join room {view.code}</h2><button className="btn btn-small" onClick={()=>setShowQR(false)}>Close</button></div><div className="qr-frame"><QRCodeSVG value={`${location.origin}${roomPath(view.code)}`} size={210}/></div><p className="helper">Scan to join, then choose Host or Player.</p></div></div>}
  {showAudio&&<div className="modal-backdrop" onClick={()=>setShowAudio(false)}><div className="modal panel" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Presentation sound</h2><button className="btn btn-small" onClick={()=>setShowAudio(false)}>Close</button></div><label className="checkbox-row"><input type="checkbox" checked={musicOn} onChange={e=>setMusicOn(e.target.checked)}/><strong>Enable music</strong></label>
   <label className="field-label">Music volume<input aria-label="Music volume" type="range" min="0" max="1" step="0.01" disabled={!musicOn} value={musicVolume} onChange={e=>setMusicVolume(Number(e.target.value))}/></label>
   <label className="checkbox-row"><input type="checkbox" checked={effectsOn} onChange={e=>setEffectsOn(e.target.checked)}/><strong>Enable sound effects</strong></label>
   <label className="field-label">Sound effect volume<input aria-label="Sound effect volume" type="range" min="0" max="1" step="0.01" disabled={!effectsOn} value={effectsVolume} onChange={e=>setEffectsVolume(Number(e.target.value))}/></label>
   <button className="btn" onClick={audio.unlock}>Enable browser audio</button></div></div>}
  {showSettings&&view.me.creator&&view.status==='lobby'&&<div className="modal-backdrop" onClick={()=>setShowSettings(false)}><div className="modal panel" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Room settings</h2><button className="btn btn-small" onClick={()=>setShowSettings(false)}>Done</button></div><HostSettings settings={view.settings} onUpdate={data=>void run('room:settings',data)}/></div></div>}
 </div>;
}

function Back({onClick}:{onClick:()=>void}){return <button className="back-link" onClick={onClick}>← Back</button>;}
function HostSettings({settings,onUpdate}:{settings:Settings;onUpdate:(s:Partial<Settings>)=>void}){return <div className="settings-fields"><label className="field-label">Content rating<select value={settings.rating} onChange={e=>onUpdate({rating:e.target.value as Settings['rating']})}><option value="family">Family-friendly</option><option value="standard">Standard</option><option value="adults">Adults only</option></select></label><label className="field-label">Game pace<select value={settings.pace} onChange={e=>onUpdate({pace:e.target.value as Settings['pace']})}><option value="fast">Fast</option><option value="normal">Normal</option><option value="relaxed">Relaxed</option></select></label><label className="field-label">Final round<select value={settings.finale} onChange={e=>onUpdate({finale:e.target.value as Settings['finale']})}><option value="showdown">Percentage showdown</option><option value="top3">Top 3 answers</option><option value="rank">Rank answers</option></select></label></div>;}
function PercentagePicker({value,onChange,onPreview,disabled}:{value:number;onChange:(n:number)=>void;onPreview:(n:number)=>void;disabled:boolean}){
 const lastSent=useRef(0);
 const change=(next:number)=>{onChange(next);if(!disabled&&Date.now()-lastSent.current>=140){lastSent.current=Date.now();onPreview(next);}};
 const finish=(next:number)=>{if(!disabled){lastSent.current=Date.now();onPreview(next);}};
 return <div className="percent-picker"><div className="percent-number">{value}<span>%</span></div><input aria-label="Choose a percentage" type="range" min="0" max="100" step="1" value={value} disabled={disabled} onChange={e=>change(Number(e.target.value))} onPointerUp={e=>finish(Number(e.currentTarget.value))} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','Home','End','Enter'].includes(e.key))finish(Number(e.currentTarget.value));}}/><div className="range-ends"><span>0%</span><span>100%</span></div><p className="helper">Moving the slider is only a preview. Press Submit to save your answer.</p></div>;
}
function SourceDetails({source}:{source:SourceInfo}){return <div className="source-details"><p><b>Publisher:</b> {source.publisher} ({source.year})</p><p><b>Original wording:</b> {source.originalWording}</p>{source.population&&<p><b>Population:</b> {source.population}</p>}{source.geography&&<p><b>Geography:</b> {source.geography}</p>}{source.fieldDates&&<p><b>Field dates:</b> {source.fieldDates}</p>}{source.sampleSize&&<p><b>Sample size:</b> {points(source.sampleSize)}</p>}{source.methodology&&<p><b>Methodology:</b> {source.methodology}</p>}{source.missingDetails?.length&&<p><b>Not reported:</b> {source.missingDetails.join(', ')}</p>}{source.url&&<a href={source.url} target="_blank" rel="noopener noreferrer">Open source ↗</a>}</div>;}
function Leaderboard({ranks,revealStep,disconnected}:{ranks:NonNullable<PublicGame['finalRanks']>;revealStep:number;disconnected:Set<string>}){const distinct=[...new Set(ranks.map(p=>p.rank))].sort((a,b)=>b-a);const visible=new Set(distinct.slice(0,revealStep));return <div className="leaderboard">{ranks.filter(p=>visible.has(p.rank)).map(p=><div key={p.id} className={'leader-row'+(p.rank===1?' winner':'')}><span>{p.rank===1?'🏆':`#${p.rank}`} {p.avatar} <ConnectionName name={p.name} offline={disconnected.has(p.id)}/></span><strong>{points(p.score)}</strong></div>)}</div>;}
function Highlights({items}:{items:NonNullable<PublicGame['highlights']>}){return <div className="highlights">{items.map(item=><div key={item.label}><span>{item.label}</span><strong>{item.playerName}</strong><small>{item.detail}</small></div>)}</div>;}

/** TV-first lobby. No game scores, oversized title treatment, or compact player chips. */
function LobbyStage({view,remaining}:{view:RoomView;remaining:number}){
 const players=view.participants.filter(p=>p.role==='player');
 const joinUrl=`${location.origin}${roomPath(view.code)}`;
 const countdown=view.status==='countdown';
 const ready=players.length>=2;
 const slots=Array.from({length:8},(_,index)=>players[index]);
 return <section className="lobby-stage" aria-label="Survey Show lobby">
  <div className="lobby-main">
   <div className="lobby-intro">
    <span className="lobby-eyebrow">{countdown?'GET READY TO PLAY':ready?'EVERYBODY’S INVITED':'THE STAGE IS YOURS'}</span>
    <h1>{countdown?<>Starting in <span className="countdown-big">{timeLabel(remaining)}</span></>:<>Meet the <em>players.</em></>}</h1>
    <div className="lobby-status" aria-live="polite"><span className={'lobby-status-dot'+(ready?' is-ready':'')}/><strong>{players.length} / 8</strong> PLAYERS <span className="lobby-status-separator">·</span> {countdown?'GAME STARTING':ready?'READY TO PLAY':'NEED AT LEAST 2 PLAYERS TO START'}</div>
   </div>
   <div className="lobby-players-grid" aria-label="Player lineup">
    {slots.map((player,index)=><div key={player?.id??`empty-${index}`} className={'lobby-seat'+(player?' occupied':' empty')+(player?.id===view.primaryId?' controller-seat':'')}>
      {player?<>
        <div className="lobby-avatar" aria-hidden="true">{player.avatar??'🎮'}</div>
        <strong className="lobby-player-name"><ConnectionName name={player.name} offline={!player.online}/></strong>
        {player.id===view.primaryId&&<span className="lobby-controller-tag" title="First player controls when the match starts">★ CONTROLLER</span>}
      </>:<><span className="lobby-empty-icon" aria-hidden="true">+</span><span className="lobby-empty-label">OPEN SLOT</span></>}
      <span className="lobby-seat-number">{String(index+1).padStart(2,'0')}</span>
    </div>)}
   </div>
  </div>
  <aside className="lobby-join" aria-label="How to join this room">
    <div className="lobby-join-heading">JOIN THE GAME</div>
    <div className="lobby-qr"><QRCodeSVG value={joinUrl} size={226} bgColor="#ffffff" fgColor="#10192f" aria-label={`QR code linking to room ${view.code}`}/></div>
    <div className="lobby-scan">SCAN WITH YOUR PHONE</div>
    <div className="lobby-or">OR ENTER THE CODE</div>
    <strong className="lobby-room-code">{view.code}</strong>
    <span className="lobby-join-foot">{countdown?'PLAYERS, GET READY':ready?'WAITING FOR START':'GRAB A PHONE AND JOIN IN'}</span>
  </aside>
 </section>;
}

const directionLabels:Record<Choice,string>={higher:'↑ HIGHER',lower:'↓ LOWER',muchHigher:'⇈ MUCH HIGHER',muchLower:'⇊ MUCH LOWER'};

// A score update only occurs when the server finishes the entire reveal.
// Count toward the authoritative new total over 1.3 seconds on the TV.
function ScoreCounter({score}:{score:number}){
 const [display,setDisplay]=useState(score);
 const previous=useRef(score);
 useEffect(()=>{
  const from=previous.current;previous.current=score;
  if(from===score){setDisplay(score);return;}
  const started=performance.now();let frame=0;
  const tick=(at:number)=>{
   const progress=Math.min(1,(at-started)/1300);
   const ease=1-Math.pow(1-progress,3);
   setDisplay(Math.round(from+(score-from)*ease));
   if(progress<1)frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[score]);
 return <>{points(display)}</>;
}

/** A 0–100 TV-sized ruler. The server supplies every scoring explanation;
 * the ruler only visualizes the already-decided result and the point bands. */
function ScoringRuler({actual,focus,showdown}:{actual:number;focus?:NonNullable<PublicGame['revealEntries']>[number];showdown:boolean}){
 const cap=(v:number)=>Math.max(0,Math.min(100,v));
 const comparison=focus?.explanation?.comparison;
 const guess=comparison?.guess;
 const prediction=!showdown&&!focus?.isGuesser&&!!focus?.choice;
 const choice=focus?.choice;
 const higher=choice==='higher'||choice==='muchHigher';
 const much=choice==='muchHigher'||choice==='muchLower';
 const threshold=guess===undefined?undefined:cap(guess+(higher?(much?15:0):-(much?15:0)));
 const targetStart=prediction&&threshold!==undefined?(higher?threshold:0):0;
 const targetWidth=prediction&&threshold!==undefined?(higher?100-threshold:threshold):0;
 const bands=focus&&guess!==undefined&&!prediction?[{delta:30,cls:'outer',label:'0+'},{delta:20,cls:'mid',label:'1,000+'},{delta:10,cls:'inner',label:'2,000+'}]:[];
 return <div className="scoring-scale" key={`${focus?.playerId??'actual'}-${focus?.choice??''}`} aria-label={`Survey result ${actual} percent${guess!==undefined?`, compared with ${guess} percent`:''}`}>
   <div className="scoring-scale-head"><strong>THE PERCENTAGE BOARD</strong><span>{prediction?'DIRECTION OF THE ANSWER':focus?(showdown?'CLOSER IS BETTER':'ACCURACY EARNS POINTS'):'THE REAL RESULT'}</span></div>
   <div className="scoring-scale-plot">
     {bands.map(b=>{
      const left=cap(actual-b.delta),right=cap(actual+b.delta);
      return <div key={b.delta} className={`scoring-scale-band ${b.cls}`} style={{left:`${left}%`,width:`${right-left}%`}}/>;
     })}
     {prediction&&targetWidth>0&&<div className="scoring-scale-target" style={{left:`${targetStart}%`,width:`${targetWidth}%`}}/>}
     <div className="scoring-scale-trail"/>
     {guess!==undefined&&<div className="scoring-scale-marker guess-marker" style={{left:`${cap(guess)}%`}}><span>{prediction?'ORIGINAL':'PLAYER'} · {guess}%</span><i/></div>}
     <div className="scoring-scale-marker actual-marker" style={{left:`${cap(actual)}%`}}><span>ACTUAL · {actual}%</span><i/></div>
     {guess!==undefined&&<div className="scoring-scale-distance" style={{left:`${Math.min(actual,guess)}%`,width:`${Math.abs(actual-guess)}%`}}/>}
   </div>
   <div className="scoring-scale-ticks">{[0,25,50,75,100].map(t=><span key={t}>{t}%</span>)}</div>
   {prediction?<div className="scale-rule-summary"><span className="rule-key target-key"/>The highlighted region is a winning {much?'MUCH ':''}{higher?'HIGHER':'LOWER'} answer. {much?'At least 15 percentage points in that direction.':'Any change in that direction wins.'}</div>:
    focus&&guess!==undefined?<div className="scale-rule-summary"><span className="rule-key inner-key"/>Near the real result: {showdown?'up to 4,000 accuracy points plus a 2,000-point closest bonus':'exact = 3,000 · 10 off = 2,000 · 20 off = 1,000 · 30+ off = 0'}</div>:
    <div className="scale-rule-summary">First, the actual survey result. Next, we compare the percentage-picker's answer.</div>}
 </div>;
}

function SurveyReveal({g,disconnected}:{g:PublicGame;disconnected:Set<string>}){
 const scoring=g.phase==='scoreReveal'||g.phase==='finaleScore';
 const isFinale=g.phase==='finaleReveal'||g.phase==='finaleScore';
 const showdown=isFinale&&g.finalMode==='showdown';
 const entries=g.revealEntries??[];
 const roster=g.revealRoster??[];
 const focus=!scoring&&g.revealStepInTurn!==undefined&&g.revealStepInTurn>=0?entries.at(-1):undefined;
 const actual=g.actual===undefined?undefined:Math.round(g.actual);
 const resultOptions=(g.correctOptions??[]).slice().sort((a,b)=>b.percent-a.percent);
 const isPercentage=actual!==undefined;
 const displayChoice=(entry:NonNullable<PublicGame['revealEntries']>[number])=>
  entry.answerLabel??(entry.isGuesser?(entry.guess===undefined?'NO GUESS':`${entry.guess}%`):(entry.choice?directionLabels[entry.choice]:'NO PREDICTION'));
 const stage=focus?.isGuesser?'PERCENTAGE-PICKER':focus?'PREDICTION':scoring?'FINAL SCOREBOARD':'ACTUAL SURVEY RESULT';
 return <section className={'survey-reveal scoring-reveal'+(scoring?' committing':'')} aria-label="Survey answer, visual comparison and player points">
  <div className="reveal-topline"><span>{isFinale?'THE FINAL SURVEY':'SURVEY SAYS'}</span><span>{scoring?'ALL SCORES ARE BEING ADDED':focus?`PLAYER ${entries.length} OF ${roster.length}`:'FIRST, THE REAL ANSWER'}</span></div>
  <h2 className="reveal-question-line">{g.question?.text}</h2>
  {isPercentage?<div className="scoring-number" key={`${g.question?.id}-answer`}><span>ACTUAL RESULT</span><strong>{actual}<small>%</small></strong></div>:
   <div className="reveal-ranked-answers"><span className="reveal-answer-title">MOST POPULAR ANSWERS</span>{resultOptions.map((option,i)=><div className="reveal-ranked-line" key={option.id}><b>{i+1}</b><span>{option.label}</span><strong>{option.percent}%</strong></div>)}</div>}
  {actual!==undefined&&<ScoringRuler actual={actual} focus={focus} showdown={showdown}/>}
  {!scoring&&focus&&<div key={`${g.question?.id}-${g.phase}-${g.revealStepInTurn}`} className="reveal-player-focus scoring-focus" aria-live="polite">
    <div className="reveal-player-identity"><span className="reveal-player-avatar">{focus.avatar??'🎮'}</span><div><small>{stage}</small><strong><ConnectionName name={focus.name} offline={disconnected.has(focus.playerId)}/></strong></div></div>
    <div className="reveal-player-guess"><small>{focus.isGuesser?'GUESSED PERCENTAGE':isFinale?'FINAL ANSWER':'CALLED IT'}</small><strong>{displayChoice(focus)}</strong><span className="scoring-verdict">{focus.explanation?.verdict}</span></div>
    <div className={'reveal-player-points'+(focus.points>0?' earned':'')}><small>POINTS EARNED</small><strong>+{points(focus.points)}</strong></div>
    {focus.explanation&&<div className="scoring-explanation"><div className="scoring-math">{focus.explanation.calculation}</div><div className="scoring-parts">{focus.explanation.parts.map(part=><div key={`${part.label}-${part.value}`}><span>{part.label}</span><b>{part.value}</b></div>)}</div></div>}
  </div>}
  {!scoring&&!focus&&<div className="scoring-intro">Now compare the percentage-picker's answer, then reveal each other player's prediction.</div>}
  {scoring&&<div className="reveal-score-confirmation" key={`${g.phaseStartedAt}-commit`}><span aria-hidden="true">✦</span><strong>POINTS ON THE BOARD!</strong><small>THE TOTALS ARE UPDATING NOW</small></div>}
  {!!roster.length&&<div className="scoring-roster" style={{gridTemplateColumns:`repeat(${Math.min(roster.length,8)}, minmax(0,1fr))`}} aria-label="Player reveal order, left to right">
   {roster.map((seat,i)=>{
    const entry=entries.find(e=>e.playerId===seat.playerId);
    return <div key={seat.playerId} className={`scoring-roster-seat${entry?' is-revealed':''}${focus?.playerId===seat.playerId?' is-current':''}`}>
     <span className="scoring-roster-position">{i+1}</span><span className="scoring-roster-avatar">{seat.avatar??'🎮'}</span><strong><ConnectionName name={seat.name} offline={disconnected.has(seat.playerId)}/></strong>
     <span className="scoring-roster-choice">{entry?displayChoice(entry):'COMING UP'}</span>
     <b>{entry?`+${points(entry.points)}`:'—'}</b>
    </div>;
   })}
  </div>}
  {!scoring&&<div className="reveal-progress-track" aria-hidden="true"><span style={{width:`${roster.length?100*entries.length/roster.length:0}%`}}/></div>}
  {g.source&&!scoring&&<div className="reveal-source">{g.source.publisher} · {g.source.year}</div>}
 </section>;
}

function GameStage({view,now,offset,reactions,onQR}:{view:RoomView;now:number;offset:number;reactions:ReactEvent[];onQR:()=>void}){
 const g=view.game;
 const players=view.participants.filter(p=>p.role==='player');
 const disconnected=new Set(players.filter(p=>!p.online).map(p=>p.id));
 const current=players.find(p=>p.id===g?.currentPlayerId);
 const remaining=Math.max(0,((view.status==='countdown'?view.countdownEndsAt:g?.phaseEndsAt)??0)-now+offset);
 const isResults=view.status==='resultsReveal'||view.status==='results';
 const isTurnReveal=g&&['answerReveal','scoreReveal','finaleReveal','finaleScore'].includes(g.phase);
 return <main className="presentation"><section className="show-board">
  <div className="board-top"><span className="board-brand">SURVEY <b>SHOW</b></span><span className="board-room">ROOM <strong>{view.code}</strong></span></div>
  {(view.status==='lobby'||view.status==='countdown')&&<LobbyStage view={view} remaining={remaining}/>}
  {view.status==='playing'&&g&&<>
   <div className="board-phase"><span>{g.phase.startsWith('finale')?'THE FINALE':g.round===1?'ROUND ONE':'ROUND TWO'} <i>·</i> {PHASE[g.phase]??g.phase}</span><span className="board-clock">{timeLabel(remaining)}</span></div>
   {isTurnReveal?<SurveyReveal g={g} disconnected={disconnected}/>:<div className="board-question">
    <div className="board-kicker">{g.phase==='finaleInput'?'EVERYONE PLAYS':current?<><ConnectionName name={current.name.toUpperCase()} offline={!current.online}/>'S TURN</>:'THE SURVEY'}</div>
    <h2>{g.question?.text??'Next question coming up'}</h2>
    {g.phase==='guess'&&<div className="board-answer">{g.publicGuess===undefined?<span className="answer-waiting">WAITING FOR A GUESS</span>:<><span className="answer-digit">{g.publicGuess}<small>%</small></span><span className="answer-caption">PLAYER'S CURRENT GUESS</span></>}</div>}
    {g.phase==='predict'&&<div className="board-answer"><span className="answer-digit">{g.publicGuess}<small>%</small></span><span className="answer-caption">HIGHER OR LOWER?</span></div>}
    {g.phase==='predictReveal'&&<div className="board-answer"><span className="answer-waiting">PREDICTIONS ARE IN</span></div>}
    {g.phase==='finaleInput'&&<div className="board-answer"><span className="answer-waiting">FINAL ANSWERS IN PROGRESS</span></div>}
   </div>}
   <div className={'board-bottom'+(['scoreReveal','finaleScore'].includes(g.phase)?' scores-committing':'')}>
    <span>THE SCOREBOARD</span>
    <div className="score-strip">{players.map(p=><div key={`${g.id}-${p.id}`} className={'score-tile'+(['scoreReveal','finaleScore'].includes(g.phase)&&(g.lastPoints[p.id]??0)>0?' points-updating':'')}>
      <span>{p.avatar??'👾'} <ConnectionName name={p.name} offline={!p.online}/></span><strong><ScoreCounter score={p.score}/></strong>
      {['scoreReveal','finaleScore'].includes(g.phase)&&(g.lastPoints[p.id]??0)>0&&<em className="score-added">+{points(g.lastPoints[p.id])}</em>}
    </div>)}</div>
   </div>
  </>}
  {isResults&&g&&<div className="show-center final-presentation"><div className="board-eyebrow">THE FINAL SCORES</div><h1>{view.status==='results'?'THE RESULTS':'WHO WILL WIN?'}</h1><Leaderboard ranks={g.finalRanks??[]} revealStep={view.status==='results'?999:(g.revealStep??0)} disconnected={disconnected}/>{view.status==='results'&&g.highlights&&<Highlights items={g.highlights}/>}<p className="stage-hint">{view.status==='results'?'WAITING FOR THE PRIMARY PLAYER TO RETURN TO LOBBY':'REVEALING THE STANDINGS'}</p></div>}
  <div className="board-footer"><span>CURTBOX ORIGINAL</span><button onClick={onQR}>SCAN TO JOIN · {view.code}</button></div>
 </section><div className="emote-overlay">{reactions.filter(r=>now-r.at<3700).slice(-4).map(r=><div key={r.at+'-'+r.by}><span>{r.emoji}</span><b>{r.by}</b></div>)}</div></main>;
}

function Admin({onBack}:{onBack:()=>void}){
 type AdminQuestion={id:string;version:number;status:string;data:Record<string,unknown>};
 const [authenticated,setAuthenticated]=useState(false);const [csrf,setCsrf]=useState('');const [password,setPassword]=useState('');const [items,setItems]=useState<AdminQuestion[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(false);const [editing,setEditing]=useState('');
 const [draft,setDraft]=useState(`{\n  "type": "percentage",\n  "rating": "family",\n  "topic": "general",\n  "text": "What percentage of American adults say a hot dog is a sandwich?",\n  "answer": null,\n  "source": {\n    "publisher": "",\n    "year": 2026,\n    "url": "",\n    "originalWording": ""\n  }\n}`);
 const check=useCallback(async()=>{try{const r=await fetch('/api/admin/session',{credentials:'same-origin'});const j=await r.json();setAuthenticated(!!j.authenticated);setCsrf(j.csrf??'');}catch(e){setError(errorMessage(e));}},[]);
 const load=useCallback(async()=>{try{const r=await fetch('/api/admin/questions');if(!r.ok)throw Error('Session expired.');setItems(await r.json());}catch(e){setError(errorMessage(e));}},[]);
 useEffect(()=>{void check();},[check]);useEffect(()=>{if(authenticated)void load();},[authenticated,load]);
 const request=async(path:string,method='POST',body?:unknown)=>{setLoading(true);setError('');try{const r=await fetch(path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','x-csrf-token':csrf},body:body===undefined?undefined:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(j.error??'Request failed.');return j;}catch(e){setError(errorMessage(e));return undefined;}finally{setLoading(false);}};
 const save=async()=>{try{const data=JSON.parse(draft);const result=await request(editing?`/api/admin/questions/${encodeURIComponent(editing)}/draft`:'/api/admin/questions','POST',data);if(result){await load();setEditing('');}}catch(e){setError('Invalid JSON: '+errorMessage(e));}};
 const publish=async(item:AdminQuestion)=>{if(await request(`/api/admin/questions/${encodeURIComponent(item.id)}/publish`,'POST',{version:item.version}))void load();};
 return <main className="admin-page"><header className="app-header"><div className="logo-small">◈ CURTBOX / ADMIN</div><button className="small-ctrl" onClick={onBack}>BACK TO CURTBOX</button></header><div className="admin-inner"><h1>Question bank</h1><p className="muted">Authenticated administration for published survey questions and their immutable versions.</p>{error&&<div className="alert">{error}</div>}{!authenticated?<form className="admin-login info-panel" onSubmit={async e=>{e.preventDefault();const r=await request('/api/admin/login','POST',{password});if(r){setPassword('');await check();}}}><label>Admin password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="primary-btn" disabled={loading}>SIGN IN</button></form>:<><div className="admin-bar"><strong>{new Set(items.map(q=>q.id)).size} questions · {items.length} versions</strong><button className="secondary-btn" onClick={()=>void load()}>Refresh</button><button className="secondary-btn" onClick={async()=>{if(await request('/api/admin/logout')){setAuthenticated(false);setItems([]);}}}>Sign out</button></div><div className="admin-columns"><section className="info-panel"><h3>{editing?'New version of '+editing:'Create question'}</h3><p className="muted">Question content is entered as JSON. Drafts must be explicitly published.</p><textarea className="json-edit" rows={22} spellCheck={false} value={draft} onChange={e=>setDraft(e.target.value)}/><div className="admin-bar"><button className="primary-btn" disabled={loading} onClick={()=>void save()}>SAVE DRAFT</button>{editing&&<button className="secondary-btn" onClick={()=>setEditing('')}>Cancel edit</button>}</div></section><section className="admin-list"><h3>Question bank</h3>{items.map(item=><article className="admin-row" key={item.id+'-'+item.version}><div className="admin-row-head"><b>{item.id} / v{item.version}</b><span className={'state-pill '+item.status}>{item.status}</span></div><p>{String(item.data.text??'')}</p><div className="admin-actions"><button onClick={()=>{setEditing(item.id);setDraft(JSON.stringify(item.data,null,2));}}>New version</button>{item.status==='draft'&&<button onClick={()=>void publish(item)}>Publish</button>}{item.status==='published'&&<button onClick={async()=>{if(await request(`/api/admin/questions/${encodeURIComponent(item.id)}/disable`))void load();}}>Disable</button>}{item.status==='disabled'&&<button onClick={async()=>{if(await request(`/api/admin/questions/${encodeURIComponent(item.id)}/enable`))void load();}}>Enable</button>}<button className="danger" onClick={async()=>{const check=window.prompt(`To permanently delete ALL versions of ${item.id}, type: DELETE ${item.id}`);if(check!==`DELETE ${item.id}`)return;if(await request(`/api/admin/questions/${encodeURIComponent(item.id)}`,'DELETE',{confirmation:check}))void load();}}>Delete</button></div></article>)}</section></div></>}</div></main>;
}
export default App;
