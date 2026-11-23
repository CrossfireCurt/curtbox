import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const ui=read('client/src/PresidentAsshole.tsx');
const css=read('client/src/styles.css');
const engine=read('server/src/president.ts');
test('latest combination uses its play size rather than total pile cards',()=>{
 assert.match(ui,/pileType=\(\{1:'Single',2:'Pair',3:'Triple',4:'Four-of-a-kind'\}/);
 assert.match(ui,/pileGroups\[0\]\?\.cards\.length/);
 assert.match(ui,/game\.pilePlays/);
 assert.match(ui,/Empty pile · new lead/);
});
test('every live pile play has visible unstacked card values',()=>{
 assert.match(ui,/pileGroups\.map\(\(play,i\)/);
 assert.match(ui,/pa-pile-cards/);
 assert.doesNotMatch(ui,/translate\(\$\{i\*21\}/);
 assert.match(css,/\.pa-face\{[^}]*position:static/);
 assert.match(css,/\.pa-pile\{[^}]*overflow-x:auto/);
});
test('public cleared pile history is attributed and bounded by server',()=>{
 assert.match(ui,/PILE HISTORY/);
 assert.match(ui,/game\.names\[entry\.by\].*cleared/);
 assert.match(ui,/entry\.cards\.map/);
 assert.match(engine,/pileHistory=\[\.\.\.\(g\.pileHistory\?\?\[\]\)\.slice\(-7\),record\]/);
 assert.match(engine,/pileHistory:host\?/);
});
