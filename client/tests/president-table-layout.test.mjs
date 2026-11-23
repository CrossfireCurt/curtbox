import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const ui=read('client/src/PresidentAsshole.tsx'),css=read('client/src/styles.css');
test('seats encircle the pile at equal angles, separate from centered table',()=>{
 assert.match(ui,/2\*Math\.PI\*i\/Math\.max\(1,game\.seats\.length\)/);
 assert.match(ui,/50\+40\*Math\.cos\(angle\)/);
 assert.match(ui,/50\+39\*Math\.sin\(angle\)/);
 assert.match(ui,/className="pa-table-ring"/);
 assert.match(css,/\.pa-table-ring\{position:relative/);
 assert.match(css,/\.pa-seat\{position:absolute/);
 assert.match(css,/\.pa-table-ring \.pa-table-center\{position:absolute/);
});
test('current combination is emphasized with fully visible card values',()=>{
 assert.match(ui,/CURRENT COMBINATION/);
 assert.match(ui,/pileType\.toUpperCase\(\)/);
 assert.match(ui,/PER PLAY/);
 assert.match(css,/\.pa-pile-type strong/);
 assert.match(css,/\.pa-table-ring \.pa-face/);
});
test('bots use emoji and finishing square uses visible green rank border',()=>{
 assert.match(ui,/aria-label="Bot".*🤖/);
 assert.doesNotMatch(ui,/' · BOT'/);
 assert.match(ui,/p\.finishedPosition/);
 assert.match(ui,/className="pa-seat-rank-icon"/);
 assert.match(css,/\.pa-seat\.finished\{border:4px solid #4aff9f/);
 for(const symbol of ['🇺🇸','👨‍💼','🧑','🖥️','💩','🧹'])assert.ok(ui.includes(symbol));
});
test('finishing player sees current rank and cannot select illegal cards',()=>{
 assert.match(ui,/game\.myFinishPosition/);
 assert.match(ui,/Finished as \{rankTitle/);
 assert.match(ui,/!selectableRanks\.has\(c\.slice\(0,-1\)\)/);
 assert.match(ui,/!canSubmit/);
 assert.match(ui,/passOnly/);
});
