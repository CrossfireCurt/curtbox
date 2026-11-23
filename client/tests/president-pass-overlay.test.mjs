import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const ui=read('client/src/PresidentAsshole.tsx');
const css=read('client/src/styles.css');
const engine=read('server/src/president.ts');
const shared=read('shared/president.ts');

test('an accepted pass creates authoritative serial/timestamp event, host only',()=>{
 assert.match(shared,/lastPass\?:\{by:string;at:number;serial:number\}/);
 assert.match(engine,/g\.lastPass=\{by:id,at:now,serial:\+\+g\.serial\}/);
 assert.match(engine,/lastPass:host\?g\.lastPass:undefined/);
 assert.match(engine,/g\.lastPass=undefined/);
});
test('the passer gets a short-lived presenter overlay, no phone overlay',()=>{
 assert.match(ui,/const activePass=game\.stage==='play'&&game\.lastPass/);
 assert.match(ui,/now-offset>=game\.lastPass\.at-500&&now-offset<game\.lastPass\.at\+2200/);
 assert.match(ui,/activePass\?\.by===p\.id&&<span key=\{activePass\.serial\} className="pa-passed-seat" role="status">PASSED<\/span>/);
 assert.doesNotMatch(ui,/pa-passed-phone/);
});
test('blue pass overlay differs from golden skipped overlay and honors reduced motion',()=>{
 assert.match(css,/\.pa-passed-seat\{position:absolute;inset:0;border:2px solid #89d7ff/);
 assert.match(css,/\.pa-skipped-seat\{position:absolute;inset:0;border:2px solid #ffd27d/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.pa-passed-seat\{animation:none\}\}/);
});
