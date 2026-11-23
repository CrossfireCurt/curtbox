import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const ui=read('client/src/PresidentAsshole.tsx');
const app=read('client/src/App.tsx');
test('presentation header is minimal; audio and game settings share modal',()=>{
 const start=ui.indexOf('className="pa-stage-head"');
 const end=ui.indexOf('{resultsTakeover?<section');
 const header=ui.slice(start,end);
 assert.doesNotMatch(header,/pa-audio-controls|Music volume|Sound effects volume/);
 assert.match(ui,/settingsOpen&&onCloseSettings&&<div className="modal-backdrop"/);
 assert.match(ui,/<h3>Audio<\/h3>/);
 assert.match(ui,/<h3>Game settings<\/h3>/);
 assert.match(ui,/<PASettingsEditor settings=\{s\} onChange=\{onSettingsChange\}/);
 assert.match(ui,/music\.setVolume/);
 assert.match(ui,/sounds\.setVolume/);
});
test('presenter Settings button stays accessible during active play',()=>{
 assert.match(app,/view\.status!=='setup'&&!view\.me\.hostWaiting&&<button className="btn btn-small" onClick=\{\(\)=>setShowSettings\(true\)\}>Settings/);
 assert.match(app,/settingsOpen=\{showSettings\}/);
 assert.match(app,/onCloseSettings=\{\(\)=>setShowSettings\(false\)\}/);
});
test('player effects controls have their own compact settings disclosure',()=>{
 assert.match(ui,/<details className="pa-phone-settings">/);
 assert.match(ui,/<summary>⚙ Settings<\/summary>/);
});
