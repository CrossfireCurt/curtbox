import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=path=>readFileSync(resolve(root,path),'utf8');
test('server records authoritative skip and passes it to both public snapshots',()=>{
 const shared=read('shared/president.ts'),engine=read('server/src/president.ts');
 assert.match(shared,/lastSkip\?:\{by:string;skipped:string;at:number;serial:number\}/);
 assert.match(engine,/g\.lastSkip=\{by:id,skipped,at:now,serial:\+\+g\.serial\}/);
 assert.match(engine,/lastSkip:g\.lastSkip/);
});
test('skip is rendered on presenter seat and affected phone, not every player',()=>{
 const ui=read('client/src/PresidentAsshole.tsx');
 assert.match(ui,/activeSkip\?\.skipped===p\.id/);
 assert.match(ui,/activeSkip\?\.skipped===view\.me\.id/);
 assert.match(ui,/className="pa-skipped-seat"/);
 assert.match(ui,/className="pa-hand-event-overlay is-skip" role="status" aria-label="You were skipped">⏭️/);
 assert.match(ui,/key=\{activeSkip\.serial\}/);
 assert.match(ui,/now-offset>=game\.lastSkip\.at/);
});
test('skip animations have a reduced-motion option',()=>{
 const css=read('client/src/styles.css');
 assert.match(css,/\.pa-skipped-seat/);
 assert.match(css,/\.pa-hand-event-overlay\.is-skip/);
 assert.doesNotMatch(css,/\.pa-skipped-phone\{/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.pa-skipped-seat/);
});
