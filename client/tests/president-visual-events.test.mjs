import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isPresidentVisualEventActive} from '../src/presidentVisualEvents.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const ui=read('client/src/PresidentAsshole.tsx'),css=read('client/src/styles.css');
test('visual event freshness honors authoritative timestamp and room clock offset',()=>{
 assert.equal(isPresidentVisualEventActive(undefined,10000,0,2600),false);
 assert.equal(isPresidentVisualEventActive(1000,1000,0,2600),true);
 assert.equal(isPresidentVisualEventActive(1000,3500,0,2600),true);
 assert.equal(isPresidentVisualEventActive(1000,3600,0,2600),false);
 assert.equal(isPresidentVisualEventActive(1000,499,0,2600),false);
 assert.equal(isPresidentVisualEventActive(1000,1050,50,2600),true);
});
test('phone drink and skip notifications are big icons over hand, never acknowledgment banners',()=>{
 assert.match(ui,/function PhoneHandOverlays\(\{drink,skip\}/);
 assert.match(ui,/className="pa-hand-event-overlay is-drink" role="status" aria-label="Social cheers or drink">🍻/);
 assert.match(ui,/className="pa-hand-event-overlay is-skip" role="status" aria-label="You were skipped">⏭️/);
 assert.match(ui,/className="pa-hand-zone"/);
 assert.match(ui,/skip=\{activeSkip\?\.skipped===view\.me\.id\?activeSkip:undefined\}/);
 assert.match(ui,/game\.myDrinkEvent&&isPresidentVisualEventActive/);
 assert.match(ui,/game\.mySocialEvent&&isPresidentVisualEventActive/);
 assert.match(ui,/const cheersOverlay=drinkOverlay\?\?socialPhoneOverlay/);
 assert.doesNotMatch(ui,/pa-skipped-phone|president:ack|<h3>Notification<\/h3>/);
 assert.match(css,/\.pa-hand-event-overlay\{position:absolute;inset:0;z-index:35/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/@keyframes pa-hand-event-pop-fade/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('Social preview retains real last-clear cards under beer cheers before visible clear',()=>{
 assert.match(ui,/const socialPreview=Boolean\(host&&game\.lastClear\?\.reason==='Social'/);
 assert.match(ui,/const previewCards=socialPreview&&game\.lastClear\?game\.lastClear\.cards/);
 assert.match(ui,/presentPile\(previewCards\?\?game\.pile\?\?\[\],previewPlays\?\?game\.pilePlays\?\?\[\]\)/);
 assert.match(ui,/resultsTakeover=game\.handRanks\.length>0&&\(game\.stage==='ready'\|\|game\.stage==='ended'\)&&!socialPreview/);
 assert.match(ui,/className="pa-social-pile-overlay".*aria-label="Social!">🍻/);
 assert.match(ui,/recentClear&&!socialPreview/);
 assert.match(css,/\.pa-social-pile-overlay\{position:absolute;inset:0/);
 assert.match(css,/@keyframes pa-pile-social-then-clear/);
});
test('Social that ends a hand still shows phone drink icon on ready results',()=>{
 assert.match(ui,/className="pa-ready-results"><HandResults/);
 assert.match(ui,/<PhoneHandOverlays drink=\{cheersOverlay\}/);
 assert.match(ui,/className="pa-ready-question"/);
});
