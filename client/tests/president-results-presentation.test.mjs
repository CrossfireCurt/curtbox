import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const ui=read('client/src/PresidentAsshole.tsx'),css=read('client/src/styles.css');
test('ready after a hand and finished game replaces table with full Last hand',()=>{
 assert.match(ui,/const resultsTakeover=game\.handRanks\.length>0&&\(game\.stage==='ready'\|\|game\.stage==='ended'\)/);
 assert.match(ui,/resultsTakeover\?<section className="pa-results-screen"/);
 assert.match(ui,/<HandResults game=\{game\} asshole=\{s\.mode==='asshole'\}\/>/);
 assert.match(ui,/:<div className="pa-stage-columns"/);
 assert.match(ui,/The table returns when the next hand begins/);
 assert.match(ui,/\{readyPlayers\} \/ \{game\.seats\.length\} ready/);
});
test('first lobby and active play still show the ordinary circular table',()=>{
 assert.match(ui,/game\.handRanks\.length>0/);
 assert.match(ui,/game\.stage==='play'\?<><div className="pa-pile"/);
 assert.match(ui,/className="pa-table-ring"/);
});
test('completed-hand results are responsive and not cramped into the table sidebar',()=>{
 assert.match(css,/\.pa-results-screen\{/);
 assert.match(css,/\.pa-results-screen \.pa-hand-results\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(ui,/className="pa-result-emblem"/);
});
