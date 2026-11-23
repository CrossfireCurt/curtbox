import test from 'node:test';
import assert from 'node:assert/strict';
import {createPA,configurePA,botDuePA,repairPAController,readyPA,playPA,passPA,exchangePA,decreePA,votePA,advancePA,departPA,publicPA} from '../src/president.js';
import type {RoomState,Participant} from '../../shared/types.js';
import {createParticipant} from '../src/core.js';

function fixture(){
 const r={code:'TEST',gameId:'president-asshole',status:'lobby',participants:[],settings:{rating:'family',pace:'normal',finale:'showdown'},createdAt:0,updatedAt:0,creatorId:'host',matchHistory:[],reactionLastAt:{},questionHistory:[]} as unknown as RoomState;
 createPA(r);
 for(let i=1;i<=4;i++){const p={id:`p${i}`,token:`token${i}`,name:`Player ${i}`,role:'player',joinedAt:i,online:true,granted:false} as Participant;r.participants.push(p);}
 return r;
}
const lead=(r:RoomState)=>r.pa!.turn!;
const setDecree=(r:RoomState,key:import('../../shared/president.js').PADecreeKey,value?:number)=>r.pa!.decrees.push({key,value});

test('4 players ready, all 52 cards dealt, private snapshots',()=>{
 const r=fixture();for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 assert.equal(r.pa!.stage,'play');assert.equal(r.pa!.handNumber,1);
 assert.equal(Object.values(r.pa!.hands).flat().length,52);
 assert.equal(new Set(Object.values(r.pa!.hands).flat()).size,52);
 assert.ok(r.pa!.hands[lead(r)].includes('4C'));
 const host={id:'host',role:'host'} as Participant;
 assert.equal(publicPA(r,host)?.myHand,undefined);
 assert.equal(publicPA(r,r.participants[0])?.pile,undefined);
 assert.equal(publicPA(r,r.participants[0])?.myHand?.length,13);
});

test('opening card is mandatory, two clears and passes cannot start a new empty pile',()=>{
 const r=fixture();for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 const p=lead(r);const cards=r.pa!.hands[p];
 assert.throws(()=>playPA(r,p,[cards.find(c=>c!=='4C')!],1001),/Opening play/);
 playPA(r,p,['4C'],1001);assert.equal(r.pa!.pile.length,1);
 const next=lead(r); // turn advanced
 const two=r.pa!.hands[next].find(c=>c.startsWith('2'));
 if(two){playPA(r,next,[two],1002);assert.equal(r.pa!.pile.length,0);assert.equal(r.pa!.lastClear?.reason,'Special clear');}
});

test('Term Limits retroactive 3 complete hands, repeal preserves countdowns',()=>{
 const r=fixture(),g=r.pa!;g.handNumber=5;g.stage='decree';g.pendingPresident='p1';g.decrees=[{key:'rank_seating'}];
 r.paSettings!.termDuration=3;
 decreePA(r,'p1',{kind:'enact',key:'term_limits'},undefined,100);
 assert.equal(g.decrees.find(d=>d.key==='rank_seating')?.expiresBefore,9);
 assert.equal(g.decrees.find(d=>d.key==='term_limits')?.expiresBefore,undefined);
 g.stage='decree';g.pendingPresident='p1';decreePA(r,'p1',{kind:'repeal',key:'term_limits'},undefined,100);
 assert.equal(g.decrees.find(d=>d.key==='rank_seating')?.expiresBefore,9);
 g.handNumber=8;g.stage='ready';g.ready=['p1','p2','p3','p4'];
 advancePA(r,101);
 assert.equal(g.handNumber,9);assert.equal(g.decrees.some(d=>d.key==='rank_seating'),false);
});

test('exchange is one decree: staged level, original-only restrictions and correct transfers',()=>{
 const r=fixture();const g=r.pa!;g.handNumber=1;g.previousRanks=[1,2,3,4].map(i=>({id:`p${i}`,name:`Player ${i}`,position:i}));setDecree(r,'card_exchange',2);
 g.ready=['p1','p2','p3','p4'];advancePA(r,200);
 assert.equal(g.stage,'exchange');assert.equal(g.exchange.length,2);
 const {upper,lower,count,original}=g.exchange[0];
 const beforeUpper=[...g.hands[upper]],beforeLower=[...g.hands[lower]];
 const selected=original.slice(0,count);
 exchangePA(r,upper,selected,201);
 assert.ok(g.exchange[0].selected);
 assert.throws(()=>exchangePA(r,upper,[...selected]),/already confirmed/);
 const second=g.exchange[1];exchangePA(r,second.upper,second.original.slice(0,second.count),201);
 assert.equal(g.stage,'play');assert.equal(g.hands[upper].length,beforeUpper.length);
 assert.equal(g.hands[lower].length,beforeLower.length);
 assert.ok(selected.every(c=>g.hands[lower].includes(c)));
});

test('decree capacity counts self, lowering cap does not repeal old decrees',()=>{
 const r=fixture();const g=r.pa!;g.handNumber=3;g.stage='decree';g.pendingPresident='p1';
 g.decrees=[{key:'rank_seating'},{key:'reverse_deal'},{key:'double_trouble'},{key:'term_limits'}];
 decreePA(r,'p1',{kind:'enact',key:'max_active',value:2});
 assert.equal(g.decrees.length,5);
 g.stage='decree';g.pendingPresident='p1';assert.throws(()=>decreePA(r,'p1',{kind:'enact',key:'reverse_play'}),/eligible/);
});

test('Social can complete matching latest rank out of turn and clear',()=>{
 const r=fixture();r.paSettings!.social=true;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 // Construct a controlled scenario with four same-rank cards spread between players.
 const g=r.pa!,p='p1',q='p2';g.stage='play';g.turn=p;g.hands[p]=['7C'];g.hands[q]=['7D','7H','7S'];g.active=['p1','p2','p3','p4'];g.pile=[];g.lastClear={by:p,cards:[],reason:'prior',at:0,serial:0};
 playPA(r,p,['7C'],1001);
 playPA(r,q,['7D','7H','7S'],1002,true);
 assert.equal(g.lastClear?.reason,'Social');assert.equal(g.pile.length,0);
});

test('Democracy tie-breaker and all-abstain are handled server-side',()=>{
 const r=fixture(),g=r.pa!;g.handNumber=4;g.stage='decree';g.pendingPresident='p1';g.decrees=[{key:'democracy'}];
 decreePA(r,'p1',undefined,[{kind:'enact',key:'reverse_deal'},{kind:'enact',key:'rank_seating'}],100);
 assert.equal(g.stage,'vote');
 votePA(r,'p1',0,101);votePA(r,'p2',1,102);votePA(r,'p3',0,103);votePA(r,'p4',1,104);
 assert.deepEqual(g.vote?.tieIndices,[0,1]);votePA(r,'p1',1,105);
 assert.equal(g.stage,'ready');assert.ok(g.decrees.some(d=>d.key==='rank_seating'));
});

test('a departed ranked player does not cause a different person to be exchanged',()=>{
 const r=fixture();const g=r.pa!;g.handNumber=1;g.previousRanks=[1,2,3,4].map(i=>({id:`p${i}`,name:`Player ${i}`,position:i}));setDecree(r,'card_exchange',2);
 r.participants=r.participants.filter(p=>p.id!=='p4');r.participants.push({id:'p5',name:'New player',role:'player',token:'newtoken',online:true,joinedAt:7,granted:false} as Participant);
 g.ready=['p1','p2','p3','p5'];advancePA(r,100);
 assert.equal(g.stage,'exchange');assert.equal(g.exchange.length,1);
 assert.equal(g.exchange[0].upper,'p2');assert.equal(g.exchange[0].lower,'p3');
 assert.equal(g.turn,'p3'); // prior lowest-ranked present, NOT the newcomer
});

test('leaving during exchange removes the player and their cards without a ghost turn',()=>{
 const r=fixture(),g=r.pa!;g.handNumber=1;g.previousRanks=[1,2,3,4].map(i=>({id:`p${i}`,name:`Player ${i}`,position:i}));setDecree(r,'card_exchange',1);
 g.ready=['p1','p2','p3','p4'];advancePA(r,100);
 assert.equal(g.stage,'exchange');departPA(r,'p4',101);
 assert.equal(g.stage,'play');assert.ok(!g.active.includes('p4'));assert.equal(g.hands['p4'],undefined);
 assert.ok(g.turn!=='p4');
});

test('time-out pass is not drinking, manual pass is; acknowledgment gating applies',()=>{
 const r=fixture(),g=r.pa!;r.paSettings!.mode='asshole';for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 let p=g.turn!;playPA(r,p,['4C'],1001);
 let next=g.turn!;passPA(r,next,1002,true);
 assert.deepEqual(g.drinking[next],['Pass = Drink']);
 next=g.turn!;const when=g.turnEndsAt!;advancePA(r,when+1);
 assert.equal(g.drinking[next],undefined);
 g.stage='decree';g.pendingPresident='p1';setDecree(r,'require_ack');g.drinking['p1']=['Drink prompt'];
 assert.throws(()=>decreePA(r,'p1',undefined,undefined,when+2),/Acknowledge/);
});

test('turn timeout when leading auto-plays rather than passing an empty pile',()=>{
 const r=fixture(),g=r.pa!;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 const first=g.turn!;const expires=g.turnEndsAt!;advancePA(r,expires+1);
 assert.equal(g.pile.length,1);assert.ok(g.hands[first].length===12);
});

test('rank completion awards exactly one presidency and scores streaks',()=>{
 const r=fixture(),g=r.pa!;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 const ids=g.active.slice();g.stage='play';g.finished=['p1','p2'];
 for(const id of ids)g.hands[id]=id==='p3'?['9S']:['10S'];
 g.turn='p3';g.pile=[];g.lastClear={by:'p3',cards:[],reason:'forced',at:1000,serial:0};
 playPA(r,'p3',['9S'],2000);
 assert.equal(g.stage,'ready');assert.deepEqual(g.handRanks.map(x=>x.id),['p1','p2','p3','p4']);
 assert.equal(g.presidencies['p1'],1);assert.equal(g.streaks['p1'],1);
});

test('all action deadlines and maximum active cap honor the limit, including self',()=>{
 const r=fixture(),g=r.pa!;g.handNumber=5;g.stage='decree';g.pendingPresident='p1';g.decrees=[{key:'max_active',value:1}];
 assert.throws(()=>decreePA(r,'p1',{kind:'enact',key:'rank_seating'}),/eligible/);
 decreePA(r,'p1',{kind:'repeal',key:'max_active'});
 assert.equal(g.decrees.length,0);
});

test('equal-rank response clears; mismatched combination size is rejected',()=>{
 const r=fixture(),g=r.pa!;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 const p=g.turn!,q=g.seats[(g.seats.indexOf(p)+1)%4];
 g.hands[p]=['6C','6D'];g.hands[q]=['6H','6S','7H'];
 g.turn=p;g.pile=[];g.lastClear={by:p,cards:[],reason:'setup',at:0,serial:0};
 playPA(r,p,['6C','6D'],2000);
 assert.equal(g.turn,q);
 assert.throws(()=>playPA(r,q,['7H'],2001),/Match the number/);
 playPA(r,q,['6H','6S'],2002);
 assert.equal(g.lastClear?.reason,'Equal rank');assert.equal(g.pile.length,0);
});

test('Term Limits with host-configured self-expiration expires all targets before hand 9',()=>{
 const r=fixture(),g=r.pa!;g.handNumber=5;g.stage='decree';g.pendingPresident='p1';r.paSettings!.termDuration=3;r.paSettings!.termSelfExpires=true;
 g.decrees=[{key:'reverse_play'}];decreePA(r,'p1',{kind:'enact',key:'term_limits'});
 assert.equal(g.decrees.find(d=>d.key==='term_limits')?.expiresBefore,9);
 assert.equal(g.decrees.find(d=>d.key==='reverse_play')?.expiresBefore,9);
 g.handNumber=8;g.ready=['p1','p2','p3','p4'];advancePA(r,100);
 assert.equal(g.handNumber,9);assert.equal(g.decrees.length,0);
});

test('new decree after repeal of Term Limits stays permanent; previous countdown survives',()=>{
 const r=fixture(),g=r.pa!;g.handNumber=5;g.stage='decree';g.pendingPresident='p1';r.paSettings!.termDuration=3;
 g.decrees=[{key:'rank_seating'}];decreePA(r,'p1',{kind:'enact',key:'term_limits'});
 g.stage='decree';g.pendingPresident='p1';decreePA(r,'p1',{kind:'repeal',key:'term_limits'});
 g.stage='decree';g.pendingPresident='p1';decreePA(r,'p1',{kind:'enact',key:'reverse_play'});
 assert.equal(g.decrees.find(d=>d.key==='rank_seating')?.expiresBefore,9);
 assert.equal(g.decrees.find(d=>d.key==='reverse_play')?.expiresBefore,undefined);
});

test('midhand joiner is not dealt until next hand, and remains visible on Host',()=>{
 const r=fixture(),g=r.pa!;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 const newcomer={id:'p5',name:'New player',role:'player',token:'newtoken',online:true,joinedAt:1001,granted:false} as Participant;
 r.participants.push(newcomer);
 assert.equal(g.hands['p5'],undefined);assert.equal(publicPA(r,newcomer)?.inHand,false);
 const guest=publicPA(r,{id:'host',role:'host'} as Participant)?.seats.find(x=>x.id==='p5');
 assert.equal(guest?.nextHand,true);
});

test('all cards remain unique after simultaneous ranked pair exchanges',()=>{
 const r=fixture(),g=r.pa!;g.handNumber=1;g.previousRanks=[1,2,3,4].map(i=>({id:`p${i}`,name:`Player ${i}`,position:i}));setDecree(r,'card_exchange',2);
 g.ready=['p1','p2','p3','p4'];advancePA(r,100);
 for(const e of g.exchange)exchangePA(r,e.upper,e.original.slice(0,e.count),101);
 assert.equal(Object.values(g.hands).flat().length,52);
 assert.equal(new Set(Object.values(g.hands).flat()).size,52);
});

test('host can configure 0–7 stable bot seats, and total capacity is enforced',()=>{
 const r=fixture();
 assert.equal(r.paSettings!.botCount,0);
 configurePA(r,{botCount:3});
 assert.equal(r.pa!.bots.length,3);
 assert.equal(r.pa!.bots[0].id,'pa-bot-1');
 assert.throws(()=>configurePA(r,{botCount:5}),/at most eight/);
 assert.throws(()=>configurePA(r,{botCount:-1}),/Bot count/);
 assert.throws(()=>configurePA(r,{botCount:8}),/Bot count/);
 configurePA(r,{botCount:1});
 assert.equal(r.pa!.bots.length,1);
 configurePA(r,{botCount:3});
 assert.deepEqual(r.pa!.bots.map(b=>b.id),['pa-bot-1','pa-bot-2','pa-bot-3']);
 assert.equal(r.participants.filter(p=>p.role==='player').length,4,'bots are not authenticated participants');
});

test('one human plus three bots begins a hand as soon as human readies',()=>{
 const r=fixture();r.participants=r.participants.slice(0,1);
 configurePA(r,{botCount:3});
 const botIds=r.pa!.bots.map(b=>b.id);
 assert.equal(r.pa!.stage,'ready');
 readyPA(r,'p1',true,1000);
 assert.equal(r.pa!.stage,'play');
 assert.equal(r.pa!.active.length,4);
 assert.ok(botIds.every(id=>r.pa!.active.includes(id)));
 assert.equal(Object.values(r.pa!.hands).flat().length,52);
 assert.equal(new Set(Object.values(r.pa!.hands).flat()).size,52);
 const snapshot=publicPA(r,r.participants[0])!;
 assert.equal(snapshot.seats.filter(p=>p.bot).length,3);
 assert.ok(snapshot.seats.filter(p=>p.bot).every(p=>p.ready&&p.online));
 assert.equal(snapshot.myHand?.length,13);
 assert.equal(snapshot.seats.find(p=>p.id===botIds[0])?.cards,13);
 assert.equal(snapshot.myHand?.some(c=>r.pa!.hands[botIds[0]].includes(c)),false);
});

test('bots cannot start a game without a human and count toward a room limit',()=>{
 const r=fixture();r.participants=[];
 configurePA(r,{botCount:7});
 advancePA(r,1000);
 assert.equal(r.pa!.stage,'ready');
 createParticipant(r,'player','Human',1001);
 assert.throws(()=>createParticipant(r,'player','Too many',1002),/limit reached/);
 readyPA(r,r.participants[0].id,true,1003);
 assert.equal(r.pa!.stage,'play');
 assert.equal(r.pa!.active.length,8);
});

test('bots act on a short server timer without needing a socket or client',()=>{
 const r=fixture();r.participants=r.participants.slice(0,1);
 configurePA(r,{botCount:3});readyPA(r,'p1',true,1000);
 const g=r.pa!,bot=g.bots[0].id;
 // Advance from a controlled existing pile with the bot scheduled to play.
 g.turn=bot;g.lastClear={by:bot,cards:[],at:999,reason:'fixture',serial:0};g.pile=[];g.pileRank=undefined;g.lastPlay=undefined;
 g.turnEndsAt=20000;g.botActionAt=undefined;g.botActionKey=undefined;
 assert.equal(botDuePA(r,2000),true);
 advancePA(r,2000);
 assert.equal(g.hands[bot].length,13);
 assert.ok(g.botActionAt!>2000);
 assert.equal(botDuePA(r,2200),false);
 advancePA(r,2850);
 assert.equal(g.hands[bot].length<13,true);
 assert.equal(g.pileOwner===bot||g.lastClear?.by===bot,true);
});

test('computer players automatically choose eligible original exchange cards',()=>{
 const r=fixture();r.participants=r.participants.slice(0,1);
 configurePA(r,{botCount:3});
 const g=r.pa!,bot1=g.bots[0].id,bot2=g.bots[1].id,bot3=g.bots[2].id;
 g.handNumber=1;
 g.previousRanks=[{id:bot1,name:g.names[bot1],position:1},{id:bot2,name:g.names[bot2],position:2},{id:'p1',name:'Human',position:3},{id:bot3,name:g.names[bot3],position:4}];
 setDecree(r,'card_exchange',2);
 readyPA(r,'p1',true,1000);
 assert.equal(g.stage,'play','bot-controlled exchanges must not block a hand');
 assert.equal(g.exchange.every(e=>e.selected?.length===e.count),true);
 assert.equal(new Set(Object.values(g.hands).flat()).size,52);
});

test('a computer President enacts a valid decree and bots cast Democracy votes',()=>{
 const r=fixture();r.participants=r.participants.slice(0,1);configurePA(r,{botCount:3});
 const g=r.pa!,president=g.bots[0].id;
 g.handNumber=2;g.stage='decree';g.pendingPresident=president;g.stageEndsAt=20000;
 advancePA(r,1000);assert.ok(g.botActionAt);
 advancePA(r,1650);
 assert.equal(g.stage,'ready');assert.equal(g.decrees[0].key,'card_exchange');
 g.stage='vote';g.pendingPresident='p1';
 g.vote={proposals:[{kind:'enact',key:'rank_seating'},{kind:'enact',key:'reverse_play'}],votes:{},deadline:20000};g.stageEndsAt=20000;
 advancePA(r,2000);
 advancePA(r,2550);
 assert.equal(Object.keys(g.vote!.votes).length,1);
 assert.ok(g.bots.some(b=>g.vote?.votes[b.id]!==undefined));
});

test('computer President breaks a tied Democracy vote without human intervention',()=>{
 const r=fixture();r.participants=r.participants.slice(0,1);configurePA(r,{botCount:3});
 const g=r.pa!,president=g.bots[0].id;
 g.handNumber=3;g.stage='vote';g.pendingPresident=president;
 g.vote={proposals:[{kind:'enact',key:'rank_seating'},{kind:'enact',key:'reverse_play'}],votes:{},tieIndices:[0,1],deadline:20000};g.stageEndsAt=20000;
 advancePA(r,1000);advancePA(r,1450);
 assert.equal(g.stage,'ready');assert.equal(g.decrees[0]?.key,'rank_seating');
});

test('bots are eligible to complete Social from their private hand',()=>{
 const r=fixture();r.participants=r.participants.slice(0,1);
 configurePA(r,{botCount:3});r.paSettings!.social=true;
 readyPA(r,'p1',true,1000);
 const g=r.pa!,bot=g.bots[0].id;
 g.hands[bot]=['7D','7H','7S','10C'];g.hands['p1']=['7C','8H'];g.turn='p1';
 g.lastClear={by:'p1',cards:[],reason:'fixture',at:990,serial:1};g.pile=[];
 playPA(r,'p1',['7C'],1100);
 assert.equal(botDuePA(r,1200),true);
 advancePA(r,1200);advancePA(r,1700);
 assert.equal(g.lastClear?.reason,'Social');assert.deepEqual(g.hands[bot],['10C']);
});

test('a human and three bots can complete a full hand without a bot client',()=>{
 const r=fixture();r.participants=r.participants.slice(0,1);
 configurePA(r,{botCount:3,turnSeconds:2,decreeSeconds:3,exchangeSeconds:3,voteSeconds:3});
 readyPA(r,'p1',true,1000);
 const g=r.pa!;
 let lastNow=1000;
 for(let now=1350;now<=650_000;now+=350){
  advancePA(r,now);lastNow=now;
  if(g.handNumber===1&&(g.stage==='ready'||g.stage==='decree'||g.stage==='vote'))break;
 }
 assert.equal(g.handNumber,1);
 assert.equal(g.handRanks.length,4,`hand stalled in ${g.stage} at virtual time ${lastNow}`);
 assert.equal(new Set(g.handRanks.map(x=>x.id)).size,4);
 assert.equal(g.presidencies[g.handRanks[0].id],1);
});

test('bots are never Primary Controller and cannot appear as authentication participants',()=>{
 const r=fixture();r.participants=[];configurePA(r,{botCount:4});
 repairPAController(r,1000,true);
 assert.equal(r.primaryId,undefined);
 assert.equal(r.participants.length,0);
 const human=createParticipant(r,'player','Human',1001);
 repairPAController(r,1001,true);
 assert.equal(r.primaryId,human.id);
 assert.equal(r.participants.length,1);
});

test('bot configuration rejects nonnumeric counts and human capacity remains protected',()=>{
 const r=fixture();
 assert.throws(()=>configurePA(r,{botCount:'3' as unknown as number}),/Bot count/);
 assert.throws(()=>configurePA(r,{botCount:1.5}),/Bot count/);
 assert.equal(r.paSettings!.botCount,0);
 configurePA(r,{botCount:4});
 assert.throws(()=>createParticipant(r,'player','One more'),/limit reached/);
 assert.equal(r.pa!.bots.length,4);
});

test('bots do not receive drink acknowledgments but their 2s can prompt humans',()=>{
 const r=fixture();r.participants=r.participants.slice(0,1);configurePA(r,{botCount:3});
 r.paSettings!.mode='asshole';readyPA(r,'p1',true,1000);
 const g=r.pa!,bot=g.bots[0].id;
 g.turn=bot;g.hands[bot]=['2C','9H'];g.stage='play';
 g.pile=['5C'];g.pileOwner='p1';g.pileRank=2;g.lastPlay={player:'p1',rank:2,count:1,cards:['5C'],serial:100};
 setDecree(r,'drink_twos');setDecree(r,'require_ack');
 playPA(r,bot,['2C'],1001,false,true);
 assert.equal(g.drinking[bot],undefined);
 assert.equal(g.drinking['p1']?.length,1);
 assert.match(g.drinking['p1'][0],/played a 2/);
});
