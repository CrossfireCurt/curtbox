import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const ui=read('client/src/PresidentAsshole.tsx'),engine=read('server/src/president.ts');
const types=read('shared/president.ts');
test('presenter keeps ranked table, phone selects only its own rank and stats',()=>{
 assert.match(ui,/function HandResults\(\{game,asshole,viewerId\}/);
 assert.match(ui,/viewerId\?game\.handRanks\.filter\(p=>p\.id===viewerId\)/);
 assert.match(ui,/!viewerId\|\|p\.id===viewerId/);
 assert.match(ui,/resultsTakeover\?<section className="pa-results-screen"/);
 assert.match(ui,/viewerId=\{view\.me\.id\}/);
 assert.match(ui,/rankTitle\(p\.position,n,asshole\)/);
});
test('rank and name are both in the result heading, zero stats omitted',()=>{
 assert.match(ui,/<h3 className="pa-result-heading">/);
 assert.match(ui,/className="pa-result-title"/);
 assert.match(ui,/className="pa-result-name"/);
 assert.match(ui,/stats\.length>0&&<div className="pa-result-stats"/);
 assert.match(ui,/resultStatChips\(game\.handStats\[p\.id\],game\.presidencies\[p\.id\]\?\?0\)/);
 assert.match(types,/interface PAPlayerStats.*skips:number/);
 assert.match(engine,/handStats:g\.handStats\?\?\{\},playerStats:g\.playerStats\?\?\{\}/);
 assert.doesNotMatch(ui,/Cards played|Piles cleared|2s played|Best streak/);
});
test('departed and newly joined players remain distinct',()=>{
 assert.match(ui,/Left table/);
 assert.match(ui,/Unranked/);
 assert.match(ui,/Joining next hand/);
 assert.match(ui,/seat\?\.bot/);
});

test('player ready result says You are the rank without repeating player name',()=>{
 assert.match(ui,/viewerId\?\`You're the \$\{rankTitle\(p\.position,n,asshole\)\}!\`/);
 assert.match(ui,/\{!viewerId&&<span className="pa-result-name"/);
 assert.match(ui,/viewerId\?'Joining next hand'/);
 const start=ui.indexOf("game.stage==='ready'&&<div");
 const end=ui.indexOf("game.stage==='exchange'&&<div",start);
 const ready=ui.slice(start,end);
 assert.ok(ready.indexOf('<HandResults')>=0);
 assert.ok(ready.indexOf('<HandResults')<ready.indexOf('className="pa-ready-question"'));
 assert.ok(ready.indexOf('className="pa-ready-question"')<ready.indexOf("onAction('president:ready'"));
 assert.match(ready, /Ready for another hand\?/);
});
