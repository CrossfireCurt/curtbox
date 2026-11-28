import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const ui=read('client/src/App.tsx');
const president=read('client/src/PresidentAsshole.tsx');
const css=read('client/src/styles.css');
const navigation=read('client/src/tvNavigation.ts');

test('TV presenter has one compact header with room code and Menu; web desktop retains its controls',()=>{
 assert.match(ui,/className="room-header pa-host-header"/);
 assert.match(ui,/className="room-code">\{view.code\}/);
 assert.match(ui,/className="tv-host-menu"/);
 assert.match(ui,/<summary aria-label="Open TV host menu">Menu ▾<\/summary>/);
 assert.match(ui,/className="tv-host-menu-options"/);
 assert.match(ui,/setShowQR\(true\)/);
 assert.match(ui,/setShowSettings\(true\)/);
 assert.match(ui,/void leave\(\)/);
 assert.match(css,/\.tv-mode \.pa-host-header\{height:43px;min-height:43px/);
 assert.match(css,/\.tv-mode \.pa-host-header \.header-actions>\.btn\{display:none\}/);
 assert.match(css,/\.tv-mode \.pa-host-header \.room-code\{/);
 assert.match(css,/\.tv-mode \.tv-host-menu\{display:block/);
 assert.match(navigation,/summary, a\[href\]/);
});

test('TV hand title and countdown are beside the table, not in a second heading above it',()=>{
 assert.match(president,/className="pa-tv-side-status" aria-label="Game and hand status"/);
 assert.match(president,/Hand \{game.handNumber\|\|'—'\}/);
 assert.match(president,/className="pa-tv-side-clock"/);
 assert.match(css,/\.tv-mode \.pa-stage-head\{display:none\}/);
 assert.match(css,/\.pa-stage-head\{min-height:38px/,'ordinary web presenters keep the hand heading');
 assert.match(css,/\.tv-mode \.pa-tv-side-status\{display:flex/);
});

test('TV table ring sizes from viewport height; player seats are reduced so top and bottom are visible',()=>{
 assert.match(css,/\.tv-mode \.pa-table-ring\{height:calc\(100vh - 95px\);height:calc\(100dvh - 95px\);min-height:0;max-height:none\}/);
 assert.match(css,/\.tv-mode \.pa-table\{min-height:0;padding:6px;border:5px/);
 assert.match(css,/\.tv-mode \.pa-seat\{--pa-seat-header-font:clamp\(1\.08rem,1\.6vw,1\.38rem\);width:clamp\(116px,12\.5vw,170px\);max-width:24%;min-height:94px/);
 assert.match(css,/\.tv-mode \.pa-seat-card-stack\{transform:scale\(\.68\);transform-origin:center top;height:39px\}/);
 assert.match(css,/@media\(max-height:610px\)/);
 assert.match(css,/\.tv-mode \.pa-stage-columns\{grid-template-columns:minmax\(0,1fr\) 165px/);
});
