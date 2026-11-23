import assert from 'node:assert/strict';
import test from 'node:test';
import {resultStatChips} from '../src/presidentResultStats.ts';
const keys=r=>r.map(x=>x.key);
test('stats hide zeros and fields explicitly removed from the end-hand view',()=>{
 assert.deepEqual(resultStatChips(undefined,0),[]);
 assert.deepEqual(resultStatChips({cardsPlayed:20,pilesCleared:0,socials:0,twosPlayed:2,passes:0,skips:0},0),[]);
 const shown=resultStatChips({cardsPlayed:10,pilesCleared:3,socials:2,twosPlayed:1,passes:0,skips:4},1);
 assert.deepEqual(keys(shown),['clears','socials','skips','presidencies']);
 assert.deepEqual(shown.map(x=>x.label),['Clears','🍻','⏭️','🇺🇸']);
 assert.ok(!shown.some(x=>x.value===0));
});
test('legacy stats missing skip counters and all-time Presidency zero remain safe',()=>{
 const old={cardsPlayed:2,pilesCleared:0,socials:0,twosPlayed:0,passes:1};
 assert.deepEqual(keys(resultStatChips(old,0)),['passes']);
 assert.deepEqual(keys(resultStatChips(undefined,2)),['presidencies']);
});
