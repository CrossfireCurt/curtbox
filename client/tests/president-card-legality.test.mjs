import assert from 'node:assert/strict';
import test from 'node:test';
import {playableCardRanks,validPresidentSelection} from '../src/presidentCardLegality.ts';
const rule={empty:false,rank:'8',count:2,doubleTrouble:false};
test('an incomplete pair cannot be played; full pair or four-of-kind may be selected',()=>{
 const hand=['3C','7C','8C','8D','AC','AD','2C','4C','4D','4H','4S'];
 const allowed=playableCardRanks(hand,rule,undefined);
 assert.equal(allowed.has('7'),false);assert.equal(allowed.has('3'),false);
 assert.equal(allowed.has('8'),true);assert.equal(allowed.has('A'),true);
 assert.equal(allowed.has('2'),true);assert.equal(allowed.has('4'),true);
 assert.equal(validPresidentSelection(['8C'],hand,rule,undefined,true,false),false);
 assert.equal(validPresidentSelection(['8C','8D'],hand,rule,undefined,true,false),true);
 assert.equal(validPresidentSelection(['7C'],hand,rule,undefined,true,false),false);
});
test('a Social completing top-rank cards is selectable off turn only when interrupts are allowed',()=>{
 const hand=['4H','4S','7C'];
 const social={rank:'4',count:2};
 assert.equal(playableCardRanks(hand,rule,social).has('4'),true);
 assert.equal(validPresidentSelection(['4H','4S'],hand,rule,social,false,true),true);
 assert.equal(validPresidentSelection(['4H','4S'],hand,rule,social,false,false),false);
 assert.equal(validPresidentSelection(['7C'],hand,rule,social,false,true),false);
});
test('first-hand opener requires containing opening card',()=>{
 const opening={empty:true,count:1,openingCard:'4C',doubleTrouble:false};
 const hand=['4C','4D','7C','9S'];
 assert.deepEqual([...playableCardRanks(hand,opening,undefined)],['4']);
 assert.equal(validPresidentSelection(['4D'],hand,opening,undefined,true,false),false);
 assert.equal(validPresidentSelection(['4C','4D'],hand,opening,undefined,true,false),true);
});
test('empty piles permit a lead and 2s/special Double Trouble combinations override size',()=>{
 const lead={empty:true,count:1,doubleTrouble:false};
 assert.equal(validPresidentSelection(['7C','7D'],['7C','7D'],lead,undefined,true,false),true);
 const pair3={empty:false,rank:'A',count:3,doubleTrouble:true};
 assert.equal(validPresidentSelection(['3C','3D'],['3C','3D'],pair3,undefined,true,false),true);
 assert.equal(validPresidentSelection(['2C'],['2C'],pair3,undefined,true,false),true);
});
test('complete Social group overrides previous one-card requirement',()=>{
 const hand=['4H','4S'];
 const social={rank:'4',count:2};
 assert.equal(validPresidentSelection(hand,hand,{empty:false,rank:'4',count:1,doubleTrouble:false},social,true,false),true);
});
