import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const core=readFileSync(new URL('../../server/src/core.ts',import.meta.url),'utf8');
const api=readFileSync(new URL('../../server/src/index.ts',import.meta.url),'utf8');

test('percentage selection does not lock or end early, and prediction choice can end early',()=>{
 assert.doesNotMatch(core,/g\.phase==='guess'&&g\.guessDraft!==undefined/);
 assert.doesNotMatch(core,/g\.phase==='finaleInput'&&players\.every/);
 assert.match(core,/g\.phase==='predict'&&players\.filter/);
 assert.match(app,/game:guessSubmit/);
 assert.match(app,/game:finaleSubmit/);
 assert.match(app,/Moving the slider is only a preview/);
 assert.match(app,/timer always runs to zero/);
});
test('host sees an individually animated player reveal before score commit',()=>{
 assert.match(app,/function SurveyReveal/);
 assert.match(app,/function ScoreCounter/);
 assert.match(css,/\.reveal-player-focus/);
 assert.match(css,/@keyframes reveal-player-entry/);
 assert.match(css,/@keyframes scoreboard-award/);
 assert.match(core,/function prepareTurnReveal/);
 assert.match(core,/function advancePlayerReveal/);
 assert.match(core,/function commitTurn/);
 assert.match(core,/function commitFinale/);
});
test('server processes expired phase before new gameplay inputs',()=>{
 for(const event of ['game:guess','game:guessSubmit','game:predict','game:finale','game:finaleSubmit']){
  const line=api.split('\n').find(line=>line.includes(`'${event}'`));
  assert.ok(line?.includes('advance(r,[]);') && /advance\(r,\[\]\);(?:choose|submit)/.test(line),event);
 }
});
