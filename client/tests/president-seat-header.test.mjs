import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const ui=readFileSync(resolve(root,'client/src/PresidentAsshole.tsx'),'utf8');
const css=readFileSync(resolve(root,'client/src/styles.css'),'utf8');
test('rank emoji precedes name and timer aligns to its right in one header',()=>{
 const head=ui.slice(ui.indexOf('<div className="pa-seat-header">'),ui.indexOf('{finish?<div className="pa-seat-finished"'));
 assert.ok(head.indexOf('className="pa-seat-rank-icon"')>=0);
 assert.ok(head.indexOf('className="pa-seat-rank-icon"')<head.indexOf('className="pa-seat-player-name"'));
 assert.ok(head.indexOf('className="pa-seat-player-name"')<head.indexOf('className="pa-bot-icon"'));
 assert.ok(head.indexOf("className={'pa-seat-timer'")>head.indexOf('className="pa-seat-player-name"'));
 assert.match(css,/\.pa-seat-header\{display:flex;align-items:center;justify-content:space-between;width:100%;min-width:0;gap:8px\}/);
 assert.match(css,/\.pa-seat-identity\{width:auto;flex:1 1 auto;min-width:0/);
 assert.match(css,/\.pa-seat \.pa-seat-player-name\{font-weight:850;line-height:1\.16;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/);
});
test('name and timer use identical font sizes at all responsive breakpoints',()=>{
 assert.match(css,/\.pa-seat \.pa-seat-player-name,\.pa-seat \.pa-seat-timer\{font-size:clamp\(1\.12rem,1\.55vw,1\.48rem\)\}/);
 assert.match(css,/\.pa-seat \.pa-seat-player-name,\.pa-seat \.pa-seat-timer\{font-size:clamp\(1\.01rem,2vw,1\.27rem\)\}/);
 assert.match(css,/\.pa-seat \.pa-seat-player-name,\.pa-seat \.pa-seat-timer\{font-size:\.98rem\}/);
 assert.match(css,/\.pa-seat \.pa-seat-timer\{position:static;flex:0 0 auto;display:block;padding:0;margin:0;border:0/);
 assert.match(css,/\.pa-seat \.pa-seat-timer\.is-low\{border:0;background:transparent;color:#ff9785/);
});

test('nested ConnectionName text inherits the same visible font size as the countdown',()=>{
 // The old generic ".pa-seat span" rule gives nested player-name spans
 // 12px, even while the strong parent and timer share a larger font size.
 assert.match(css,/\.pa-seat span\{font-size:12px/);
 assert.match(css,/\.pa-seat \.pa-seat-player-name \.connection-name,\s*\.pa-seat \.pa-seat-player-name \.connection-name-text\{font-size:inherit;line-height:inherit\}/);
 assert.ok(css.indexOf('.pa-seat .pa-seat-player-name .connection-name,')>css.indexOf('.pa-seat span{font-size:12px'),'specific repair must come after generic legacy span rule');
 assert.match(css,/\.pa-seat \.pa-seat-player-name,\.pa-seat \.pa-seat-timer\{font-size:clamp\(1\.12rem,1\.55vw,1\.48rem\)\}/);
 assert.match(css,/\.pa-seat-name-row\{display:flex;align-items:center/);
});
test('seat header uses space near the top rather than being vertically centered',()=>{
 assert.match(css,/\.pa-seat\{min-height:142px;gap:10px;padding:10px 12px 12px;justify-content:flex-start\}/);
 assert.match(css,/\.pa-seat-header\{display:flex;align-items:center;justify-content:space-between/);
 assert.match(css,/\.pa-seat \.pa-seat-timer\{position:static/);
 assert.match(css,/\.pa-seat-card-stack\{position:relative/);
});
