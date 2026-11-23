import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const ui=read('client/src/PresidentAsshole.tsx');
const engine=read('server/src/president.ts');
const types=read('shared/president.ts');
test('ready phone and host results share named-rank component',()=>{
 assert.match(ui,/function HandResults\(\{game,asshole\}/);
 assert.match(ui,/rankTitle\(p\.position,n,asshole\)/);
 assert.match(ui,/resultsTakeover\?<section className="pa-results-screen"/);
 assert.match(ui,/className="pa-stage-columns"/);
 assert.match(ui,/Ready for another hand\?/);
 assert.match(ui,/game\.handRanks\.length>0&&<HandResults game=\{game\}/);
 assert.doesNotMatch(ui,/\$\{p\.position\}\. \$\{p\.name\}/);
});
test('all scores come from public server-owned counters',()=>{
 assert.match(types,/interface PAPlayerStats/);
 assert.match(engine,/handStats:g\.handStats\?\?\{\},playerStats:g\.playerStats\?\?\{\}/);
 for(const word of ['Cards played','Piles cleared','Socials','2s played','Passes','Presidencies','Best streak'])
   assert.ok(ui.includes(word),word);
});
test('departed players and unranked next-hand entrants are distinct',()=>{
 assert.match(ui,/Left table/);
 assert.match(ui,/Unranked/);
 assert.match(ui,/Joining next hand/);
 assert.match(ui,/seat\?\.bot/);
});
