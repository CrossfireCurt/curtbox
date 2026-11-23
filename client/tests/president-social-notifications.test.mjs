import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const ui=readFileSync(resolve(root,'client/src/PresidentAsshole.tsx'),'utf8');
const css=readFileSync(resolve(root,'client/src/styles.css'),'utf8');
const audio=readFileSync(resolve(root,'client/src/presidentAudio.ts'),'utf8');
const cues=readFileSync(resolve(root,'client/src/presidentSoundEvents.ts'),'utf8');

test('Social notification uses party popper in President and cheers in Asshole',()=>{
 assert.match(ui,/mode==='president'\?'🎉':'🍻'/);
 assert.match(ui,/s\.mode==='president'\?'🎉':'🍻'/);
 assert.match(ui,/className="pa-social-pile-overlay"/);
 assert.match(ui,/className="pa-event-label">SOCIAL!<\/strong>/);
 assert.match(ui,/social=\{socialPhoneOverlay\}/);
 assert.doesNotMatch(ui,/cheersOverlay/);
});
test('skip and drink overlays show a caption below their emoji',()=>{
 assert.match(ui,/className="pa-event-emoji" aria-hidden="true">⏭️<\/span><strong className="pa-event-label">SKIPPED!<\/strong>/);
 assert.match(ui,/className="pa-event-emoji" aria-hidden="true">🍻<\/span><strong className="pa-event-label">DRINK!<\/strong>/);
 assert.match(ui,/className="pa-skipped-seat"/);
 assert.match(css,/\.pa-hand-event-overlay\{[^}]*flex-direction:column/);
 assert.match(css,/\.pa-social-pile-overlay\{[^}]*flex-direction:column/);
 assert.match(css,/\.pa-skipped-seat \.pa-event-label\{/);
});
test('Social uses the downloaded Mixkit crowd cheer with synthesis fallback on either mode',()=>{
 assert.match(audio,/\/audio\/sfx\/mixkit-social-cheer-459\.mp3/);
 assert.match(audio,/\/audio\/sfx\/mixkit-skip-laugh-424\.mp3/);
 assert.match(audio,/cue\.kind==='social'\?cheersMedia\.current:skippedPhone\?skipLaughMedia\.current:null/);
 assert.match(audio,/const skippedPhone=cue\.kind==='skip'&&view\.me\.role!=='host'/);
 assert.match(audio,/media\.play\(\)\.catch/);
 assert.match(audio,/playSound\(context\.current,cue\.kind,output\.current\)/);
 assert.match(cues,/if\(game\.mySocialEvent&&fresh\(game\.mySocialEvent\.at\)\)/);
 assert.match(cues,/kind:'social',key:`social:/);
 assert.match(cues,/game\.myDrinkEvent\.at!==game\.mySocialEvent\?\.at/);
});
