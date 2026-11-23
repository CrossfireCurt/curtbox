import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {toggleCardSelection,availableCardSelection} from '../src/presidentSelection.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const ui=readFileSync(resolve(root,'client/src/PresidentAsshole.tsx'),'utf8');
test('Play/Social can select multiple cards only when ranks match',()=>{
 let selected=[];
 selected=toggleCardSelection(selected,'7C','play');
 selected=toggleCardSelection(selected,'7H','play');
 assert.deepEqual(selected,['7C','7H']);
 // Selecting a new rank switches from the previous selection instead of mixing.
 selected=toggleCardSelection(selected,'10S','play');
 assert.deepEqual(selected,['10S']);
 selected=toggleCardSelection(selected,'10D','play');
 assert.deepEqual(selected,['10S','10D']);
 selected=toggleCardSelection(selected,'10S','play');
 assert.deepEqual(selected,['10D']);
 selected=toggleCardSelection(selected,'10D','play');
 assert.deepEqual(selected,[]);
});
test('Card Exchange permits returning multiple original cards of different ranks',()=>{
 let selected=[];
 selected=toggleCardSelection(selected,'3C','exchange');
 selected=toggleCardSelection(selected,'AH','exchange');
 assert.deepEqual(selected,['3C','AH']);
 selected=toggleCardSelection(selected,'3C','exchange');
 assert.deepEqual(selected,['AH']);
});
test('Stale cards no longer selected or submitted after leaving private hand',()=>{
 assert.deepEqual(availableCardSelection(['7C','7H','2D'],['2D','KH']),['2D']);
 assert.deepEqual(availableCardSelection([],['2D']),[]);
 assert.deepEqual(availableCardSelection(['7C','7H'],[]),[]);
});
test('Selection survives changes in turn owner while resetting for hand, phase or identity',()=>{
 assert.doesNotMatch(ui,/\[game\?\.currentPlayerId,game\?\.handNumber,game\?\.stage\]/);
 assert.match(ui,/setSelected\(\[\]\);\},\[view\.me\.id,game\?\.handNumber,game\?\.stage\]/);
 assert.match(ui,/toggleCardSelection\(availableCardSelection\(a,availableCards\),c,game\.stage==='exchange'\?'exchange':'play'\)/);
 assert.match(ui,/const selections=availableCardSelection\(selected,availableCards\)/);
 assert.match(ui,/if\(result\)setSelected\(\[\]\)/);
});
