import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const survey=read('client/src/audio.ts');
const app=read('client/src/App.tsx');
const pa=read('client/src/PresidentAsshole.tsx');
const presidentAudio=read('client/src/presidentAudio.ts');

test('Survey Show has separately stored and labeled controls and separate volume sliders',()=>{
 assert.match(app,/useStored\('curtbox\.musicOn',legacyAudioOn\(\)\)/);
 assert.match(app,/useStored\('curtbox\.effectsOn',legacyAudioOn\(\)\)/);
 assert.match(app,/Enable music/);
 assert.match(app,/Enable sound effects/);
 assert.match(app,/disabled=\{!musicOn\}/);
 assert.match(app,/disabled=\{!effectsOn\}/);
 assert.match(app,/musicEnabled:musicOn&&surveyAudioActive,effectsEnabled:effectsOn&&surveyAudioActive/);
 assert.match(app,/view\?\.gameId==='survey-show'/);
});
test('Survey Show music and effect playback use independent flags',()=>{
 assert.match(survey,/interface Params \{musicEnabled:boolean;effectsEnabled:boolean/);
 assert.match(survey,/if\(!musicEnabled\|\|!unlocked\)\{stopMusic\(\);return;\}/);
 assert.match(survey,/if\(!effectsEnabled\|\|!unlocked\)return;/);
 assert.match(survey,/values\.current\.effectsEnabled/);
 assert.match(survey,/if\(!effectsEnabled\)\{reactionQueue\.current=\[\];/);
 assert.doesNotMatch(survey,/values\.current\.enabled/);
});
test('President presenter has separate independent music and effects toggles',()=>{
 assert.match(pa,/usePresidentSounds\(view,now,offset\)/);
 assert.match(pa,/usePresidentMusic\(view\)/);
 assert.match(pa,/onClick=\{music\.toggle\}/);
 assert.match(pa,/onClick=\{sounds\.toggle\}/);
 assert.match(pa,/aria-label="Toggle music"/);
 assert.match(pa,/aria-label="Toggle sound effects"/);
 assert.match(presidentAudio,/localStorage\.getItem\('curtbox\.pa\.music'\)/);
 assert.match(presidentAudio,/localStorage\.setItem\('curtbox\.pa\.music'/);
 assert.match(presidentAudio,/localStorage\.getItem\(prefKey\)/);
 assert.match(presidentAudio,/new Audio\(`\/audio\/music\/\$\{track\}\.ogg`\)/);
 assert.match(presidentAudio,/const active=view\.me\.role==='host'&&/);
});
test('President effects can be muted without disabling music',()=>{
 assert.match(presidentAudio,/if\(!enabled&&context\.current\?\.state==='running'\)void context\.current\.suspend/);
 const source=presidentAudio.slice(presidentAudio.indexOf('export function usePresidentMusic'));
 assert.doesNotMatch(source,/usePresidentSounds|playSound\(/);
});

test('President music and SFX sliders are independently wired to live output volumes',()=>{
 assert.match(pa,/value=\{music\.volume\} onChange=\{e=>music\.setVolume\(Number\(e\.target\.value\)\)\}/);
 assert.match(pa,/value=\{sounds\.volume\} onChange=\{e=>sounds\.setVolume\(Number\(e\.target\.value\)\)\}/);
 assert.match(pa,/aria-label="Music volume"/);
 assert.match(pa,/aria-label="Sound effects volume"/);
 assert.match(presidentAudio,/curtbox\.pa\.musicVolume/);
 assert.match(presidentAudio,/curtbox\.pa\.effectsVolume/);
 assert.match(presidentAudio,/const output=useRef<GainNode\|null>/);
 assert.match(presidentAudio,/playSound\(context\.current,cue\.kind,output\.current\)/);
 assert.match(presidentAudio,/music\.volume=volumeRef\.current/);
 assert.match(presidentAudio,/if\(audio\.current\)audio\.current\.volume=normalized/);
 assert.match(presidentAudio,/if\(output\.current\)output\.current\.gain\.value=normalized/);
 assert.match(pa,/className="pa-phone-audio"/);
});
