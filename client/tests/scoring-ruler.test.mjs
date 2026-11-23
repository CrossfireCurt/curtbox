import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const core=readFileSync(new URL('../../server/src/core.ts',import.meta.url),'utf8');
const style=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const types=readFileSync(new URL('../../shared/types.ts',import.meta.url),'utf8');
test('host scores using a 0 to 100 percentage ruler with actual, guess and winning bands',()=>{
 assert.match(app,/function ScoringRuler/);
 assert.match(app,/actual-marker/);
 assert.match(app,/guess-marker/);
 assert.match(app,/scoring-scale-band/);
 assert.match(app,/scoring-scale-target/);
 assert.match(app,/explanation\.calculation/);
 assert.match(style,/\.scoring-scale-trail/);
});
test('reveals initial picker first and then other players left to right',()=>{
 assert.match(core,/const order=\[playerId,\.\.\.g\.playerIds/);
 assert.match(core,/g\.turnRevealStep=-1/);
 assert.match(core,/g\.phase='answerReveal'/);
 assert.match(core,/commitTurn\(g\)/);
 assert.match(app,/roster\.map\(\(seat,i\)=>/);
 assert.match(types,/revealRoster/);
 assert.match(app,/COMING UP/);
});
test('reaction sound files are included for all named emotes and sound can be unlocked',()=>{
 const reactionIds=[...readFileSync(new URL('../../shared/types.ts',import.meta.url),'utf8').matchAll(/\{id:'([^']+)',label:'[^']+',emoji:'[^']+',rating:'[^']+',sound:'([^']+)'\}/g)].map(m=>m[2]);
 assert.equal(reactionIds.length,22);
 for(const name of reactionIds)assert.ok(existsSync(new URL(`../public/audio/sfx/reaction-${name}.ogg`,import.meta.url)),name);
 const audio=readFileSync(new URL('../src/audio.ts',import.meta.url),'utf8');
 assert.match(audio,/window\.addEventListener\('pointerdown'/);
 assert.match(app,/Enable sound/);
});
