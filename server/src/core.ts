import {randomBytes,randomUUID} from 'node:crypto';
import {allowedRating,AVATARS, REACTIONS} from '../../shared/types.js';
import type {Choice, FinaleMode, GameState, Participant, Phase, PublicGame, RoomState, RoomView, Settings, SurveyOption, SurveyQuestion, TurnOutcome, TurnRevealEntry, ScoreExplanation} from '../../shared/types.js';

export const DEFAULT_SETTINGS:Settings={rating:'standard',pace:'normal',finale:'showdown'};
export const NOW=()=>Date.now();
const randomId=()=>randomUUID();
const mix=(ids:string[])=>ids.map(id=>({id,r:Math.random()})).sort((a,b)=>a.r-b.r).map(v=>v.id);
const minmax=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const round=(n:number)=>Math.round(n);
export const isPlayer=(p:Participant)=>p.role==='player';
export const isHost=(p:Participant)=>p.role==='host';
export const activePlayers=(r:RoomState)=>r.participants.filter(p=>isPlayer(p));
const readyPlayers=(r:RoomState)=>r.game ? r.game.playerIds.filter(id=>!r.game!.departedPlayerIds.includes(id)) : [];
export function settingsSeconds(pace:Settings['pace'],phase:'guess'|'predict'|'top3'|'rank'|'showdown'){
 return ({fast:{guess:20,predict:10,top3:20,rank:30,showdown:20},normal:{guess:30,predict:15,top3:30,rank:45,showdown:30},relaxed:{guess:45,predict:25,top3:45,rank:60,showdown:45}}[pace])[phase];
}
export function newRoom(code:string,now=NOW()):RoomState{return {code,gameId:'survey-show',creatorId:'',status:'setup',settings:{...DEFAULT_SETTINGS},participants:[],matchHistory:[],questionHistory:[],reactionLastAt:{},createdAt:now,updatedAt:now};}
export function participant(r:RoomState,id:string){return r.participants.find(p=>p.id===id);}
function namify(name:string,ps:Participant[]):string{
 const original=(name.trim().replace(/\s+/g,' ').replace(/[<>\u0000-\u001f]/g,'').slice(0,24)||'Player');
 let next=original,n=2;while(ps.some(p=>p.name.toLocaleLowerCase()===next.toLocaleLowerCase()))next=`${original.slice(0,18)} ${n++}`;return next;
}
export function createParticipant(r:RoomState,role:Participant['role'],name:string,now=NOW()){
 if (r.status==='playing'||r.status==='resultsReveal'||r.status==='results') { /* late joins allowed, never added to active game roster */ }
 if(role==='player'&&activePlayers(r).length+(r.gameId==='president-asshole'?(r.paSettings?.botCount??0):0)>=8)throw Error('Player limit reached (8 human and bot players combined).');
 if(role==='player'){
  if(!name.trim())throw Error('Enter a display name.');
 }
 const id=randomId(); const autoName=role==='host' ? `Host ${r.participants.filter(p=>p.role==='host'&&p.name.startsWith('Host ')).length+1}` : name;
 const p:Participant={id,token:randomBytes(24).toString('hex'),name:namify(autoName,[...r.participants,...(r.gameId==='president-asshole'?(r.pa?.bots??[]).map(b=>({...b,role:'player' as const,token:'',granted:false,online:true})):[])]),role,joinedAt:now,online:true,granted:false,requestedAt:role==='host'?now:undefined};
 r.participants.push(p);
 if(!r.creatorId){r.creatorId=id;r.authorityId=id;}
 if(!r.primaryId&&isPlayer(p))r.primaryId=id;
 rebalance(r,now);
 return p;
}
export function reconnect(r:RoomState,p:Participant,now=NOW()){
 p.online=true;p.disconnectedAt=undefined;r.allOfflineSince=undefined;
 if(p.id===r.creatorId)r.authorityId=p.id;
 rebalance(r,now);
}
export function disconnect(r:RoomState,id:string,now=NOW()){
 const p=participant(r,id);if(!p)return;p.online=false;p.disconnectedAt=now;
 // Pending presentation requests don't survive a disconnect.
 if(isHost(p)&&!p.granted)p.requestedAt=undefined;
 if(r.participants.every(q=>!q.online))r.allOfflineSince=now;
}
export function repairControllers(r:RoomState,now=NOW()){
 const creator=participant(r,r.creatorId);
 if(creator?.online){r.authorityId=creator.id;}
 else {
  const current=participant(r,r.authorityId??'');
  if(!current?.online&&(!current?.disconnectedAt||now-current.disconnectedAt>=30000)){
   const hosts=r.participants.filter(p=>p.online&&isHost(p)).sort((a,b)=>a.joinedAt-b.joinedAt);
   r.authorityId=hosts[0]?.id;
  }
 }
 const current=participant(r,r.primaryId??'');
 if(!current?.online&&(!current?.disconnectedAt||now-current.disconnectedAt>=30000)){
  const players=r.participants.filter(p=>p.online&&isPlayer(p)).sort((a,b)=>a.joinedAt-b.joinedAt);
  if(players.length)r.primaryId=players[0].id;
 }
 rebalance(r,now);
}
export function rebalance(r:RoomState,now=NOW()){
 const active=r.participants.filter(isHost);
 const creator=participant(r,r.creatorId);
 const capacity=8;
 const priority=active.filter(p=>p.id===r.creatorId);
 const optional=active.filter(p=>!priority.includes(p));
 // Previously admitted optional hosts stay before newly waiting hosts; FIFO otherwise.
 const eligible=(p:Participant)=>p.online||Boolean(p.granted&&p.disconnectedAt&&now-p.disconnectedAt<30000);
 const ordered=[...priority.filter(eligible).sort((a,b)=>a.joinedAt-b.joinedAt),...optional.filter(p=>eligible(p)&&(p.granted||p.requestedAt!==undefined)).sort((a,b)=>{
  const as=a.granted?0:1,bs=b.granted?0:1;return as-bs||(a.requestedAt??a.joinedAt)-(b.requestedAt??b.joinedAt);
 })];
 const grant=new Set(ordered.slice(0,capacity).map(p=>p.id));
 for(const p of active){
  const was=p.granted;p.granted=grant.has(p.id);
  if(was&&!p.granted&&p.online)p.requestedAt??=now;
  if(p.granted)p.requestedAt=undefined;
  if(!p.granted&&!p.online)p.requestedAt=undefined;
 }
}
// Host and player are separate, immutable roles for each room session.
export function setRole(_r:RoomState,_p:Participant,_role:Participant['role']){
 throw Error('To join with another role, use a separate device and session.');
}
export function openLobby(r:RoomState,p:Participant){
 if(p.id!==r.creatorId||p.role!=='host')throw Error('Only the creating host can finish room setup.');
 if(r.status!=='setup')throw Error('Room setup is already complete.');
 r.status='lobby';
}
export function requestPresentation(r:RoomState,p:Participant,now=NOW()){
 if(!isHost(p))throw Error('Only a host may request a presentation.');
 if(p.granted)return;
 if(p.requestedAt===undefined)p.requestedAt=now;
 rebalance(r,now);
}
export function setAvatar(r:RoomState,p:Participant,avatar:string){
 if(!['setup','lobby','countdown'].includes(r.status)||!isPlayer(p))throw Error('Avatars can only be chosen before the match.');
 if(!AVATARS.includes(avatar))throw Error('Unknown avatar.');
 if(r.participants.some(other=>other.id!==p.id&&isPlayer(other)&&other.avatar===avatar))throw Error('Avatar already taken.');
 p.avatar=avatar;
}
export function leave(r:RoomState,p:Participant,now=NOW()){
 if(p.id===r.creatorId)return 'closed' as const;
 if(r.status==='countdown'&&p.id===r.primaryId){r.status='lobby';r.countdownEndsAt=undefined;}
 if(r.game&&r.game.playerIds.includes(p.id)&&!r.game.departedPlayerIds.includes(p.id))r.game.departedPlayerIds.push(p.id);
 r.participants=r.participants.filter(q=>q.id!==p.id);
 if(r.primaryId===p.id){r.primaryId=r.participants.find(q=>q.online&&isPlayer(q))?.id;}
 if(r.authorityId===p.id)r.authorityId=r.creatorId;
 rebalance(r,now);return 'left' as const;
}
export function canStart(r:RoomState,pool:SurveyQuestion[]){
 const players=activePlayers(r).length;
 if(players<2)return 'At least two players are required.';
 if(players>8)return 'Maximum eight players.';
 const regular=pool.filter(q=>q.type==='percentage'&&allowedRating(r.settings.rating,q.rating));
 const need=2*players*(players<=3?2:1)+(r.settings.finale==='showdown'?1:0);
 if(regular.length<need)return `Need ${need} distinct percentage questions; only ${regular.length} available.`;
 if(r.settings.finale!=='showdown'&&!pool.some(q=>q.type===r.settings.finale&&allowedRating(r.settings.rating,q.rating)))return 'No eligible questions for the selected finale mode.';
 return undefined;
}
export function startCountdown(r:RoomState,questions:SurveyQuestion[],now=NOW()){
 if(r.status!=='lobby')throw Error('A match is already in progress.');
 const error=canStart(r,questions);if(error)throw Error(error);
 r.status='countdown';r.countdownEndsAt=now+15000;
}
export function cancelCountdown(r:RoomState){if(r.status!=='countdown')throw Error('No countdown.');r.status='lobby';r.countdownEndsAt=undefined;}
function selectQuestion(r:RoomState,g:GameState,type:SurveyQuestion['type']){
 const candidates=g.pool.filter(q=>q.type===type&&!g.usedIds.includes(q.id));
 if(!candidates.length)throw Error('No question remains in the match snapshot.');
 const unseen=candidates.filter(q=>!r.questionHistory.includes(q.id));
 let preferred=unseen;
 if(!preferred.length){
  const min=Math.min(...candidates.map(q=>r.questionHistory.lastIndexOf(q.id)));
  preferred=candidates.filter(q=>r.questionHistory.lastIndexOf(q.id)===min);
 }
 const chosen=preferred[Math.floor(Math.random()*preferred.length)];
 g.usedIds.push(chosen.id);r.questionHistory.push(chosen.id);return chosen.options ? {...chosen,options:mix(chosen.options.map(o=>o.id)).map(id=>chosen.options!.find(o=>o.id===id)!)} : chosen;
}
function beginMatch(r:RoomState,questions:SurveyQuestion[],t:number){
 const ps=activePlayers(r).sort((a,b)=>a.joinedAt-b.joinedAt);
 const err=canStart(r,questions);if(err){r.status='lobby';r.countdownEndsAt=undefined;return;}
 const taken=new Set(ps.map(p=>p.avatar).filter(Boolean));
 for(const p of ps){if(!p.avatar){const choices=AVATARS.filter(a=>!taken.has(a));p.avatar=choices[Math.floor(Math.random()*choices.length)];taken.add(p.avatar);}}
 const ids=ps.map(p=>p.id);const shuffled=mix(ids);const turns=shuffled.concat(ps.length<=3?shuffled:[]);
 const g:GameState={id:randomId(),playerIds:ids,pool:structuredClone(questions.filter(q=>allowedRating(r.settings.rating,q.rating))),usedIds:[],status:'regular',round:1,turnOrder:turns,turnIndex:0,phase:'guess',phaseStartedAt:t,phaseEndsAt:t+settingsSeconds(r.settings.pace,'guess')*1000,
  guessDraft:undefined,guessSubmitted:undefined,guess:undefined,predictions:{},lockedPredictions:{},finaleDrafts:{},finaleSubmitted:{},scores:Object.fromEntries(ids.map(id=>[id,0])),lastPoints:{},turns:[],standingsHistory:[],departedPlayerIds:[],playerNames:Object.fromEntries(ps.map(p=>[p.id,p.name])),playerAvatars:Object.fromEntries(ps.map(p=>[p.id,p.avatar??'']))};
 r.game=g;r.status='playing';r.countdownEndsAt=undefined;g.question=selectQuestion(r,g,'percentage');
}
export function currentPlayerId(g:GameState){return g.turnOrder[g.turnIndex];}
function isActive(g:GameState,id:string){return g.playerIds.includes(id)&&!g.departedPlayerIds.includes(id);}
export function chooseGuess(r:RoomState,p:Participant,val:number){
 const g=r.game;if(!g||r.status!=='playing'||g.phase!=='guess'||currentPlayerId(g)!==p.id||!isActive(g,p.id))throw Error('Not your guessing turn.');
 if(!Number.isInteger(val)||val<0||val>100)throw Error('Guess must be an integer from 0 to 100.');
 g.guessDraft=val;
}
// Moving the slider only updates the live preview. Pressing Submit records an
// explicit answer, which may be revised by submitting again until the deadline.
// Neither action advances the countdown.
export function submitGuess(r:RoomState,p:Participant,val:number){
 chooseGuess(r,p,val);
 r.game!.guessSubmitted=val;
}
export function validChoice(guess:number,choice:Choice,roundN:number){
 if((choice==='muchHigher'||choice==='muchLower')&&roundN<2)return false;
 if(choice==='higher')return guess<100;
 if(choice==='lower')return guess>0;
 if(choice==='muchHigher')return guess<=85;
 if(choice==='muchLower')return guess>=15;
 return false;
}
export function choosePrediction(r:RoomState,p:Participant,choice?:Choice){
 const g=r.game;if(!g||r.status!=='playing'||g.phase!=='predict'||currentPlayerId(g)===p.id||!isActive(g,p.id))throw Error('Cannot predict now.');
 if(!choice)throw Error('Choose a prediction.');
 if(g.guess===undefined||!validChoice(g.guess,choice,g.round))throw Error('That direction is not possible.');
 g.predictions[p.id]=choice;
}
export function chooseFinale(r:RoomState,p:Participant,val:number|string[]){
 const g=r.game;if(!g||r.status!=='playing'||g.phase!=='finaleInput'||!isActive(g,p.id))throw Error('Finale answers are closed.');
 const q=g.question!;
 if(r.settings.finale==='showdown'){
  if(!Number.isInteger(val)||typeof val!=='number'||val<0||val>100)throw Error('Choose 0–100%.');
 } else {
  if(!Array.isArray(val)||val.some(v=>typeof v!=='string'||!q.options?.some(o=>o.id===v))||new Set(val).size!==val.length)throw Error('Invalid answer selection.');
  if(r.settings.finale==='top3'&&val.length>3)throw Error('Select at most 3.');
  if(r.settings.finale==='rank'&&val.length>(q.options?.length??0))throw Error('Too many choices.');
 }
 g.finaleDrafts[p.id]=val;
}
export function submitFinalePercentage(r:RoomState,p:Participant,val:number){
 if(r.settings.finale!=='showdown')throw Error('This finale has no percentage submission.');
 chooseFinale(r,p,val);
 (r.game!.finaleSubmitted??={})[p.id]=val;
}
function finalizeGuess(r:RoomState,g:GameState,t:number){
 g.guess=g.guessSubmitted;
 // A slider preview without an explicit Submit is NOT an answer.
 // No submitted answer means no prediction round.
 if(g.guess===undefined){prepareTurnReveal(g,t);return;}
 g.phase='predict';g.phaseStartedAt=t;g.phaseEndsAt=t+settingsSeconds(r.settings.pace,'predict')*1000;
}
function finalizePredictions(g:GameState,t:number){
 g.lockedPredictions={...g.predictions};g.phase='predictReveal';g.phaseStartedAt=t;g.phaseEndsAt=t+3000;
}
const predictionPoints=(guess:number,actual:number,choice:Choice):number=>{
 const diff=actual-guess;
 if(choice==='higher')return diff>0?1000:0;
 if(choice==='lower')return diff<0?1000:0;
 if(choice==='muchHigher')return diff>=15?2000:0;
 if(choice==='muchLower')return diff<=-15?2000:0;return 0;
};
export function regularPoints(guess:number,actual:number){return Math.max(0,3000-100*Math.abs(guess-actual));}
// Prepare the per-player reveals without awarding points yet. All presentation
// clients receive the same persisted step and deadline, even after reconnects.
function prepareTurnReveal(g:GameState,t:number){
 const playerId=currentPlayerId(g),actual=round(g.question!.answer!);
 const guessPoints=g.guess===undefined?0:regularPoints(g.guess,actual);
 const predictionPts:Record<string,number>={};
 const order=[playerId,...g.playerIds.filter(id=>id!==playerId&&isActive(g,id))];
 const pending:Record<string,number>={[playerId]:guessPoints};
 for(const id of order.slice(1)){
  const choice=g.lockedPredictions[id];
  const pts=choice!==undefined&&g.guess!==undefined?predictionPoints(g.guess,actual,choice):0;
  pending[id]=pts;
  if(choice!==undefined)predictionPts[id]=pts;
 }
 g.turnRevealOrder=order;
 g.turnRevealStep=-1; // Stage 1: announce the actual result before showing players.
 g.pendingTurnPoints=pending;
 g.pendingTurnOutcome={playerId,questionId:g.question!.id,questionText:g.question!.text,guessed:g.guess,actual,error:g.guess===undefined?undefined:Math.abs(g.guess-actual),guessPoints,predictionPoints:predictionPts};
 g.phase='answerReveal';g.phaseStartedAt=t;g.phaseEndsAt=t+4300;
}
// Only called after ALL individual players' choices and awards have been shown.
// Changing the phase and applying scores in one persisted transition prevents a
// refresh or server restart from awarding the same points twice.
function commitTurn(g:GameState){
 if(!g.pendingTurnOutcome||!g.pendingTurnPoints)throw Error('Turn reveal has no prepared score.');
 g.lastPoints={...g.pendingTurnPoints};
 for(const [id,pts] of Object.entries(g.pendingTurnPoints))g.scores[id]=(g.scores[id]??0)+pts;
 g.turns.push(g.pendingTurnOutcome);
 g.standingsHistory.push({...g.scores});
 g.pendingTurnOutcome=undefined;
 g.pendingTurnPoints=undefined;
}

function nextRegular(r:RoomState,g:GameState,t:number){
 g.turnIndex++;
 while(g.turnIndex<g.turnOrder.length&&!isActive(g,currentPlayerId(g)))g.turnIndex++;
 if(g.turnIndex>=g.turnOrder.length){
  if(g.round===1){g.round=2;g.turnIndex=0;const ids=mix(g.playerIds.filter(id=>isActive(g,id)));g.turnOrder=ids.concat(ids.length<=3?ids:[]);
  }else{
   g.status='finale';g.phase='finaleInput';g.question=selectQuestion(r,g,r.settings.finale==='showdown'?'percentage':r.settings.finale);
   g.phaseStartedAt=t;g.phaseEndsAt=t+settingsSeconds(r.settings.pace,r.settings.finale==='top3'?'top3':r.settings.finale==='rank'?'rank':'showdown')*1000;
   g.finaleDrafts={};g.finaleSubmitted={};g.lastPoints={};return;
  }
 }
 g.question=selectQuestion(r,g,'percentage');g.guessDraft=undefined;g.guessSubmitted=undefined;g.guess=undefined;g.predictions={};g.lockedPredictions={};
 g.turnRevealOrder=undefined;g.turnRevealStep=undefined;g.pendingTurnPoints=undefined;g.pendingTurnOutcome=undefined;
 g.phase='guess';g.phaseStartedAt=t;g.phaseEndsAt=t+settingsSeconds(r.settings.pace,'guess')*1000;g.lastPoints={};
}
export function top3Points(options:SurveyOption[],selected:string[]){
 const sorted=[...options].sort((a,b)=>b.percent-a.percent);
 let points=0;
 for(const id of selected){const opt=sorted.find(o=>o.id===id);if(!opt)continue;
  const tieIndexes=sorted.flatMap((v,i)=>v.percent===opt.percent?[i]:[]);
  points+=round(tieIndexes.reduce((n,i)=>n+([3000,2000,1000][i]??0),0)/tieIndexes.length);
 }return points;
}
export function rankPoints(options:SurveyOption[],selected:string[]){
 let pts=0;
 for(let i=0;i<options.length;i++)for(let j=i+1;j<options.length;j++){
  const a=options[i],b=options[j],ai=selected.indexOf(a.id),bi=selected.indexOf(b.id);
  if(ai===-1||bi===-1)continue;
  if(a.percent===b.percent||(a.percent>b.percent&&ai<bi)||(b.percent>a.percent&&bi<ai))pts+=600;
 }return pts;
}
export function showdownPoints(drafts:Record<string,number>,actual:number){
 const ids=Object.keys(drafts);const points:Record<string,number>={};
 for(const id of ids)points[id]=Math.max(0,round(4000-(4000/30)*Math.abs(drafts[id]-actual)));
 if(!ids.length)return points;
 const closest=Math.min(...ids.map(id=>Math.abs(drafts[id]-actual)));
 const winners=ids.filter(id=>Math.abs(drafts[id]-actual)===closest).sort();
 // Allocate exactly 2000 bonus points, deterministic tie remainder.
 winners.forEach((id,i)=>points[id]+=Math.floor(2000/winners.length)+(i<2000%winners.length?1:0));
 return points;
}
// Reveal finale answers one contestant at a time before changing the totals.
function prepareFinaleReveal(r:RoomState,g:GameState,t:number){
 const mode=r.settings.finale,q=g.question!,active=g.playerIds.filter(id=>isActive(g,id));
 const pts:Record<string,number>={};
 if(mode==='showdown'){
  // Use only explicitly submitted percentages. Selecting or dragging alone is not enough.
  const submitted=Object.fromEntries(active.filter(id=>typeof g.finaleSubmitted?.[id]==='number').map(id=>[id,g.finaleSubmitted![id]])) as Record<string,number>;
  g.finaleDrafts=submitted; // Reveal only final submitted values, not previews.
  Object.assign(pts,showdownPoints(submitted,round(q.answer!)));
 }else for(const id of active){
  const draft=Array.isArray(g.finaleDrafts[id])?g.finaleDrafts[id] as string[]:[];
  pts[id]=mode==='top3'?top3Points(q.options!,draft):rankPoints(q.options!,draft);
 }
 g.finalePoints=pts;g.pendingTurnPoints=pts;
 g.turnRevealOrder=active;g.turnRevealStep=-1;
 g.phase='finaleReveal';g.phaseStartedAt=t;g.phaseEndsAt=t+4300;
}
function commitFinale(g:GameState){
 if(!g.pendingTurnPoints)throw Error('Finale reveal has no prepared score.');
 g.lastPoints={...g.pendingTurnPoints};
 for(const [id,n] of Object.entries(g.pendingTurnPoints))g.scores[id]=(g.scores[id]??0)+n;
 g.standingsHistory.push({...g.scores});
 g.pendingTurnPoints=undefined;
}
function advancePlayerReveal(g:GameState,t:number,finale:boolean){
 if((g.turnRevealStep??-1)+1<(g.turnRevealOrder?.length??0)){
  g.turnRevealStep=(g.turnRevealStep??-1)+1;
  g.phaseStartedAt=t;g.phaseEndsAt=t+4300;
 }else{
  if(finale)commitFinale(g);else commitTurn(g);
  g.phase=finale?'finaleScore':'scoreReveal';
  g.phaseStartedAt=t;g.phaseEndsAt=t+5300;
 }
}

function buildHighlights(g:GameState){
 const highlights:GameState['highlights']=[];
 if(g.turns.length){
  const attempted=g.turns.filter(turn=>turn.error!==undefined);
  const accurate=[...attempted].sort((a,b)=>a.error!-b.error!)[0];
  const miss=[...attempted].sort((a,b)=>b.error!-a.error!)[0];
  if(accurate)highlights.push({label:'Closest Guess',playerName:g.playerNames[accurate.playerId]??'Player',detail:`Just ${accurate.error} percentage points away`});
  if(miss&&miss.error!>=10)highlights.push({label:'Biggest Miss',playerName:g.playerNames[miss.playerId]??'Player',detail:`Missed by ${miss.error} points — spectacular!`});
 }
 // Reward the strongest change in placement between the midpoint and end.
 const first=g.standingsHistory[Math.floor(g.standingsHistory.length/2)]??{};
 const rank=(scores:Record<string,number>,id:string)=>1+Object.values(scores).filter(s=>s>(scores[id]??0)).length;
 const comeback=g.playerIds.map(id=>({id,improvement:rank(first,id)-rank(g.scores,id)})).sort((a,b)=>b.improvement-a.improvement)[0];
 if(comeback?.improvement>0)highlights.push({label:'Best Comeback',playerName:g.playerNames[comeback.id]??'Player',detail:`Climbed ${comeback.improvement} place${comeback.improvement===1?'':'s'}`});
 return highlights.slice(0,3);
}
function finishMatch(r:RoomState,g:GameState,t:number){
 g.status='finished';g.phase='finaleScore';g.phaseStartedAt=t;
 const ranks=g.playerIds.map(id=>({id,name:g.playerNames[id]??'Player',score:g.scores[id]??0,avatar:g.playerAvatars[id]??'',rank:1})).sort((a,b)=>b.score-a.score);
 ranks.forEach(p=>p.rank=1+ranks.filter(q=>q.score>p.score).length);
 g.finalRanks=ranks;g.highlights=buildHighlights(g);g.revealStep=0;
 r.status='resultsReveal';g.phaseEndsAt=t+2200;
 r.matchHistory.push({id:g.id,finishedAt:t,rankings:ranks,highlights:g.highlights});
}
function resultsStep(r:RoomState,g:GameState,t:number){
 g.revealStep=(g.revealStep??0)+1;
 // one step per distinct rank, then highlights; leave at completed results.
 const count=new Set(g.finalRanks?.map(p=>p.rank)).size;
 if(g.revealStep>=count+2){r.status='results';g.phaseEndsAt=0;}
 else g.phaseEndsAt=t+2200;
}
export function advance(r:RoomState,questions:SurveyQuestion[],now=NOW()){
 repairControllers(r,now);
 let guard=0;
 while(guard++<512){
  if(r.allOfflineSince&&now-r.allOfflineSince>=15*60_000)return 'expired' as const;
  if(r.status==='countdown'){
   if(!r.countdownEndsAt||r.countdownEndsAt>now)break;
   beginMatch(r,questions,r.countdownEndsAt);continue;
  }
  if(r.status==='resultsReveal'){
   const g=r.game!;if(g.phaseEndsAt>now)break;resultsStep(r,g,g.phaseEndsAt);continue;
  }
  if(r.status!=='playing'||!r.game)break;
  const g=r.game;
  const players=readyPlayers(r);
  if(!players.length){finishMatch(r,g,now);continue;}
  if(g.status==='regular'&&!isActive(g,currentPlayerId(g))&&['guess','predict'].includes(g.phase)){nextRegular(r,g,now);continue;}
  // Allow already-running rooms from a prior version to enter the new reveal protocol.
  if(g.phase==='answerReveal'&&!g.pendingTurnOutcome){prepareTurnReveal(g,now);continue;}
  if(g.phase==='finaleReveal'&&!g.pendingTurnPoints){prepareFinaleReveal(r,g,now);continue;}
  // Percentage-selection phases run for their full timer, including after a selection.
  if(g.phase==='predict'&&players.filter(id=>id!==currentPlayerId(g)).every(id=>g.predictions[id]!==undefined)){finalizePredictions(g,now);continue;}
  if(g.phaseEndsAt>now)break;
  const t=g.phaseEndsAt;
  if(g.phase==='guess')finalizeGuess(r,g,t);
  else if(g.phase==='predict')finalizePredictions(g,t);
  else if(g.phase==='predictReveal')prepareTurnReveal(g,t);
  else if(g.phase==='answerReveal')advancePlayerReveal(g,t,false);
  else if(g.phase==='scoreReveal'){nextRegular(r,g,t);}
  else if(g.phase==='finaleInput')prepareFinaleReveal(r,g,t);
  else if(g.phase==='finaleReveal')advancePlayerReveal(g,t,true);
  else if(g.phase==='finaleScore')finishMatch(r,g,t);
  else break;
 }
 return 'ok' as const;
}
// Build server-authoritative explanations from the SAME inputs and scoring
// functions used to award points. Clients must never reconstruct the rules.
export function explainPoints(r:RoomState,g:GameState,id:string,pts:number):ScoreExplanation{
 const actual=round(g.question?.answer??0);
 const fmt=(n:number)=>n.toLocaleString('en-US');
 const base={verdict:'NO ANSWER',calculation:'No answer submitted = 0 points',parts:[] as {label:string;value:string}[]};
 if(g.status==='regular'){
  const guess=g.guess;
  if(id===currentPlayerId(g)){
   if(guess===undefined)return {...base,parts:[{label:'ACTUAL',value:`${actual}%`},{label:'YOUR GUESS',value:'Not submitted'}]};
   const delta=Math.abs(guess-actual);
   return {verdict:delta===0?'PERFECT GUESS!':`${delta} POINT${delta===1?'':'S'} AWAY`,
    calculation:`max(0, 3,000 − ${delta} × 100) = ${fmt(pts)}`,
    parts:[{label:'YOUR GUESS',value:`${guess}%`},{label:'ACTUAL',value:`${actual}%`},{label:'DIFFERENCE',value:`${delta} percentage points`}],
    comparison:{guess,actual}};
  }
  const choice=g.lockedPredictions[id];
  if(choice===undefined||guess===undefined)return {...base,calculation:'No prediction = 0 points',parts:[{label:'YOUR CALL',value:'Not submitted'}]};
  const movement=actual-guess;
  const choices:Record<Choice,string>={higher:'HIGHER',lower:'LOWER',muchHigher:'MUCH HIGHER',muchLower:'MUCH LOWER'};
  const correct=pts>0;
  return {verdict:correct?'CORRECT PREDICTION!':(movement===0?'EXACTLY EQUAL — NO DIRECTION':'WRONG PREDICTION'),
   calculation:`${choices[choice]} ${correct?`✓ +${fmt(pts)}`:'✕ +0'} points${choice.startsWith('much')?' (needs 15+ percentage points)':''}`,
   parts:[{label:'FIRST GUESS',value:`${guess}%`},{label:'ACTUAL',value:`${actual}%`},{label:'CHANGE',value:`${movement>0?'+':''}${movement} points`},{label:'YOUR CALL',value:choices[choice]}],
   comparison:{guess,actual}};
 }
 const mode=r.settings.finale,answer=g.finaleDrafts[id];
 if(mode==='showdown'){
  if(typeof answer!=='number')return {...base,parts:[{label:'ACTUAL',value:`${actual}%`},{label:'YOUR GUESS',value:'Not submitted'}]};
  const delta=Math.abs(actual-answer);
  const raw=Math.max(0,round(4000-(4000/30)*delta));
  const bonus=pts-raw;
  return {verdict:bonus>0?'CLOSEST GUESS BONUS!':`${delta} POINT${delta===1?'':'S'} AWAY`,
   calculation:`${fmt(raw)} accuracy points${bonus>0?` + ${fmt(bonus)} closest bonus`:''} = ${fmt(pts)}`,
   parts:[{label:'YOUR GUESS',value:`${answer}%`},{label:'ACTUAL',value:`${actual}%`},{label:'DIFFERENCE',value:`${delta} points`},{label:'ACCURACY',value:`max(0, round(4,000 − ${delta} × 133⅓)) = ${fmt(raw)}`},{label:'BONUS',value:`+${fmt(bonus)}`}],comparison:{guess:answer,actual}};
 }
 const options=g.question?.options??[],selected=Array.isArray(answer)?answer:[];
 if(mode==='top3'){
  if(!selected.length)return {...base,calculation:'No answers selected = 0 points'};
  const sorted=[...options].sort((a,b)=>b.percent-a.percent);
  const parts=selected.map(key=>{
   const o=sorted.find(q=>q.id===key);
   if(!o)return {label:'UNKNOWN',value:'+0'};
   const ties=sorted.flatMap((q,i)=>q.percent===o.percent?[i]:[]);
   const earned=round(ties.reduce((total,i)=>total+([3000,2000,1000][i]??0),0)/ties.length);
   return {label:o.label.toUpperCase(),value:`${o.percent}% · +${fmt(earned)}${ties.length>1?' (tied rank)':''}`};
  });
  return {verdict:'TOP THREE PICKS',calculation:`${parts.map(p=>(p.value.match(/\+(\d[\d,]*)/)?.[1]??'0')).join(' + ')} = ${fmt(pts)} points`,parts};
 }
 if(mode==='rank'){
  if(selected.length<2)return {...base,calculation:'Fewer than two ranked answers = 0 points'};
  let valid=0;
  for(let i=0;i<options.length;i++)for(let j=i+1;j<options.length;j++){
   const a=options[i],b=options[j],ai=selected.indexOf(a.id),bi=selected.indexOf(b.id);
   if(ai<0||bi<0)continue;
   if(a.percent===b.percent||(a.percent>b.percent&&ai<bi)||(b.percent>a.percent&&bi<ai))valid++;
  }
  return {verdict:`${valid} CORRECT ORDERED PAIRS`,calculation:`${valid} correct pairs × 600 = ${fmt(pts)} points`,
   parts:[{label:'YOUR RANKING',value:selected.map(key=>options.find(o=>o.id===key)?.label??key).join(' → ')},{label:'ACTUAL ORDER',value:[...options].sort((a,b)=>b.percent-a.percent).map(o=>o.label).join(' → ')},{label:'PAIRS',value:`${valid} of 10 correct (tied percentages count either way)`}]};
 }
 return base;
}

export function skipResults(r:RoomState){if(r.status!=='resultsReveal')throw Error('Results are not being revealed.');r.status='results';if(r.game){r.game.revealStep=999;r.game.phaseEndsAt=0;}}
export function returnLobby(r:RoomState){if(r.status!=='results')throw Error('Results are not finished.');r.status='lobby';r.game=undefined;r.countdownEndsAt=undefined;}
export function makeView(r:RoomState,me:Participant,now=NOW()):RoomView{
 const g=r.game;
 const hasHost=isHost(me);
 const hosts=r.participants.filter(p=>isHost(p)&&!p.granted&&p.online).sort((a,b)=>(a.requestedAt??a.joinedAt)-(b.requestedAt??b.joinedAt));
 const publicGame:PublicGame|undefined=g?{
  id:g.id,round:g.round,totalTurns:g.turnOrder.length,turnIndex:g.turnIndex,phase:g.phase,phaseStartedAt:g.phaseStartedAt,phaseEndsAt:g.phaseEndsAt,
  currentPlayerId:g.status==='regular'?currentPlayerId(g):undefined,finalMode:r.settings.finale,question:g.question?{id:g.question.id,type:g.question.type,text:g.question.text,options:g.question.options?.map(o=>({id:o.id,label:o.label})),demo:g.question.demo}:undefined,
  publicGuess:g.phase==='guess'?g.guessDraft:g.guess,
  predictionCounts:g.phase==='predict'?Object.fromEntries(Object.values(g.predictions).reduce((map,c)=>(map.set(c,(map.get(c)??0)+1),map),new Map<Choice,number>())):undefined,
  predictionsRevealed:['predictReveal','answerReveal','scoreReveal'].includes(g.phase)?Object.entries(g.lockedPredictions).map(([playerId,choice])=>({playerId,choice})):undefined,
  actual:['answerReveal','scoreReveal','finaleReveal','finaleScore'].includes(g.phase)?g.question?.answer:undefined,
  correctOptions:['finaleReveal','finaleScore'].includes(g.phase)?g.question?.options:undefined,
  source:['answerReveal','finaleReveal'].includes(g.phase)?g.question?.source:undefined,
  revealRoster:['answerReveal','scoreReveal','finaleReveal','finaleScore'].includes(g.phase)?g.turnRevealOrder?.map(id=>({
   playerId:id,name:g.playerNames[id]??'Player',avatar:g.playerAvatars[id],isGuesser:g.status==='regular'&&id===currentPlayerId(g)
  })):undefined,
  revealEntries:['answerReveal','scoreReveal','finaleReveal','finaleScore'].includes(g.phase)&&g.turnRevealOrder ?
   g.turnRevealOrder.slice(0,['scoreReveal','finaleScore'].includes(g.phase)?undefined:Math.max(0,(g.turnRevealStep??-1)+1)).map((id):TurnRevealEntry=>{
    const finale=g.status==='finale'||g.status==='finished';
    const draft=g.finaleDrafts[id];
    const labels=Array.isArray(draft)?draft.map(optionId=>g.question?.options?.find(o=>o.id===optionId)?.label??optionId):[];
    const answerLabel=finale?(typeof draft==='number'?`${draft}%`:labels.length?labels.join(r.settings.finale==='rank'?' → ':', '):'NO ANSWER'):undefined;
    return {playerId:id,name:g.playerNames[id]??'Player',avatar:g.playerAvatars[id],isGuesser:!finale&&id===currentPlayerId(g),
     guess:!finale&&id===currentPlayerId(g)?g.guess:undefined,
     choice:!finale&&id!==currentPlayerId(g)?g.lockedPredictions[id]:undefined,
     answerLabel,
     points:['scoreReveal','finaleScore'].includes(g.phase)?(g.lastPoints[id]??0):(g.pendingTurnPoints?.[id]??0),
     explanation:explainPoints(r,g,id,['scoreReveal','finaleScore'].includes(g.phase)?(g.lastPoints[id]??0):(g.pendingTurnPoints?.[id]??0))};
   }):undefined,
  revealStepInTurn:['answerReveal','finaleReveal'].includes(g.phase)?g.turnRevealStep:undefined,
  revealTotalInTurn:['answerReveal','scoreReveal','finaleReveal','finaleScore'].includes(g.phase)?g.turnRevealOrder?.length:undefined,
  scores:g.scores,lastPoints:['scoreReveal','finaleScore'].includes(g.phase)?g.lastPoints:{},
  myDraft:g.finaleDrafts[me.id]??(g.phase==='guess'&&currentPlayerId(g)===me.id?g.guessDraft:undefined),
  myPrediction:g.predictions[me.id],mySubmitted:g.phase==='guess'?g.guessSubmitted!==undefined&&currentPlayerId(g)===me.id:g.phase==='predict'?g.predictions[me.id]!==undefined:g.phase==='finaleInput'?(r.settings.finale==='showdown'?g.finaleSubmitted?.[me.id]!==undefined:g.finaleDrafts[me.id]!==undefined):false,
  mySubmittedValue:g.phase==='guess'&&currentPlayerId(g)===me.id?g.guessSubmitted:g.phase==='finaleInput'&&r.settings.finale==='showdown'?g.finaleSubmitted?.[me.id]:undefined,
  finaleResults:['finaleScore'].includes(g.phase)?g.finalePoints:undefined,
  finalRanks:r.status==='resultsReveal'||r.status==='results'?g.finalRanks:undefined,
  highlights:r.status==='results'?g.highlights:undefined,revealStep:g.revealStep
 }:undefined;
 return {code:r.code,gameId:r.gameId??'survey-show',status:r.status,settings:r.settings,primaryId:r.primaryId,participants:r.participants.map(p=>({id:p.id,name:p.name,role:p.role,avatar:p.avatar,online:p.online,score:g?.scores[p.id]??0,presentation:p.granted})),
  me:{id:me.id,name:me.name,role:me.role,avatar:me.avatar,creator:me.id===r.creatorId,primary:me.id===r.primaryId,authority:me.id===r.authorityId,hostWaiting:hasHost&&!me.granted,queuePosition:hosts.findIndex(p=>p.id===me.id)+1||undefined},
  countdownEndsAt:r.countdownEndsAt,game:publicGame,lastMatch:r.matchHistory.at(-1),serverNow:now,presentationLimit:8};
}
export function reactionAllowed(r:RoomState,id:string,emojiId:string,now=NOW()){
 const p=participant(r,id);const emoji=REACTIONS.find(e=>e.id===emojiId);
 if(!p||p.role!=='player'||!emoji||!allowedRating(r.settings.rating,emoji.rating))throw Error('Reaction unavailable.');
 if(now-(r.reactionLastAt[id]??0)<3000)return undefined;
 r.reactionLastAt[id]=now;return {id:emoji.id,label:emoji.label,emoji:emoji.emoji,by:p.name,at:now,sound:emoji.sound};
}
