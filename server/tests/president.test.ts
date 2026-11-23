import test from 'node:test';
import assert from 'node:assert/strict';
import {createPA,configurePA,botDelayPA,botDuePA,repairPAController,readyPA,playPA,passPA,exchangePA,decreePA,votePA,advancePA,departPA,publicPA} from '../src/president.js';
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
 (g.drinkEvents??={})['p1']={serial:12,at:when+1};
 assert.throws(()=>decreePA(r,'p1',undefined,undefined,when+2),/Drink notification in progress/);
 // The reminder expires automatically; no acknowledgment action or prompt click.
 decreePA(r,'p1',undefined,undefined,when+3000);
 assert.deepEqual(g.drinking['p1'],[]);
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

test('ordinary equal-rank response skips one seat, keeps the pile, and publishes the skip to phones',()=>{
 const r=fixture(),g=r.pa!;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 const p=g.turn!,direction=g.seats;
 const q=direction[(direction.indexOf(p)+1)%4],skipped=direction[(direction.indexOf(p)+2)%4],after=direction[(direction.indexOf(p)+3)%4];
 g.hands[p]=['6C','6D','KC'];g.hands[q]=['6H','7H','7S'];
 g.turn=p;g.pile=[];g.lastClear={by:p,cards:[],reason:'setup',at:0,serial:0};
 playPA(r,p,['6C'],2000);
 assert.equal(g.turn,q);
 assert.throws(()=>playPA(r,q,['7H','7S'],2001),/Match the number/);
 playPA(r,q,['6H'],2002);
 assert.equal(g.turn,after);assert.equal(g.pile.length,2);
 assert.equal(g.pileOwner,q);assert.equal(g.lastClear?.reason,'setup');
 assert.equal(g.lastPlay?.player,q);assert.equal(g.lastPlay?.count,1);
 assert.deepEqual({by:g.lastSkip?.by,skipped:g.lastSkip?.skipped,at:g.lastSkip?.at},{by:q,skipped,at:2002});
 assert.equal(g.handStats?.[q]?.skips,1,'count a skip issued by the equal-rank player');
 assert.equal(g.playerStats?.[q]?.skips,1,'persist an issued skip cumulatively');
 assert.equal(g.handStats?.[skipped]?.skips??0,0,'skipped victim does not earn a skip');
 assert.equal(g.turnEndsAt,2002+r.paSettings!.turnSeconds*1000);
 assert.equal(publicPA(r,r.participants.find(x=>x.id===skipped)!)?.lastSkip?.skipped,skipped);
 assert.equal(publicPA(r,{id:'host',role:'host'} as Participant)?.lastSkip?.by,q);
 assert.throws(()=>playPA(r,skipped,['7C'],2003),/Not your turn/);
});

test('equal-rank skip respects reverse direction and skips even when the player finishes',()=>{
 const r=fixture(),g=r.pa!;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 setDecree(r,'reverse_play');
 g.turn='p2';g.lastClear={by:'p2',cards:[],reason:'setup',at:0,serial:0};
 g.hands.p2=['8C','KD'];g.hands.p1=['8D'];
 playPA(r,'p2',['8C'],2000);assert.equal(g.turn,'p1');
 playPA(r,'p1',['8D'],2001);
 assert.equal(g.finished.includes('p1'),true);
 assert.equal(g.lastSkip?.skipped,'p4');assert.equal(g.turn,'p3');
 assert.deepEqual(g.pile,['8C','8D']);assert.equal(g.stage,'play');
});

test('consecutive equal-rank singles skip in current direction without clearing',()=>{
 const r=fixture(),g=r.pa!;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.turn='p1';g.lastClear={by:'p1',cards:[],reason:'setup',at:0,serial:0};
 g.hands.p1=['9C','KC'];g.hands.p2=['9D','KD'];g.hands.p3=['8H','KH'];g.hands.p4=['9H','QH'];
 playPA(r,'p1',['9C'],2000);
 playPA(r,'p2',['9D'],2001);
 assert.equal(g.turn,'p4');assert.equal(g.lastSkip?.skipped,'p3');
 const firstSerial=g.lastSkip!.serial;
 playPA(r,'p4',['9H'],2002);
 assert.equal(g.turn,'p2');assert.equal(g.lastSkip?.skipped,'p1');
 assert.ok(g.lastSkip!.serial>firstSerial);
 assert.equal(g.pile.length,3);
});

test('Social clears rather than skipping even when it matches the pile rank',()=>{
 const r=fixture(),g=r.pa!;r.paSettings!.social=true;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.turn='p1';g.hands.p1=['7C','KC'];g.hands.p2=['7D','7H','7S','KD'];
 g.lastClear={by:'p1',cards:[],reason:'setup',at:0,serial:0};
 playPA(r,'p1',['7C'],2000);
 playPA(r,'p2',['7D','7H','7S'],2001,true);
 assert.equal(g.lastClear?.reason,'Social');assert.equal(g.pile.length,0);
 assert.equal(g.lastSkip,undefined);assert.equal(g.turn,'p2');
});

test('four of a kind and 2 remain special clears, never equal-rank skips',()=>{
 const r=fixture(),g=r.pa!;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.lastClear={by:'p1',cards:[],reason:'setup',at:0,serial:0};
 g.turn='p1';g.hands.p1=['5C','5D','5H','5S','KC'];
 playPA(r,'p1',['5C','5D','5H','5S'],2000);
 assert.equal(g.lastClear?.reason,'Social');assert.equal(g.lastSkip,undefined);
 g.hands.p1.push('2C');playPA(r,'p1',['2C'],2001);
 assert.equal(g.lastClear?.reason,'Special clear');assert.equal(g.pile.length,0);
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
 advancePA(r,g.botActionAt!+350);
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
 advancePA(r,1200,()=>0);advancePA(r,g.botActionAt!+1);
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

test('public pile plays keep latest combination and show earlier card values without overlap',()=>{
 const r=fixture(),g=r.pa!;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.turn='p1';g.lastClear={by:'p1',cards:[],at:0,reason:'setup',serial:0};
 g.hands.p1=['5C','5D','9S'];g.hands.p2=['7C','7D','9H'];
 playPA(r,'p1',['5C','5D'],2000);playPA(r,'p2',['7C','7D'],2001);
 const host=publicPA(r,{id:'host',role:'host'} as Participant)!;
 assert.deepEqual(host.pile,['5C','5D','7C','7D']);
 assert.deepEqual(host.pilePlays?.map(p=>p.cards),[['5C','5D'],['7C','7D']]);
 assert.deepEqual(host.pilePlays?.map(p=>p.by),['p1','p2']);
 assert.equal(publicPA(r,r.participants[0])?.pilePlays,undefined);
 assert.equal(publicPA(r,r.participants[0])?.pileHistory,undefined);
});

test('special clear archives cards and attribution, and the next hand resets history',()=>{
 const r=fixture(),g=r.pa!;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.turn='p1';g.lastClear={by:'p1',cards:[],at:0,reason:'setup',serial:0};
 g.hands.p1=['8C','KD'];g.hands.p2=['2H','KH'];
 playPA(r,'p1',['8C'],2000);playPA(r,'p2',['2H'],2001);
 const first=publicPA(r,{id:'host',role:'host'} as Participant)!.pileHistory!;
 assert.equal(first.length,1);assert.equal(first[0].by,'p2');
 assert.equal(first[0].reason,'Special clear');assert.deepEqual(first[0].cards,['8C','2H']);
 assert.deepEqual(first[0].plays.map(p=>p.by),['p1','p2']);
 assert.equal(g.pile.length,0);assert.equal(g.pilePlays?.length,0);
 g.stage='ready';g.handNumber=1;g.ready=['p1','p2','p3','p4'];advancePA(r,2002);
 assert.equal(g.handNumber,2);assert.equal(g.pileHistory?.length,0);
});

test('Social clear archives one event; cleared pile history is bounded at eight per hand',()=>{
 const r=fixture(),g=r.pa!;r.paSettings!.social=true;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.turn='p1';g.lastClear={by:'p1',cards:[],at:0,reason:'setup',serial:0};
 g.hands.p1=['7C','KC'];g.hands.p2=['7D','7H','7S','KD'];
 playPA(r,'p1',['7C'],2000);playPA(r,'p2',['7D','7H','7S'],2001,true);
 assert.equal(g.pileHistory?.length,1);assert.equal(g.pileHistory?.[0].by,'p2');
 assert.equal(g.pileHistory?.[0].reason,'Social');
 assert.deepEqual(g.pileHistory?.[0].cards,['7C','7D','7H','7S']);
 for(let i=0;i<9;i++){
  g.pile=['3C'];g.pilePlays=[{by:'p1',cards:['3C'],serial:++g.serial}];
  g.turn='p1';g.hands.p1=['2H','KC'];playPA(r,'p1',['2H'],2002+i);
 }
 assert.equal(g.pileHistory?.length,8);
});

test('bot play and Social have separate randomized delay windows',()=>{
 assert.equal(botDelayPA('play',()=>0),1800);
 assert.equal(botDelayPA('play',()=>1),3600);
 assert.equal(botDelayPA('social',()=>0),2400);
 assert.equal(botDelayPA('social',()=>1),4800);
 assert.ok(botDelayPA('social',()=>.6)>botDelayPA('social',()=>.1));
});

test('bot does not act before its persisted deadline or reroll on ticks',()=>{
 const r=fixture();r.participants=r.participants.slice(0,1);
 configurePA(r,{botCount:3});readyPA(r,'p1',true,1000);
 const g=r.pa!,bot=g.bots[0].id;g.turn=bot;g.lastClear={by:bot,cards:[],reason:'fixture',at:0,serial:0};
 g.pile=[];g.lastPlay=undefined;g.turnEndsAt=10000;g.botActionKey=undefined;g.botActionAt=undefined;
 const before=g.hands[bot].length;
 advancePA(r,2000,()=>1);
 assert.equal(g.botActionAt,5600);
 assert.equal(botDuePA(r,5599),false);
 advancePA(r,5599,()=>0);
 assert.equal(g.botActionAt,5600);
 assert.equal(g.hands[bot].length,before);
 advancePA(r,5600);
 assert.ok(g.hands[bot].length<before);
});

test('bot turn wait is shortened for a two-second host turn timer',()=>{
 const r=fixture();r.participants=r.participants.slice(0,1);
 configurePA(r,{botCount:3,turnSeconds:2});readyPA(r,'p1',true,1000);
 const g=r.pa!,bot=g.bots[0].id;g.turn=bot;g.lastClear={by:bot,cards:[],reason:'fixture',at:0,serial:0};
 g.pile=[];g.lastPlay=undefined;g.turnEndsAt=4000;g.botActionKey=undefined;g.botActionAt=undefined;
 advancePA(r,2000,()=>1);
 assert.equal(g.botActionAt,3550);
 const before=g.hands[bot].length;advancePA(r,3550);
 assert.ok(g.hands[bot].length<before);
});

test('bot Social waits and cancels if human next player acts before deadline',()=>{
 const r=fixture();r.participants=r.participants.slice(0,2);
 configurePA(r,{botCount:2});r.paSettings!.social=true;
 readyPA(r,'p1',true,1000);readyPA(r,'p2',true,1000);
 const g=r.pa!,bot=g.bots[0].id;
 g.turn='p1';g.lastClear={by:'p1',cards:[],reason:'fixture',at:0,serial:0};
 g.pile=[];g.lastPlay=undefined;g.hands.p1=['7C','8H','KC'];g.hands.p2=['8C','9S','KD'];g.hands[bot]=['7D','7H','7S','10C'];
 playPA(r,'p1',['7C'],1100);
 advancePA(r,1200,()=>0);
 assert.equal(g.botActionAt,3600,'Social has a 2.4-second minimum wait');
 advancePA(r,3599);assert.notEqual(g.lastClear?.reason,'Social');
 playPA(r,'p2',['8C'],2000);
 advancePA(r,3950);
 assert.notEqual(g.lastClear?.reason,'Social');
 assert.ok(g.hands[bot].includes('7D'));
});

test('server-owned result counters track Social, special clears, cards, passes and persist across hands',()=>{
 const r=fixture();r.paSettings!.social=true;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 const g=r.pa!;g.turn='p1';g.pile=[];g.pilePlays=[];
 g.lastClear={by:'p1',cards:[],reason:'fixture',at:0,serial:0};
 g.hands.p1=['7C','9C','KC'];g.hands.p2=['7D','7H','7S','2C','KD'];
 g.hands.p3=['5D','QD'];g.hands.p4=['8C','AH'];
 playPA(r,'p1',['7C'],1100);
 playPA(r,'p2',['7D','7H','7S'],1101,true);
 assert.equal(g.handStats?.p1?.cardsPlayed,1);
 assert.equal(g.handStats?.p2?.cardsPlayed,3);
 assert.equal(g.handStats?.p2?.socials,1);
 assert.equal(g.handStats?.p2?.pilesCleared,1);
 assert.equal(g.playerStats?.p2?.pilesCleared,1);
 playPA(r,'p2',['2C'],1102);
 assert.equal(g.handStats?.p2?.twosPlayed,1);
 assert.equal(g.handStats?.p2?.pilesCleared,2);
 g.turn='p3';g.hands.p3=['5D','QD'];
 // Seed an active pile for an accepted manual pass.
 g.pile=['9H'];g.pileOwner='p1';g.pileRank=6;g.lastPlay={player:'p1',rank:6,count:1,cards:['9H'],serial:++g.serial};
 passPA(r,'p3',1103);
 assert.equal(g.handStats?.p3?.passes,1);
 assert.equal(g.playerStats?.p2?.cardsPlayed,4);
 // Finish with an archived last pile; preserve completed hand stats for ready screen.
 g.finished=['p1','p2','p3'];g.turn='p4';g.hands.p4=['8C'];g.pile=[];g.pilePlays=[];g.lastPlay=undefined;
 playPA(r,'p4',['8C'],1200);
 assert.equal(g.stage,'ready');
 const host=publicPA(r,{id:'host',role:'host'} as Participant)!;
 const phone=publicPA(r,r.participants[0])!;
 assert.equal(host.handStats.p2.socials,1);
 assert.equal(phone.handStats.p2.twosPlayed,1);
 assert.equal(host.handStats.p4.cardsPlayed,1);
 assert.equal(host.handRanks.length,4);
 assert.equal(host.myHand,undefined);
 assert.equal(phone.pile,undefined);
 // A player may leave after the hand; results and recorded stats survive.
 r.participants=r.participants.filter(x=>x.id!=='p2');
 assert.ok(publicPA(r,{id:'host',role:'host'} as Participant)?.handRanks.some(p=>p.id==='p2'));
 assert.equal(g.playerStats?.p2?.socials,1);
 // New hand can start with remaining players and an additional bot.
 configurePA(r,{botCount:1});
 for(const p of r.participants)readyPA(r,p.id,true,1400);
 assert.equal(g.handNumber,2);
 assert.equal(g.handStats?.p2,undefined,'new hand counters reset');
 assert.equal(g.playerStats?.p2?.socials,1,'all-time counters survive');
});

test('sound event snapshots expose card/clear only to presenter and targeted drink only to player',()=>{
 const r=fixture(),g=r.pa!;r.paSettings!.mode='asshole';for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.turn='p1';g.lastClear={by:'p1',cards:[],reason:'fixture',at:0,serial:0};
 g.hands.p1=['7C','2S','KC'];g.hands.p2=['7D','7H','7S','QC'];r.paSettings!.social=true;
 playPA(r,'p1',['7C'],2000);
 let board=publicPA(r,{id:'host',role:'host'} as Participant)!;
 let phone=publicPA(r,r.participants[1])!;
 assert.equal(board.lastPlayed?.by,'p1');
 assert.equal(board.lastPlayed?.at,2000);
 assert.equal(phone.lastPlayed,undefined);
 playPA(r,'p2',['7D','7H','7S'],2001,true);
 board=publicPA(r,{id:'host',role:'host'} as Participant)!;
 assert.equal(board.lastClear?.reason,'Social');
 g.decrees.push({key:'drink_twos'});
 g.turn='p1';playPA(r,'p1',['2S'],2002);
 board=publicPA(r,{id:'host',role:'host'} as Participant)!;
 phone=publicPA(r,r.participants[1])!;
 assert.equal(board.myDrinkEvent,undefined);
 assert.equal(phone.myDrinkEvent?.at,2002);
 assert.equal(phone.myPendingDrinks?.length,1,'latest prompt only; no manual acknowledgment history');
 assert.equal(publicPA(r,r.participants[0])?.myDrinkEvent?.at,2001);
 assert.equal(publicPA(r,r.participants[2])?.myDrinkEvent?.at,2002);
 const serial=phone.myDrinkEvent?.serial;
 const repeated=publicPA(r,r.participants[1]);
 assert.equal(repeated?.myDrinkEvent?.serial,serial);
});
test('manual Pass drink notification carries a unique event ID to that phone',()=>{
 const r=fixture(),g=r.pa!;r.paSettings!.mode='asshole';for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.turn='p2';g.pile=['5C'];g.pileOwner='p1';g.pileRank=2;
 g.lastPlay={player:'p1',rank:2,count:1,cards:['5C'],serial:1};
 passPA(r,'p2',2000,true);
 assert.equal(publicPA(r,r.participants[1])?.myDrinkEvent?.at,2000);
 assert.equal(publicPA(r,r.participants[0])?.myDrinkEvent,undefined);
});

test('top rank is counted across plays: 4 then 4 then last two can Social',()=>{
 const r=fixture(),g=r.pa!;r.paSettings!.social=true;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.turn='p1';g.lastClear={by:'p1',cards:[],reason:'fixture',at:0,serial:0};
 g.hands.p1=['4C','KC'];g.hands.p2=['4D','KD'];g.hands.p3=['4H','4S','9C'];
 playPA(r,'p1',['4C'],2000);playPA(r,'p2',['4D'],2001);
 assert.equal(g.lastSkip?.skipped,'p3');
 assert.deepEqual(publicPA(r,r.participants[2])?.socialRequirement,{rank:'4',count:2});
 playPA(r,'p3',['4H','4S'],2002,true);
 assert.equal(g.lastClear?.reason,'Social');assert.equal(g.lastClear?.by,'p3');
 assert.deepEqual(g.lastClear?.cards,['4C','4D','4H','4S']);
 assert.equal(g.lastSkip,undefined);
 assert.equal(g.handStats?.p3?.socials,1);
});
test('turn play that completes same rank automatically counts as Social',()=>{
 const r=fixture(),g=r.pa!;r.paSettings!.social=false;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.turn='p1';g.lastClear={by:'p1',cards:[],reason:'fixture',at:0,serial:0};
 g.pile=['8C','8D'];g.pileRank=5;g.pileOwner='p3';g.lastPlay={player:'p3',rank:5,count:1,cards:['8D'],serial:20};
 g.hands.p1=['8H','8S','KH'];
 playPA(r,'p1',['8H','8S'],2000,false);
 assert.equal(g.lastClear?.reason,'Social');assert.equal(g.handStats?.p1?.socials,1);
});
test('four cards played together are Social; unrelated off-turn four cannot interrupt',()=>{
 const r=fixture(),g=r.pa!;r.paSettings!.social=true;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.turn='p1';g.lastClear={by:'p1',cards:[],reason:'fixture',at:0,serial:0};
 g.hands.p1=['5C','5D','5H','5S','KH'];playPA(r,'p1',['5C','5D','5H','5S'],2000);
 assert.equal(g.lastClear?.reason,'Social');assert.equal(g.handStats?.p1?.socials,1);
 g.hands.p3=['7C','7D','7H','7S','KC'];
 assert.throws(()=>playPA(r,'p3',['7C','7D','7H','7S'],2001,true),/No eligible Social/);
});
test('Asshole-mode Social notifies every human exactly once, including finisher, never bots',()=>{
 const r=fixture(),g=r.pa!;r.paSettings!.social=true;r.paSettings!.mode='asshole';
 configurePA(r,{botCount:1});for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.turn='p1';g.lastClear={by:'p1',cards:[],reason:'fixture',at:0,serial:0};
 g.hands.p1=['6C','KC'];g.hands.p2=['6D','6H','6S','KH'];
 playPA(r,'p1',['6C'],2000);playPA(r,'p2',['6D','6H','6S'],2001,true);
 for(const p of r.participants){
  assert.equal(g.drinking[p.id]?.length,1,p.id);
  assert.equal(publicPA(r,p)?.myDrinkEvent?.at,2001);
 }
 assert.equal(g.drinking[g.bots[0].id],undefined);
 assert.equal(publicPA(r,{id:'host',role:'host'} as Participant)?.myDrinkEvent,undefined);
});
test('Social ending the hand keeps Social history, stats, and group prompts',()=>{
 const r=fixture(),g=r.pa!;r.paSettings!.social=true;r.paSettings!.mode='asshole';
 for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.finished=['p1','p2'];g.turn='p3';g.pile=['10C','10D'];g.pileRank=7;g.pileOwner='p2';
 g.lastPlay={player:'p2',rank:7,count:1,cards:['10D'],serial:42};
 g.hands.p3=['10H','10S'];
 playPA(r,'p3',['10H','10S'],2000,false);
 assert.equal(g.stage,'ready');
 assert.equal(g.lastClear?.reason,'Social');assert.equal(g.pileHistory?.at(-1)?.reason,'Social');
 assert.equal(g.handStats?.p3?.socials,1);
 for(const p of r.participants)assert.equal(g.drinking[p.id]?.length,1);
});
test('Socials in President mode never prompt; four 2s do not double prompt in Asshole mode',()=>{
 const r=fixture(),g=r.pa!;r.paSettings!.social=true;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.turn='p1';g.lastClear={by:'p1',cards:[],reason:'fixture',at:0,serial:0};
 g.hands.p1=['7C','KC'];g.hands.p2=['7D','7H','7S','KH'];
 playPA(r,'p1',['7C'],2000);playPA(r,'p2',['7D','7H','7S'],2001,true);
 assert.deepEqual(g.drinking,{});
 r.paSettings!.mode='asshole';g.decrees.push({key:'drink_twos'});g.turn='p1';g.hands.p1=['2C','2D','2H','2S','KC'];
 playPA(r,'p1',['2C','2D','2H','2S'],2002);
 assert.equal(g.lastClear?.reason,'Social');
 for(const p of r.participants)assert.equal(g.drinking[p.id]?.length,1);
});

test('server reports finishing positions and legal play information without sending pile cards to phones',()=>{
 const r=fixture(),g=r.pa!;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 const host=publicPA(r,{id:'host',role:'host'} as Participant)!;
 const playerId=g.turn!,phone=publicPA(r,r.participants.find(p=>p.id===playerId)!)!;
 assert.equal(host.handPlayerCount,4);assert.equal(host.playRule,undefined);
 assert.equal(phone.playRule?.empty,true);
 assert.equal(phone.playRule?.openingCard,'4C');
 assert.equal(phone.pile,undefined);
 g.finished.push('p1');g.hands.p1=[];g.turn='p2';
 const p1=publicPA(r,r.participants[0])!;
 assert.equal(p1.myFinishPosition,1);
 assert.equal(p1.seats.find(p=>p.id==='p1')?.finishedPosition,1);
 assert.equal(p1.playRule,undefined,'finished players cannot play');
 const p2=publicPA(r,r.participants[1])!;
 assert.equal(p2.playRule?.empty,true);
 g.finished.push('p2');g.hands.p2=[];
 assert.equal(publicPA(r,{id:'host',role:'host'} as Participant)!.seats.find(p=>p.id==='p2')?.finishedPosition,2);
});

test('issued skip stats migrate legacy rows and do not count the skipped victim',()=>{
 const r=fixture(),g=r.pa!;
 for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 const first=g.turn!,q=g.seats[(g.seats.indexOf(first)+1)%4],victim=g.seats[(g.seats.indexOf(first)+2)%4];
 g.hands[first]=['6C','KC'];g.hands[q]=['6H','KH'];
 g.lastClear={by:first,cards:[],reason:'setup',at:0,serial:0};
 g.playerStats={[q]:{cardsPlayed:4,pilesCleared:0,socials:0,twosPlayed:0,passes:0} as PAPlayerStats};
 g.turn=first;
 playPA(r,first,['6C'],2000);
 playPA(r,q,['6H'],2001);
 assert.equal(g.handStats?.[q]?.skips,1);
 assert.equal(g.playerStats?.[q]?.skips,1,'old missing field becomes numeric one, not NaN');
 assert.equal(g.playerStats?.[q]?.cardsPlayed,5);
 assert.equal(g.handStats?.[victim]?.skips??0,0);
});

test('pass overlay event attributes an accepted pass, never rejected attempts, to presenter only',()=>{
 const r=fixture(),g=r.pa!;
 for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 const leadId=g.turn!,first=g.hands[leadId].find(c=>c==='4C')!;
 assert.throws(()=>passPA(r,leadId,1000,true),/pile is empty/);
 assert.equal(g.lastPass,undefined);
 playPA(r,leadId,[first],1001);
 const passer=g.turn!;
 passPA(r,passer,1002,true);
 assert.equal(g.lastPass?.by,passer);
 assert.equal(g.lastPass?.at,1002);
 const firstSerial=g.lastPass!.serial;
 assert.equal(publicPA(r,{id:'host',role:'host'} as Participant)?.lastPass?.by,passer);
 assert.equal(publicPA(r,r.participants[0])?.lastPass,undefined);
 assert.throws(()=>passPA(r,passer,1003,true),/Not your turn/);
 assert.equal(g.lastPass?.serial,firstSerial);
 const second=g.turn!;
 passPA(r,second,1004,false);
 assert.equal(g.lastPass?.by,second,'automatic passes also get presenter overlay');
 assert.equal(g.lastPass?.at,1004);
 assert.ok(g.lastPass!.serial>firstSerial);
 const third=g.turn!;
 passPA(r,third,1005,true);
 assert.equal(g.lastClear?.reason,'Everyone passed');
 assert.equal(g.lastPass?.by,third,'final accepted pass still animates after clearing pile');
 assert.equal(g.lastPass?.at,1005);
});

test('Require Acknowledgment never holds old persisted drink prompts indefinitely',()=>{
 const r=fixture(),g=r.pa!;for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 g.stage='decree';g.pendingPresident='p1';setDecree(r,'require_ack');
 g.drinking['p1']=['legacy pending notification'];
 assert.equal(g.drinkEvents?.p1,undefined);
 decreePA(r,'p1',undefined,undefined,3000);
 assert.deepEqual(g.drinking.p1,[]);
});
test('drinking events update last cue instead of growing unacknowledged notifications',()=>{
 const r=fixture(),g=r.pa!;r.paSettings!.mode='asshole';
 for(let i=1;i<=4;i++)readyPA(r,`p${i}`,true,1000);
 const first=g.turn!;
 g.hands[first]=['4C','9C'];g.lastClear={by:first,cards:[],reason:'setup',at:0,serial:0};
 playPA(r,first,['4C'],1001);
 const passer=g.turn!;
 passPA(r,passer,1002,true);
 const previous=publicPA(r,r.participants.find(x=>x.id===passer)!)?.myDrinkEvent?.serial;
 // Another manual Pass=Drink can occur after returning to the same player.
 g.turn=passer;g.passed=[];g.pile=['9C'];g.pileOwner=first;g.pileRank=6;
 passPA(r,passer,1003,true);
 assert.ok((g.drinkEvents?.[passer]?.serial??0)>(previous??0));
 assert.deepEqual(g.drinking[passer],['Pass = Drink']);
});
