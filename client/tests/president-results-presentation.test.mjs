import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const ui=read('client/src/PresidentAsshole.tsx'),css=read('client/src/styles.css');
test('ready after a hand and finished game replaces table with full Last hand',()=>{
 assert.match(ui,/const resultsTakeover=game\.handRanks\.length>0&&\(game\.stage==='ready'\|\|game\.stage==='ended'\)&&!clearPreview/);
 assert.match(ui,/resultsTakeover\?<section className="pa-results-screen"/);
 assert.match(ui,/<HandResults game=\{game\} asshole=\{s\.mode==='asshole'\}\/>/);
 assert.match(ui,/:<div className="pa-stage-columns"/);
 assert.match(ui,/The table returns when the next hand begins/);
 assert.match(ui,/\{readyPlayers\} \/ \{game\.seats\.length\} ready/);
});
test('first lobby and active play still show the ordinary circular table',()=>{
 assert.match(ui,/game\.handRanks\.length>0/);
 assert.match(ui,/\(game\.stage==='play'\|\|clearPreview\)\?<><div className="pa-pile"/);
 assert.match(ui,/className="pa-table-ring"/);
});
test('completed-hand results are responsive and not cramped into the table sidebar',()=>{
 assert.match(css,/\.pa-results-screen\{/);
 assert.match(css,/\.pa-results-screen \.pa-hand-results\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(ui,/className="pa-result-emblem"/);
});

test('presenter removes large top headings but preserves small hand and ready context',()=>{
 assert.doesNotMatch(ui,/<h1>\{resultsTakeover/);
 assert.doesNotMatch(ui,/<h2>Last hand<\/h2>/);
 assert.match(ui,/className="pa-stage-head"/);
 assert.match(ui,/HAND \{game\.handNumber\} COMPLETE/);
});
test('Last Pile is in the right sidebar and displays only the most recent clear',()=>{
 assert.match(ui,/const lastPile=game\.pileHistory\?\.at\(-1\)/);
 assert.doesNotMatch(ui,/const clearedHistory=/);
 const table=ui.indexOf('className="pa-table-area"');
 const aside=ui.indexOf('className="pa-aside"');
 const history=ui.indexOf('className="panel pa-pile-history"');
 assert.ok(table>=0&&aside>table&&history>aside);
 assert.match(ui,/<h3>Last Pile<\/h3>/);
 assert.match(ui,/lastPile\?<div className="pa-last-pile" key=\{lastPile\.serial\}/);
 assert.match(ui,/game\.names\[lastPile\.by\].*cleared/);
 assert.match(ui,/lastPile\.cards\.map/);
 assert.match(ui,/No piles cleared yet/);
 assert.match(css,/\.pa-aside \.pa-last-pile \.pa-history-cards\{display:flex;flex-wrap:wrap/);
 assert.match(css,/\.tv-mode \.pa-aside \.pa-last-pile \.pa-history-card/);
});
