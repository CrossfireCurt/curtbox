import test from 'node:test';
import assert from 'node:assert/strict';
import {seedQuestions} from '../src/seed.js';
import {newRoom,createParticipant,openLobby,startCountdown,advance,chooseGuess,submitGuess,choosePrediction,chooseFinale,submitFinalePercentage,makeView,regularPoints,top3Points,rankPoints,showdownPoints,validChoice,skipResults,returnLobby,leave} from '../src/core.js';

function setup(count=2){
 const room=newRoom('TEST',1000);
 const host=createParticipant(room,'host','',1001);
 const players=Array.from({length:count},(_,i)=>createParticipant(room,'player','Player '+(i+1),1002+i));
 openLobby(room,host);
 return {room,host,players};
}
test('Curtbox room creator is a host; first PLAYER is Primary Controller',()=>{
 const {room,host,players}=setup();
 assert.equal(room.creatorId,host.id);
 assert.equal(room.primaryId,players[0].id);
 assert.equal(room.participants.find(p=>p.id===host.id)?.role,'host');
 assert.equal(room.participants.filter(p=>p.role==='player').length,2);
});
test('host presentation receives current Primary Controller ID for lobby highlighting',()=>{
 const {room,host,players}=setup();
 assert.equal(makeView(room,host).primaryId,players[0].id);
 leave(room,players[0]);
 assert.equal(makeView(room,host).primaryId,players[1].id);
});
test('seed bank contains curated, directly worded, sourced culture and behavior questions and both list finales',()=>{
 const percentages=seedQuestions.filter(q=>q.type==='percentage');
 assert.ok(percentages.length>=300,`Expected at least 300 curated questions, found ${percentages.length}`);
 assert.equal(new Set(seedQuestions.map(q=>q.id)).size,seedQuestions.length,'Every seeded question ID must be unique');
 assert.equal(new Set(percentages.map(q=>q.text.trim().toLowerCase())).size,percentages.length,'Every seeded percentage prompt must be unique');
 for(const q of seedQuestions){assert.ok(q.text.trim().split(/\s+/).length>=6&&q.text.trim().split(/\s+/).length<=25,q.text);assert.doesNotMatch(q.text,/\baccording to\b/i);assert.doesNotMatch(q.text,/\b(?:yougov|pew research center)\b/i);if(q.type==='percentage')assert.match(q.text,/^What percentage of /);assert.ok(q.source.url?.startsWith('https://'));}
 assert.ok(seedQuestions.some(q=>q.type==='top3'));
 assert.ok(seedQuestions.some(q=>q.type==='rank'));
});
test('regular points, prediction direction limits and finale points',()=>{
 assert.equal(regularPoints(50,50),3000);assert.equal(regularPoints(55,50),2500);assert.equal(regularPoints(0,100),0);
 assert.equal(validChoice(92,'muchHigher',2),false);assert.equal(validChoice(85,'muchHigher',2),true);
 assert.equal(validChoice(50,'muchLower',1),false);
 const options=[{id:'a',label:'A',percent:60},{id:'b',label:'B',percent:60},{id:'c',label:'C',percent:30},{id:'d',label:'D',percent:25},{id:'e',label:'E',percent:10},{id:'f',label:'F',percent:5}];
 assert.equal(top3Points(options,['a','b','c']),6000);
 assert.equal(rankPoints(options.slice(0,5),['b','a','c','d','e']),6000);
 assert.equal(showdownPoints({alice:50,bob:50,charlie:80},50).alice,5000);
});
test('a missed percentage guess receives zero points and reveals each participant before scores change',()=>{
 const {room,host,players}=setup();startCountdown(room,seedQuestions,2000);advance(room,seedQuestions,17000);
 const g=room.game!;const turnId=g.turnOrder[0];
 assert.equal(g.guessDraft,undefined);
 advance(room,[],g.phaseEndsAt+1);
 assert.equal(g.phase,'answerReveal');assert.equal(g.guess,undefined);
 assert.equal(g.turnRevealStep,-1);
 assert.equal(makeView(room,host).game?.revealEntries?.length,0);
 assert.equal(g.scores[turnId],0);
 advance(room,[],g.phaseEndsAt+1);
 assert.equal(g.phase,'answerReveal');assert.equal(g.turnRevealStep,0);
 assert.deepEqual(makeView(room,host).game?.revealEntries?.map(e=>e.points),[0]);
 assert.equal(g.turns.length,0,'Scoring is not committed during the reveal');
 advance(room,[],g.phaseEndsAt+1);
 assert.equal(g.phase,'answerReveal');assert.equal(g.turnRevealStep,1);
 assert.equal(makeView(room,host).game?.revealEntries?.[1].answerLabel,undefined);
 advance(room,[],g.phaseEndsAt+1);
 assert.equal(g.phase,'scoreReveal');assert.equal(g.scores[turnId],0);
 assert.equal(g.turns[0].guessed,undefined);assert.equal(g.turns[0].guessPoints,0);
 assert.equal(players.length,2);
});
test('percentage selection always uses full timer; predictors advance as soon as all have chosen',()=>{
 const {room,host,players}=setup(3);startCountdown(room,seedQuestions,2000);advance(room,seedQuestions,17000);
 const g=room.game!;const guesser=players.find(p=>p.id===g.turnOrder[0])!;
 const predictors=players.filter(p=>p.id!==guesser.id);
 const timerEnd=g.phaseEndsAt;
 chooseGuess(room,guesser,34);advance(room,[],17010);
 assert.equal(g.phase,'guess','First selection must not advance the guess phase');
 chooseGuess(room,guesser,36);submitGuess(room,guesser,36);advance(room,[],timerEnd-1);
 assert.equal(g.phase,'guess','Submitting a guess cannot shorten the timer');
 assert.equal(makeView(room,guesser).game?.mySubmittedValue,36);
 assert.equal(makeView(room,host).game?.publicGuess,36);
 advance(room,[],timerEnd);assert.equal(g.phase,'predict');assert.equal(g.guess,36);
 choosePrediction(room,predictors[0],'higher');advance(room,[],timerEnd+1);
 assert.equal(g.phase,'predict','One of two predictors is not enough to advance');
 choosePrediction(room,predictors[1],'lower');advance(room,[],timerEnd+2);
 assert.equal(g.phase,'predictReveal','All predictors selected, so advance early');
 advance(room,[],g.phaseEndsAt+1);assert.equal(g.phase,'answerReveal');
 assert.ok(makeView(room,host).game?.source);
 const before={...g.scores};assert.equal(g.turns.length,0);
 advance(room,[],g.phaseEndsAt+1); // show guesser
 const guesserEntry=makeView(room,host).game?.revealEntries?.at(-1);
 assert.equal(guesserEntry?.playerId,guesser.id);assert.equal(guesserEntry?.guess,36);
 assert.ok((guesserEntry?.points??0)>=0);
 assert.deepEqual(g.scores,before,'The host leaderboard must not increase during reveals');
 advance(room,[],g.phaseEndsAt+1); // first predictor
 const predictionEntry=makeView(room,host).game?.revealEntries?.at(-1);
 assert.equal(predictionEntry?.playerId,predictors[0].id);assert.equal(predictionEntry?.choice,'higher');
 assert.equal(g.turns.length,0);
 advance(room,[],g.phaseEndsAt+1); // second predictor
 assert.equal(makeView(room,host).game?.revealEntries?.length,3);
 assert.deepEqual(g.scores,before);
 advance(room,[],g.phaseEndsAt+1); // apply only after all individual reveals
 assert.equal(g.phase,'scoreReveal');assert.equal(g.turns.length,1);
 assert.equal(makeView(room,host).game?.source,undefined);
 assert.ok(Object.values(g.scores).some(n=>n>0));
 const committed={...g.scores};advance(room,[],g.phaseStartedAt+1);
 assert.deepEqual(g.scores,committed,'Do not double award during scoreboard animation');
});
test('slider previews do not submit; only explicit Submit counts at deadline',()=>{
 const {room,host,players}=setup(2);startCountdown(room,seedQuestions,2000);advance(room,seedQuestions,17000);
 const g=room.game!;const guesser=players.find(p=>p.id===g.turnOrder[0])!;
 chooseGuess(room,guesser,72);
 assert.equal(makeView(room,host).game?.publicGuess,72,'Presenter sees live slider position');
 assert.equal(makeView(room,guesser).game?.mySubmitted,false,'Preview must not count as a submission');
 advance(room,[],g.phaseEndsAt);
 assert.equal(g.guess,undefined,'No Submit means NO ANSWER even if slider was moved');
 assert.equal(g.phase,'answerReveal');
});
test('Submit does not end timer and player can resubmit until deadline',()=>{
 const {room,host,players}=setup(2);startCountdown(room,seedQuestions,2000);advance(room,seedQuestions,17000);
 const g=room.game!;const guesser=players.find(p=>p.id===g.turnOrder[0])!;
 const deadline=g.phaseEndsAt;
 submitGuess(room,guesser,10);
 assert.equal(makeView(room,guesser).game?.mySubmittedValue,10);
 chooseGuess(room,guesser,95);
 assert.equal(makeView(room,host).game?.publicGuess,95);
 assert.equal(makeView(room,guesser).game?.mySubmittedValue,10,'Preview does not overwrite previous Submit');
 advance(room,[],deadline-1);
 assert.equal(g.phase,'guess');
 submitGuess(room,guesser,55);
 advance(room,[],deadline);
 assert.equal(g.guess,55);
 assert.equal(g.phase,'predict');
 assert.throws(()=>submitGuess(room,guesser,67),/Not your guessing turn/);
});
test('showdown scores only explicitly submitted percentages, not unsent previews',()=>{
 const {room,players}=setup(2);room.settings.finale='showdown';
 startCountdown(room,seedQuestions,2000);advance(room,seedQuestions,17000);
 let guard=0;while(room.game?.phase!=='finaleInput'&&guard++<180)advance(room,[],room.game!.phaseEndsAt+1);
 const g=room.game!;const deadline=g.phaseEndsAt;
 chooseFinale(room,players[0],10);
 chooseFinale(room,players[1],65);
 submitFinalePercentage(room,players[1],65);
 chooseFinale(room,players[1],84);
 assert.equal(makeView(room,players[0]).game?.mySubmitted,false);
 assert.equal(makeView(room,players[1]).game?.mySubmittedValue,65);
 advance(room,[],deadline);
 assert.equal(g.phase,'finaleReveal');
 assert.deepEqual(Object.keys(g.finaleDrafts),[players[1].id]);
 assert.equal(g.finaleDrafts[players[1].id],65);
 assert.equal(g.finalePoints?.[players[0].id],undefined);
 assert.ok(g.finalePoints?.[players[1].id]!==undefined);
});
test('all finale input variants keep their deadline and reveal points before awarding',()=>{
 for(const mode of ['showdown','top3','rank'] as const){
  const {room,host,players}=setup(2);room.settings.finale=mode;
  startCountdown(room,seedQuestions,2000);advance(room,seedQuestions,17000);
  let guard=0;while(room.game?.phase!=='finaleInput'&&guard++<180)advance(room,[],room.game!.phaseEndsAt+1);
  assert.equal(room.game?.phase,'finaleInput',mode);
  const g=room.game!;const until=g.phaseEndsAt;
  for(const p of players){
   const answer=mode==='showdown'?40:mode==='top3'?g.question!.options!.slice(0,3).map(o=>o.id):g.question!.options!.map(o=>o.id);
   chooseFinale(room,p,answer);
   if(mode==='showdown')submitFinalePercentage(room,p,answer as number);
   advance(room,[],until-1);
   assert.equal(g.phase,'finaleInput',`A ${mode} finale must not finish early`);
  }
  const before={...g.scores};advance(room,[],until);
  assert.equal(g.phase,'finaleReveal');assert.equal(g.turnRevealStep,-1);
  assert.deepEqual(g.scores,before);
  for(let i=0;i<players.length;i++){
   advance(room,[],g.phaseEndsAt+1);
   assert.equal(g.turnRevealStep,i);assert.deepEqual(g.scores,before);
   assert.equal(makeView(room,host).game?.revealEntries?.length,i+1);
  }
  advance(room,[],g.phaseEndsAt+1);
  assert.equal(g.phase,'finaleScore');assert.equal(makeView(room,host).game?.revealEntries?.length,players.length);
  assert.deepEqual(g.lastPoints,g.finalePoints);
 }
});
test('a persisted room can resume halfway through a player-by-player reveal without double credit',()=>{
 const {room,players}=setup(2);startCountdown(room,seedQuestions,2000);advance(room,seedQuestions,17000);
 const g=room.game!;const guesser=players.find(p=>p.id===g.turnOrder[0])!;
 const predictor=players.find(p=>p.id!==guesser.id)!;
 chooseGuess(room,guesser,50);submitGuess(room,guesser,50);advance(room,[],g.phaseEndsAt);
 choosePrediction(room,predictor,'higher');advance(room,[],g.phaseStartedAt+1);
 advance(room,[],g.phaseEndsAt+1); // answer reveal intro
 advance(room,[],g.phaseEndsAt+1); // guesser card
 const restored=JSON.parse(JSON.stringify(room)) as typeof room;
 assert.equal(restored.game?.turnRevealStep,0);
 assert.equal(restored.game?.turns.length,0);
 const deadline=restored.game!.phaseEndsAt;
 advance(restored,[],deadline+15_000);
 assert.equal(restored.game?.phase,'guess','All reveal steps and score animation elapsed after reconnect');
 assert.equal(restored.game?.turns.length,1);
 const expected=restored.game!.turns[0];
 assert.ok(expected.guessPoints>=0);
 const total=Object.values(restored.game!.scores).reduce((sum,v)=>sum+v,0);
 assert.equal(total,expected.guessPoints+Object.values(expected.predictionPoints).reduce((sum,v)=>sum+v,0));
 advance(restored,[],restored.game!.phaseStartedAt+1);
 assert.equal(Object.values(restored.game!.scores).reduce((sum,v)=>sum+v,0),total);
});
test('full match completes, final results can be skipped, and lobby return is manual',()=>{
 const {room}=setup();startCountdown(room,seedQuestions,2000);advance(room,seedQuestions,17000);
 advance(room,[],17_000+60*60_000);
 assert.equal(room.status,'results');
 assert.equal(room.game?.turns.length,8);
 assert.equal(room.game?.turns.every(t=>t.guessed===undefined),true);
 assert.equal(room.matchHistory.length,1);
 returnLobby(room);assert.equal(room.status,'lobby');
});
test('question bank snapshot cannot be rewritten by admin edits after match begins',()=>{
 const {room,players}=setup(4);startCountdown(room,seedQuestions,2000);advance(room,seedQuestions,17000);
 const id=seedQuestions[0].id,original=seedQuestions[0].text;
 seedQuestions[0].text='changed';
 assert.equal(room.game!.pool.find(q=>q.id===id)?.text,original);
 leave(room,players[1],17020);advance(room,[],17020);
 assert.ok(room.game!.departedPlayerIds.includes(players[1].id));seedQuestions[0].text=original;
});
test('Primary Controller can skip progressive final reveal without returning to lobby',()=>{
 const {room}=setup();startCountdown(room,seedQuestions,2000);advance(room,seedQuestions,17000);
 let i=0;while(room.status==='playing'&&i++<500)advance(room,[],room.game!.phaseEndsAt+1);
 assert.equal(room.status,'resultsReveal');skipResults(room);assert.equal(room.status,'results');
 assert.equal(room.game?.revealStep,999);returnLobby(room);assert.equal(room.status,'lobby');
});

test('host receives a public left-to-right reveal order and a server-calculated points explanation before totals commit',()=>{
 const {room,host,players}=setup(3);
 startCountdown(room,seedQuestions,2000);advance(room,seedQuestions,17000);
 const g=room.game!;const guesser=players.find(p=>p.id===g.turnOrder[0])!;
 const others=players.filter(p=>p.id!==guesser.id);
 submitGuess(room,guesser,47);advance(room,[],g.phaseEndsAt);
 choosePrediction(room,others[0],'higher');choosePrediction(room,others[1],'lower');advance(room,[],g.phaseStartedAt+1);
 advance(room,[],g.phaseEndsAt); // intro
 const intro=makeView(room,host).game!;
 assert.deepEqual(intro.revealRoster?.map(e=>e.playerId),[guesser.id,...others.map(p=>p.id)]);
 assert.equal(intro.revealEntries?.length,0,'Do not reveal anyone’s choice in the intro');
 assert.deepEqual(g.scores,Object.fromEntries(players.map(p=>[p.id,0])));
 advance(room,[],g.phaseEndsAt); // percentage-picker first
 const first=makeView(room,host).game!;
 assert.equal(first.revealEntries?.length,1);
 assert.equal(first.revealEntries?.[0].playerId,guesser.id);
 assert.equal(first.revealEntries?.[0].explanation?.comparison?.guess,47);
 assert.equal(first.revealEntries?.[0].explanation?.comparison?.actual,Math.round(g.question!.answer!));
 assert.match(first.revealEntries?.[0].explanation?.calculation??'',/3,000/);
 assert.equal(g.scores[guesser.id],0,'No points are awarded during this individual calculation');
 advance(room,[],g.phaseEndsAt); // next prediction
 const next=makeView(room,host).game!.revealEntries?.[1];
 assert.equal(next?.playerId,others[0].id);
 assert.match(next?.explanation?.calculation??'',/HIGHER/);
 assert.ok(next?.explanation?.parts.some(x=>x.label==='CHANGE'));
 assert.equal(g.scores[guesser.id],0);
 advance(room,[],g.phaseEndsAt);advance(room,[],g.phaseEndsAt); // final player, commit
 assert.equal(g.phase,'scoreReveal');
 assert.equal(g.scores[guesser.id],first.revealEntries?.[0].points);
});
