/** Server-authoritative President / Asshole engine. Pure in-memory transitions,
 * persisted atomically with the room by server/index.ts. */
import {randomInt} from 'node:crypto';
import type {Participant,RoomState} from '../../shared/types.js';
import {PA_DEFAULT_SETTINGS,PA_DECREE_NAMES} from '../../shared/president.js';
import type {PACard,PADecreeAction,PADecreeKey,PAExchange,PASettings,PAState,PAPublic,PARank} from '../../shared/president.js';

const RANKS=['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
const SUITS=['C','D','H','S'];
const deck=()=>RANKS.flatMap(r=>SUITS.map(s=>r+s));
const order=(c:PACard)=>RANKS.indexOf(c.slice(0,-1));
const shuffle=<T>(items:T[]):T[]=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const uniq=<T>(a:T[])=>[...new Set(a)];
const decree=(g:PAState,key:PADecreeKey)=>g.decrees.find(d=>d.key===key);
const has=(g:PAState,key:PADecreeKey)=>Boolean(decree(g,key));
const isBot=(r:RoomState,id:string)=>Boolean(r.pa?.bots?.some(b=>b.id===id));
const humans=(r:RoomState)=>r.participants.filter(p=>p.role==='player');
// Bots are virtual seats, not authenticated room participants. Never put them in r.participants.
const virtualBots=(r:RoomState):Participant[]=>(r.pa?.bots??[]).map(b=>({...b,role:'player' as const,token:'',granted:false,online:true}));
const current=(r:RoomState)=>[...humans(r),...virtualBots(r)];
const player=(r:RoomState,id:string)=>current(r).find(p=>p.id===id);

export function repairPAController(r:RoomState,now=Date.now(),force=false){
 const old=humans(r).find(p=>p.id===r.primaryId);const grace=(r.paSettings?.graceSeconds??30)*1000;
 if(!force&&old&&(old.online||old.disconnectedAt!==undefined&&now-old.disconnectedAt<grace))return;
 const active=humans(r).filter(p=>p.online);
 const ranks=r.pa?.previousRanks??[];active.sort((a,b)=>(ranks.find(p=>p.id===a.id)?.position??99)-(ranks.find(p=>p.id===b.id)?.position??99)||a.joinedAt-b.joinedAt);
 r.primaryId=active[0]?.id;
}
const requirePlayer=(r:RoomState,id:string)=>{if(!player(r,id))throw Error('Player is not in room.');};
const safeSeconds=(n:number,min:number,max:number)=>Number.isInteger(n)&&n>=min&&n<=max;
export function validatePASettings(value:Partial<PASettings>){
 const choices:Partial<Record<keyof PASettings,string[]>>={mode:['president','asshole']};
 for(const [k,v] of Object.entries(value)){
  if(!(k in PA_DEFAULT_SETTINGS))throw Error(`Unknown setting: ${k}`);
  if(choices[k as keyof PASettings]){if(!choices[k as keyof PASettings]!.includes(String(v)))throw Error('Invalid game mode.');}
  else if(k==='botCount'){if(typeof v!=='number'||!safeSeconds(v,0,7))throw Error('Bot count must be an integer between 0 and 7.');}
  else if(['social','termSelfExpires'].includes(k)){if(typeof v!=='boolean')throw Error(`Invalid ${k}`);}
  else if(k==='openingCard'){if(!deck().includes(String(v)))throw Error('Opening card must exist in the deck.');}
  else if(!safeSeconds(Number(v),k==='consecutiveForDecree'?1:1,k==='consecutiveForDecree'?20:k==='termDuration'?100:300))throw Error(`Invalid ${k}`);
 }
}
export function createPA(r:RoomState){r.paSettings={...PA_DEFAULT_SETTINGS};r.pa={stage:'ready',handNumber:0,seats:[],hands:{},active:[],bots:[],ready:[],previousRanks:[],finished:[],handRanks:[],passed:[],pile:[],serial:0,exchange:[],decrees:[],decreeActionsRemaining:0,presidencies:{},streaks:{},longestStreak:{},names:{},departed:[],drinking:{}};}
export function configurePA(r:RoomState,patch:Partial<PASettings>){
 if(!r.paSettings||!r.pa)throw Error('Not a President / Asshole room.');
 validatePASettings(patch);
 if(patch.botCount!==undefined){
  if(humans(r).length+patch.botCount>8)throw Error('A President / Asshole room supports at most eight human and bot players combined.');
  const g=r.pa;const old=g.bots??[];const newBots=[...old.slice(0,patch.botCount)];
  const used=new Set([...humans(r).map(p=>p.name.toLowerCase()),...newBots.map(b=>b.name.toLowerCase())]);
  for(let i=newBots.length;i<patch.botCount;i++){
   const id=`pa-bot-${i+1}`;let name=`Bot ${i+1}`,suffix=1;
   while(used.has(name.toLowerCase()))name=`Bot ${i+1} (${++suffix})`;
   used.add(name.toLowerCase());newBots.push({id,name,joinedAt:i+1});
  }
  g.bots=newBots;
  for(const b of newBots)g.names[b.id]=b.name;
  for(const b of old)if(!newBots.some(n=>n.id===b.id)){delete g.names[b.id];delete g.presidencies[b.id];delete g.streaks[b.id];delete g.longestStreak[b.id];}
  g.botActionAt=undefined;g.botActionKey=undefined;
 }
 Object.assign(r.paSettings,patch);
}
export function readyPA(r:RoomState,id:string,ready:boolean,now=Date.now()){
 requirePlayer(r,id);const g=r.pa!;ensureUnblocked(g,id);
 if(!g||g.stage!=='ready'||r.status!=='lobby'&&r.status!=='playing')throw Error('Players cannot ready up right now.');
 g.ready=ready?uniq([...g.ready,id]):g.ready.filter(x=>x!==id);maybeStart(r,now);
}
function rankPosition(g:PAState,id:string){return g.previousRanks.find(a=>a.id===id)?.position??99;}
function ranked(g:PAState,ids:string[]){return [...ids].sort((a,b)=>rankPosition(g,a)-rankPosition(g,b));}
function nextIn(g:PAState,id:string,skip:string[]=[],direction=1){const seats=g.seats,at=seats.indexOf(id);if(at<0)return undefined;for(let n=1;n<=seats.length;n++){const candidate=seats[(at+n*direction+seats.length*100)%seats.length];if(g.active.includes(candidate)&&!skip.includes(candidate))return candidate;}return undefined;}
function activeDirection(g:PAState){return has(g,'reverse_play')?-1:1;}
function chooseLead(g:PAState,who?:string){const chosen=who&&g.active.includes(who)?who:g.active[0];g.turn=chosen;g.leadPlayer=chosen;g.turnEndsAt=undefined;}
export function maybeStart(r:RoomState,now=Date.now()){
 const g=r.pa;if(!g||g.stage!=='ready')return;
 const joined=current(r);if(joined.length<4||!humans(r).length)return;
 if(joined.some(p=>!isBot(r,p.id)&&(!p.online||!g.ready.includes(p.id))))return;
 beginHand(r,now);
}
function processExpiration(g:PAState,newHand:number){
 const expired=g.decrees.filter(d=>d.expiresBefore!==undefined&&d.expiresBefore<=newHand);
 if(expired.length){g.decrees=g.decrees.filter(d=>!expired.includes(d));g.event=`Expired: ${expired.map(d=>PA_DECREE_NAMES[d.key]).join(', ')}`;}
}
function beginHand(r:RoomState,now:number){
 const g=r.pa!,s=r.paSettings!,joined=current(r);
 const newHand=g.handNumber+1;processExpiration(g,newHand);
 const ids=joined.map(p=>p.id);ids.forEach(id=>{g.names[id]??=player(r,id)!.name;g.presidencies[id]??=0;g.streaks[id]??=0;g.longestStreak[id]??=0;});
 if(g.handNumber===0||!g.seats.length)g.seats=[...ids];
 else {
  g.seats=g.seats.filter(x=>ids.includes(x));for(const id of ids)if(!g.seats.includes(id))g.seats.push(id);
  if(has(g,'rank_seating'))g.seats=ranked(g,g.seats);
 }
 const low=g.previousRanks.filter(x=>ids.includes(x.id)).sort((a,b)=>b.position-a.position)[0]?.id??shuffle(ids)[0];
 const startId=g.handNumber===0?shuffle(ids)[0]:low;
 const dealOrder=[...g.seats];const idx=dealOrder.indexOf(startId);dealOrder.push(...dealOrder.splice(0,idx));
 if(has(g,'reverse_deal'))dealOrder.splice(1,dealOrder.length-1,...dealOrder.slice(1).reverse());
 let cards=shuffle(deck());const hands=Object.fromEntries(ids.map(id=>[id,[] as PACard[]]));
 if(has(g,'unequal_burden')&&newHand>1){
  // Normal equal distribution plus all extra cards, assigned low ranked first.
  const base=Math.floor(cards.length/ids.length),extra=cards.length%ids.length;
  const deficits=Object.fromEntries(ids.map(id=>[id,base]));
  for(const id of [...ranked(g,ids)].reverse().slice(0,extra))deficits[id]++;
  while(cards.length){for(const id of dealOrder)if(deficits[id]>0){hands[id].push(cards.pop()!);deficits[id]--;}}
 }else{let n=0;while(cards.length)hands[dealOrder[n++%dealOrder.length]].push(cards.pop()!);}
 g.handNumber=newHand;g.hands=hands;g.active=ids;g.ready=[];g.finished=[];g.handRanks=[];g.passed=[];g.pile=[];g.pileOwner=undefined;g.pileRank=undefined;g.lastPlay=undefined;g.lastClear=undefined;g.lastSkip=undefined;g.serial++;
 const leader=newHand===1?ids.find(id=>hands[id].includes(s.openingCard)):low;
 chooseLead(g,leader);g.turnEndsAt=now+s.turnSeconds*1000;g.stage='play';g.event=`Hand ${newHand} dealt`;
 g.exchange=[];
 const level=decree(g,'card_exchange')?.value??0;
 if(level>0&&g.previousRanks.length){
  const originalRanked=[...g.previousRanks].sort((a,b)=>a.position-b.position);
  const pairs:[number,number,number][]=[[0,originalRanked.length-1,level]];
  if(level===2)pairs.push([1,originalRanked.length-2,1]);
  for(const [hi,lo,count] of pairs){const upper=originalRanked[hi]?.id,lower=originalRanked[lo]?.id;if(!upper||!lower||!ids.includes(upper)||!ids.includes(lower)||upper===lower||count>hands[upper].length||count>hands[lower].length)continue;
   g.exchange.push({upper,lower,count,original:[...hands[upper]]});
  }
  if(g.exchange.length){
   g.stage='exchange';g.stageEndsAt=now+s.exchangeSeconds*1000;g.turnEndsAt=undefined;
   for(const e of g.exchange)if(isBot(r,e.upper))e.selected=lowestCards(e.original,e.count);
   if(g.exchange.every(e=>e.selected))commitExchanges(r,now);
  }
 }
 r.status='playing';
}
function lowestCards(cards:PACard[],n:number){return [...cards].sort((a,b)=>order(a)-order(b)||a.localeCompare(b)).slice(0,n);}
function ensureUnblocked(g:PAState,id:string){if(g.drinking[id]?.length&&has(g,'require_ack'))throw Error('Acknowledge your notification first.');}
function validateCards(g:PAState,id:string,cards:PACard[]){
 if(cards.length<1||cards.length>4||uniq(cards).length!==cards.length)throw Error('Choose one to four distinct cards.');
 if(cards.some(c=>!g.hands[id]?.includes(c)))throw Error('You do not own all those cards.');
 const rank=order(cards[0]);if(rank<0||cards.some(c=>order(c)!==rank))throw Error('All selected cards must have the same rank.');
 return rank;
}
function clear(g:PAState,by:string,reason:string,now:number){
 g.lastClear={by,cards:[...g.pile],reason,at:now,serial:++g.serial};g.pile=[];g.pileOwner=undefined;g.pileRank=undefined;g.passed=[];g.lastPlay=undefined;
 const s=g.active.includes(by)&&!g.finished.includes(by)?by:nextIn(g,by,g.finished,activeDirection(g));chooseLead(g,s);
}
function endHand(r:RoomState,now:number){
 const g=r.pa!,alive=g.active.filter(id=>!g.finished.includes(id));
 if(alive.length>1)return false;
 for(const id of alive)if(!g.finished.includes(id))g.finished.push(id);
 const rankedIds=uniq(g.finished).filter(id=>g.names[id]);
 // Players who explicitly left during a hand do not displace finishers.
 const ranks:PARank[]=rankedIds.map((id,i)=>({id,name:g.names[id],position:i+1}));
 g.handRanks=ranks;g.previousRanks=ranks;g.active=[];g.pile=[];g.passed=[];g.turn=undefined;g.turnEndsAt=undefined;
 const winner=ranks[0]?.id;
 if(winner){g.presidencies[winner]=(g.presidencies[winner]??0)+1;g.streaks[winner]=(g.streaks[winner]??0)+1;g.longestStreak[winner]=Math.max(g.longestStreak[winner]??0,g.streaks[winner]);}
 for(const id of Object.keys(g.streaks))if(id!==winner)g.streaks[id]=0;
 g.event=`Hand ${g.handNumber} complete${winner?` — ${g.names[winner]} is President`:''}`;
 if(winner&&g.streaks[winner]>=r.paSettings!.consecutiveForDecree){g.stage='decree';g.pendingPresident=winner;g.decreeActionsRemaining=1;g.stageEndsAt=now+r.paSettings!.decreeSeconds*1000;}
 else setReady(r);
 return true;
}
function setReady(r:RoomState){const g=r.pa!;g.stage='ready';g.ready=[];g.stageEndsAt=undefined;g.decreeActionsRemaining=0;g.pendingPresident=undefined;g.vote=undefined;g.exchange=[];}
function finishCards(r:RoomState,id:string,now:number){
 const g=r.pa!;
 if(g.hands[id].length===0&&!g.finished.includes(id)){g.finished.push(id);g.event=`${g.names[id]} finished in place ${g.finished.length}`;}
 return endHand(r,now);
}
function nextTurn(r:RoomState,from:string,now:number){const g=r.pa!,next=nextIn(g,from,g.finished,activeDirection(g));
 if(!next){endHand(r,now);return;}
 g.turn=next;g.turnEndsAt=now+r.paSettings!.turnSeconds*1000;
}
export function playPA(r:RoomState,id:string,cards:PACard[],now=Date.now(),social=false,automatic=false){
 const g=r.pa!;requirePlayer(r,id);
 if(!g||g.stage!=='play'||!g.active.includes(id)||g.finished.includes(id))throw Error('You are not playing this hand.');
 if(!automatic)ensureUnblocked(g,id);
 if(!social&&g.turn!==id)throw Error('Not your turn.');
 if(social&&!r.paSettings!.social)throw Error('Social is disabled.');
 const rank=validateCards(g,id,cards);const previous=g.lastPlay;
 if(social){if(!previous||previous.player===id||previous.rank!==rank||previous.count+cards.length!==4||rank===12)throw Error('No eligible Social play.');}
 else if(g.handNumber===1&&g.finished.length===0&&!g.lastPlay&&!g.pile.length&&!g.lastClear&&!cards.includes(r.paSettings!.openingCard))throw Error(`Opening play must include ${r.paSettings!.openingCard}.`);
 const special=rank===12||cards.length===4||(has(g,'double_trouble')&&rank===0&&cards.length===2);
 if(!social&&g.pile.length&&!special){if(cards.length!==g.lastPlay?.count)throw Error('Match the number of cards in the latest play.');if(rank<(g.pileRank??-1))throw Error('You must play a higher rank.');}
 const equal=!social&&g.pile.length>0&&rank===g.pileRank;
 g.hands[id]=g.hands[id].filter(c=>!cards.includes(c));g.pile.push(...cards);g.pileOwner=id;g.pileRank=rank;g.lastPlay={player:id,rank,count:cards.length,cards:[...cards],serial:++g.serial};g.passed=[];
 if(rank===12&&has(g,'drink_twos'))for(const target of g.active)if(target!==id&&!isBot(r,target)&&!g.finished.includes(target))(g.drinking[target]??=[]).push(`${g.names[id]} played a 2 — drink`);
 const ended=finishCards(r,id,now);if(ended)return;
 if(social||special){clear(g,id,social?'Social':'Special clear',now);g.turnEndsAt=now+r.paSettings!.turnSeconds*1000;}
 else if(equal){
  // A normal equal-rank response leaves the pile live and skips exactly one
  // still-active player in the current play direction. Social clears instead.
  const skipped=nextIn(g,id,g.finished,activeDirection(g));
  if(skipped){g.lastSkip={by:id,skipped,at:now,serial:++g.serial};nextTurn(r,skipped,now);}
  else nextTurn(r,id,now);
 }else nextTurn(r,id,now);
}
export function passPA(r:RoomState,id:string,now=Date.now(),manual=true){
 const g=r.pa!;if(!g||g.stage!=='play'||g.turn!==id)throw Error('Not your turn.');
 if(manual)ensureUnblocked(g,id);
 if(!g.pile.length)throw Error('You must lead when the pile is empty.');
 if(manual&&!isBot(r,id)&&r.paSettings!.mode==='asshole')(g.drinking[id]??=[]).push('Pass = Drink');
 g.passed=uniq([...g.passed,id]);
 const others=g.active.filter(x=>!g.finished.includes(x)&&x!==g.pileOwner);
 if(others.every(x=>g.passed.includes(x))){const leader=g.pileOwner!;clear(g,leader,'Everyone passed',now);g.turnEndsAt=now+r.paSettings!.turnSeconds*1000;}
 else nextTurn(r,id,now);
}
export function acknowledgePA(r:RoomState,id:string){requirePlayer(r,id);if(!r.pa)throw Error('Not in game');r.pa.drinking[id]=[];}
export function exchangePA(r:RoomState,id:string,cards:PACard[],now=Date.now()){
 const g=r.pa!;if(!g||g.stage!=='exchange')throw Error('No exchange in progress.');ensureUnblocked(g,id);
 const e=g.exchange.find(e=>e.upper===id);if(!e)throw Error('No exchange assigned to you.');
 if(e.selected)throw Error('Exchange already confirmed.');
 if(!Array.isArray(cards)||cards.length!==e.count||uniq(cards).length!==cards.length||cards.some(c=>!e.original.includes(c)))throw Error(`Select ${e.count} cards from your original dealt hand.`);
 e.selected=[...cards];if(g.exchange.every(ex=>ex.selected))commitExchanges(r,now);
}
function commitExchanges(r:RoomState,now:number){
 const g=r.pa!;for(const e of g.exchange){
  const toUpper=[...g.hands[e.lower]].sort((a,b)=>order(b)-order(a)).slice(0,e.count);
  const fromUpper=e.selected??[...e.original].sort((a,b)=>order(a)-order(b)).slice(0,e.count);
  g.hands[e.upper]=g.hands[e.upper].filter(c=>!fromUpper.includes(c)).concat(toUpper);
  g.hands[e.lower]=g.hands[e.lower].filter(c=>!toUpper.includes(c)).concat(fromUpper);
 }
 g.stage='play';g.stageEndsAt=undefined;g.turnEndsAt=now+r.paSettings!.turnSeconds*1000;g.event='Card exchange complete';
}
function countSlots(g:PAState){return g.decrees.length;}
function eligible(g:PAState,a:PADecreeAction){
 if(!Object.hasOwn(PA_DECREE_NAMES,a.key)||!['enact','repeal'].includes(a.kind))return false;
 const d=decree(g,a.key);if(a.kind==='repeal')return Boolean(d);
 if(a.key==='card_exchange'){
  const next=(d?.value??0)+1;if(next>2)return false;
  return Boolean(d)||(countSlots(g)<(decree(g,'max_active')?.value??Infinity));
 }
 if(a.key==='max_active'){if(!Number.isInteger(a.value)||a.value!<1||a.value!>10)return false;return !d||a.value!==d.value;}
 if(d)return false;
 return countSlots(g)<(decree(g,'max_active')?.value??Infinity);
}
function apply(r:RoomState,a:PADecreeAction){
 const g=r.pa!,old=decree(g,a.key);if(!eligible(g,a))throw Error('That decree change is not eligible.');
 if(a.kind==='repeal'){
  if(a.key==='card_exchange'&&old?.value===2){old.value=1;return;}
  g.decrees=g.decrees.filter(x=>x.key!==a.key);return;
 }
 if(old){if(a.key==='card_exchange')old.value=(old.value??0)+1;else if(a.key==='max_active')old.value=a.value;else throw Error('This decree is already active.');return;}
 const d={key:a.key,value:a.key==='card_exchange'?1:a.key==='max_active'?a.value:undefined,expiresBefore:has(g,'term_limits')?g.handNumber+1+r.paSettings!.termDuration:undefined};
 g.decrees.push(d);
 if(a.key==='term_limits'){
  const expire=g.handNumber+1+r.paSettings!.termDuration;
  for(const item of g.decrees)item.expiresBefore=item.key==='term_limits'&&!r.paSettings!.termSelfExpires?undefined:expire;
 }
}
function afterDecision(r:RoomState){setReady(r);}
export function decreePA(r:RoomState,id:string,a?:PADecreeAction,nominees?:PADecreeAction[],now=Date.now()){
 const g=r.pa!;if(!g||g.stage!=='decree'||g.pendingPresident!==id)throw Error('Only the current President may decide.');ensureUnblocked(g,id);
 const checkDrinking=(change:PADecreeAction)=>{if(r.paSettings!.mode==='president'&&change.kind==='enact'&&['drink_twos','require_ack'].includes(change.key))throw Error('Drinking decrees require Asshole mode.');};
 if(a)checkDrinking(a);if(nominees)for(const proposed of nominees)checkDrinking(proposed);
 if(nominees){
  if(!has(g,'democracy'))throw Error('Democracy is not active.');
  if(nominees.length<1||nominees.length>3||nominees.some(x=>!eligible(g,x))||uniq(nominees.map(x=>JSON.stringify(x))).length!==nominees.length)throw Error('Choose one to three eligible proposals.');
  if(nominees.length===1){const eligibleCount=(Object.keys(PA_DECREE_NAMES) as PADecreeKey[]).reduce((sum,key)=>sum+(['max_active'].includes(key)?Array.from({length:10},(_,i)=>({kind:'enact' as const,key,value:i+1})).filter(a=>eligible(g,a)).length:0)+(['card_exchange'].includes(key)||key!=='max_active'?(eligible(g,{kind:'enact',key})?1:0):0)+(eligible(g,{kind:'repeal',key})?1:0),0);if(eligibleCount>1)throw Error('Democracy requires two or three proposals when multiple options are eligible.');apply(r,nominees[0]);afterDecision(r);return;}
  g.vote={proposals:nominees,votes:{},deadline:now+r.paSettings!.voteSeconds*1000};g.stage='vote';g.stageEndsAt=g.vote.deadline;return;
 }
 if(a)apply(r,a);afterDecision(r);
}
function resolveVote(r:RoomState,now:number){
 const g=r.pa!,vote=g.vote!;const tally=vote.proposals.map((_,i)=>Object.values(vote.votes).filter(v=>v===i).length);
 const top=Math.max(...tally);const ties=tally.map((v,i)=>v===top?i:-1).filter(i=>i>=0);
 if(ties.length===1){apply(r,vote.proposals[ties[0]]);afterDecision(r);return;}
 const president=player(r,g.pendingPresident??'');if(!president){const i=ties[randomInt(ties.length)];apply(r,vote.proposals[i]);afterDecision(r);return;}
 vote.tieIndices=ties;vote.deadline=now+r.paSettings!.decreeSeconds*1000;g.stageEndsAt=vote.deadline;
}
export function votePA(r:RoomState,id:string,index:number,now=Date.now()){
 const g=r.pa!;requirePlayer(r,id);if(!g||g.stage!=='vote'||!g.vote)throw Error('Voting is closed.');ensureUnblocked(g,id);
 if(g.vote.tieIndices){if(id!==g.pendingPresident||!g.vote.tieIndices.includes(index))throw Error('President must break the tie.');apply(r,g.vote.proposals[index]);afterDecision(r);return;}
 if(!Number.isInteger(index)||index<0||index>=g.vote.proposals.length)throw Error('Invalid vote.');
 if(g.vote.votes[id]!==undefined)throw Error('Vote already submitted.');
 g.vote.votes[id]=index;
 const voters=current(r).map(p=>p.id);if(voters.every(x=>g.vote!.votes[x]!==undefined))resolveVote(r,now);
}
export function departPA(r:RoomState,id:string,now=Date.now()){
 const g=r.pa;if(!g)return;
 g.ready=g.ready.filter(x=>x!==id);g.departed=uniq([...g.departed,id]);
 if(g.stage==='exchange'){g.exchange=g.exchange.filter(x=>x.upper!==id&&x.lower!==id);g.active=g.active.filter(x=>x!==id);delete g.hands[id];if(g.turn===id)chooseLead(g,nextIn(g,id,[],activeDirection(g)));if(!g.exchange.length||g.exchange.every(x=>x.selected))commitExchanges(r,now);}
 if(g.stage==='play'){
  g.active=g.active.filter(x=>x!==id);delete g.hands[id];g.passed=g.passed.filter(x=>x!==id);if(g.turn===id){if(g.pileOwner===id)clear(g,id,'Player left',now);else nextTurn(r,id,now);}
  endHand(r,now);
 }
 if(g.stage==='decree'&&g.pendingPresident===id)afterDecision(r);
 if(g.stage==='vote'&&g.vote?.tieIndices&&g.pendingPresident===id){const ties=g.vote.tieIndices;apply(r,g.vote.proposals[ties[randomInt(ties.length)]]);afterDecision(r);}
}
/** Find one autonomous bot action. A single delayed action runs per DB transaction.
 * This keeps bot play observable and prevents unbounded AI loops after restarts. */
function botTask(r:RoomState):{key:string;delay:number;run:(now:number)=>void}|undefined{
 const g=r.pa;if(!g||!(g.bots??[]).length)return;
 if(g.stage==='play'){
  if(r.paSettings!.social&&g.lastPlay&&g.lastPlay.rank!==12){
   const last=g.lastPlay;
   for(const b of g.bots){
    if(!g.active.includes(b.id)||g.finished.includes(b.id)||b.id===last.player)continue;
    const matching=(g.hands[b.id]??[]).filter(c=>order(c)===last.rank);
    if(matching.length>=4-last.count){
     const cards=matching.slice(0,4-last.count);
     return {key:`social:${last.serial}:${b.id}`,delay:500,run:now=>playPA(r,b.id,cards,now,true,true)};
    }
   }
  }
  if(g.turn&&isBot(r,g.turn)){
   const id=g.turn;
   return {key:`play:${id}:${g.serial}`,delay:850,run:now=>{
    const cards=botPlay(r,id);
    if(cards)playPA(r,id,cards,now,false,true);
    else if(g.pile.length)passPA(r,id,now,false);
    else {const first=g.hands[id]?.[0];if(first)playPA(r,id,[first],now,false,true);}
   }};
  }
 }
 if(g.stage==='decree'&&g.pendingPresident&&isBot(r,g.pendingPresident)){
  const id=g.pendingPresident;
  return {key:`decree:${id}:${g.handNumber}`,delay:650,run:now=>{
   const choices=botDecreeChoices(r);
   if(has(g,'democracy')&&choices.length>1)decreePA(r,id,undefined,choices.slice(0,Math.min(3,choices.length)),now);
   else if(has(g,'democracy')&&choices.length===1)decreePA(r,id,undefined,choices,now);
   else decreePA(r,id,choices[0],undefined,now);
  }};
 }
 if(g.stage==='vote'&&g.vote){
  const vote=g.vote;
  if(vote.tieIndices?.length&&g.pendingPresident&&isBot(r,g.pendingPresident)){
   const id=g.pendingPresident;
   return {key:`vote-tie:${id}:${vote.deadline}`,delay:450,run:now=>votePA(r,id,vote.tieIndices![0],now)};
  }
  if(!vote.tieIndices){
   const bot=g.bots.find(b=>!Object.hasOwn(vote.votes,b.id));
   if(bot)return {key:`vote:${bot.id}:${vote.deadline}`,delay:550,run:now=>votePA(r,bot.id,0,now)};
  }
 }
 return;
}
/** True when a bot needs to be scheduled or its decision deadline has arrived. */
export function botDuePA(r:RoomState,now=Date.now()){
 const task=botTask(r),g=r.pa;
 return Boolean(task&&g&&(g.botActionKey!==task.key||g.botActionAt===undefined||g.botActionAt<=now));
}
function botDecreeChoices(r:RoomState):PADecreeAction[]{
 const g=r.pa!;
 const priority:PADecreeKey[]=['card_exchange','rank_seating','double_trouble','reverse_play','reverse_deal','unequal_burden','democracy','term_limits','max_active','drink_twos','require_ack'];
 const options:PADecreeAction[]=[];
 for(const key of priority){
  if(r.paSettings!.mode==='president'&&['drink_twos','require_ack'].includes(key))continue;
  const active=decree(g,key);
  const next:PADecreeAction={kind:'enact',key,...(key==='max_active'?{value:8}:{})};
  if(eligible(g,next))options.push(next);
  else if(active&&eligible(g,{kind:'repeal',key}))options.push({kind:'repeal',key});
 }
 return options;
}
function botPlay(r:RoomState,id:string):PACard[]|undefined{
 const g=r.pa!,cards=g.hands[id]??[];if(!cards.length)return;
 const groups=RANKS.map((_,rank)=>cards.filter(c=>order(c)===rank));
 if(g.handNumber===1&&!g.lastPlay&&!g.pile.length&&!g.lastClear){
  const opener=r.paSettings!.openingCard;return groups[order(opener)].includes(opener)?[opener]:[cards[0]];
 }
 if(!g.pile.length){
  // Prefer shedding a natural group. Save 2s unless they are all the bot has.
  const candidates=groups.map((group,rank)=>({group,rank})).filter(x=>x.group.length&&x.rank!==12);
  if(candidates.length){candidates.sort((a,b)=>b.group.length-a.group.length||a.rank-b.rank);return candidates[0].group;}
  return groups[12];
 }
 const needed=g.lastPlay?.count??1,rank=g.pileRank??-1;
 const normal=groups.map((group,i)=>({group,i})).filter(x=>x.i!==12&&x.i>=rank&&x.group.length>=needed);
 if(normal.length){normal.sort((a,b)=>a.i-b.i);return normal[0].group.slice(0,needed);}
 // Special clears can override combination size and ranking.
 const four=groups.find(x=>x.length===4);if(four)return four;
 if(has(g,'double_trouble')&&groups[0].length>=2)return groups[0].slice(0,2);
 if(groups[12].length)return groups[12].slice(0,1);
 return;
}
export function advancePA(r:RoomState,now=Date.now()){
 const g=r.pa;if(!g)return;repairPAController(r,now);maybeStart(r,now);
 // Multiple phase boundaries may be overdue after restart; bounded for safety.
 for(let n=0;n<10;n++){
  if(g.stage==='play'&&g.turnEndsAt!==undefined&&g.turnEndsAt<=now){
   const when=g.turnEndsAt;const id=g.turn!;
   if(!g.pile.length){const legal=g.hands[id]??[];if(legal.length){const chosen=g.handNumber===1&&!g.lastPlay&&!g.lastClear?legal.find(c=>c===r.paSettings!.openingCard)??legal[0]:legal[0];playPA(r,id,[chosen],when,false,true);continue;}}
   else{passPA(r,id,when,false);continue;}
  }
  if(g.stage==='exchange'&&g.stageEndsAt!==undefined&&g.stageEndsAt<=now){commitExchanges(r,g.stageEndsAt);continue;}
  if(g.stage==='decree'&&g.stageEndsAt!==undefined&&g.stageEndsAt<=now){afterDecision(r);continue;}
  if(g.stage==='vote'&&g.stageEndsAt!==undefined&&g.stageEndsAt<=now){
   if(g.vote?.tieIndices){const tie=g.vote.tieIndices;apply(r,g.vote.proposals[tie[randomInt(tie.length)]]);afterDecision(r);}
   else resolveVote(r,now);continue;
  }
  const task=botTask(r);
  if(!task){g.botActionKey=undefined;g.botActionAt=undefined;break;}
  if(g.botActionKey!==task.key||g.botActionAt===undefined){g.botActionKey=task.key;g.botActionAt=now+task.delay;break;}
  if(g.botActionAt>now)break;
  g.botActionKey=undefined;g.botActionAt=undefined;
  task.run(now);
  // One action per transaction; next bot will be scheduled on a future tick.
  break;
 }
}
export function endPA(r:RoomState,id:string){
 if(r.primaryId!==id)throw Error('Only the Primary Controller may end the game.');
 if(current(r).length>=4)throw Error('End Game is available only with fewer than four players.');
 if(!r.pa||r.pa.stage!=='ready')throw Error('Finish the current hand first.');
 r.pa.stage='ended';r.pa.event='Game ended';r.status='results';
}
export function publicPA(r:RoomState,me:Participant):PAPublic|undefined{
 const g=r.pa;if(!g)return;const host=me.role==='host',myId=me.id;
 const joined=current(r).map(p=>p.id);const seats=uniq([...g.seats.filter(id=>joined.includes(id)),...joined]);
 const exchange=g.exchange.find(e=>e.upper===myId);
 return {stage:g.stage,handNumber:g.handNumber,seats:seats.map(id=>({id,name:g.names[id]??player(r,id)?.name??'Player',cards:g.hands[id]?.length??0,position:g.previousRanks.find(x=>x.id===id)?.position,online:player(r,id)?.online??false,ready:isBot(r,id)||g.ready.includes(id),bot:isBot(r,id),nextHand:g.stage!=='ready'&&!g.active.includes(id)})),
  currentPlayerId:g.turn,turnEndsAt:g.turnEndsAt,stageEndsAt:g.stageEndsAt,
  pile:host?[...g.pile]:undefined,pileOwner:host?g.pileOwner:undefined,lastClear:host?g.lastClear:undefined,lastSkip:g.lastSkip,event:g.event,
  activeDecrees:g.decrees,handRanks:g.handRanks,previousRanks:g.previousRanks,
  myHand:!host?[...(g.hands[myId]??[])].sort((a,b)=>order(a)-order(b)):undefined,myReady:g.ready.includes(myId),inHand:g.active.includes(myId),myFinished:g.finished.includes(myId),
  myExchange:!host&&exchange?{count:exchange.count,original:exchange.original,selected:exchange.selected}:undefined,
  myPendingDrinks:!host?(g.drinking[myId]??[]):undefined,
  canSocial:!host&&r.paSettings!.social&&Boolean(g.lastPlay&&g.lastPlay.player!==myId&&g.lastPlay.rank!==12),
  socialRequirement:!host&&r.paSettings!.social&&g.lastPlay&&g.lastPlay.player!==myId&&g.lastPlay.rank!==12?{rank:RANKS[g.lastPlay.rank],count:4-g.lastPlay.count}:undefined,
  canPlay:!host&&g.turn===myId,isPresident:!host&&g.pendingPresident===myId,
  vote:g.vote?{proposals:g.vote.proposals,votesCast:Object.keys(g.vote.votes).length,myVote:!host?g.vote.votes[myId]:undefined,deadline:g.vote.deadline,tieIndices:g.vote.tieIndices}:undefined,
  presidencies:g.presidencies,longestStreak:g.longestStreak,names:g.names,decreeActionsRemaining:g.decreeActionsRemaining};
}
