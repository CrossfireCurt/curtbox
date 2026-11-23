import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {cardBackStackLayout} from '../src/presidentSeatCards.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const ui=readFileSync(resolve(root,'client/src/PresidentAsshole.tsx'),'utf8');
const css=readFileSync(resolve(root,'client/src/styles.css'),'utf8');

test('three cards render three overlapping backs rather than a text count',()=>{
 for(let count=1;count<=13;count++){
  const layout=cardBackStackLayout(count);
  assert.equal(layout.visible,count);
  assert.equal(layout.hidden,0);
  assert.ok(layout.width<=100);
 }
 assert.equal(cardBackStackLayout(3).visible,3);
 assert.equal(cardBackStackLayout(3).step,12);
 assert.equal(cardBackStackLayout(3).width,62);
 assert.equal(cardBackStackLayout(0).visible,0);
 assert.equal(cardBackStackLayout(20).visible,16);
 assert.equal(cardBackStackLayout(20).hidden,4);
 assert.match(ui,/function FaceDownCardStack\(\{count\}/);
 assert.match(ui,/Array\.from\(\{length:layout\.visible\}/);
 assert.match(ui,/className="pa-seat-card-back"/);
 assert.match(ui,/className="pa-seat-card-pattern"/);
 assert.match(ui,/role="img" aria-label=\{\x60\$\{layout\.count\}/);
 assert.doesNotMatch(ui,/\x60\$\{p\.cards\} cards\x60/);
});
test('rank emoji is positioned beside larger player name; current finishing rank wins',()=>{
 assert.match(ui,/const rankPosition=finish\?\?p\.position/);
 assert.match(ui,/const rankTotal=finish\?game\.handPlayerCount:rankCount/);
 assert.match(ui,/className="pa-seat-name-row"/);
 assert.match(ui,/className="pa-seat-player-name"/);
 assert.match(ui,/className="pa-seat-rank-icon"/);
 assert.match(ui,/rankIcon\(rankPosition,rankTotal,s\.mode==='asshole'\)/);
 assert.match(ui,/aria-label=\{seatRank\}/);
 assert.doesNotMatch(ui,/p\.position&&!finish&&<small>\{rankTitle/);
 assert.match(ui,/aria-label="Bot"/);
 assert.match(css,/\.pa-seat \.pa-seat-player-name\{font-size:clamp\(1\.12rem/);
});
test('turn timer is large, unboxed, top-right, server-timed and visible only on turn',()=>{
 assert.match(ui,/game\.stage==='play'&&game\.currentPlayerId===p\.id/);
 assert.match(ui,/role="timer"/);
 assert.match(ui,/\{formatLeft\(game\.turnEndsAt,now,offset\)\}/);
 assert.match(css,/\.pa-seat \.pa-seat-timer\{position:absolute;top:8px;right:11px/);
 assert.match(css,/\.pa-seat \.pa-seat-timer\{[^}]*border:0/);
 assert.match(css,/\.pa-seat \.pa-seat-timer\.is-low\{/);
});
test('finished player keeps green outline and no card stack; 4–8 seat layout unchanged',()=>{
 assert.match(ui,/finish\?<div className="pa-seat-finished"/);
 assert.match(ui,/Finished as \$\{seatRank\}/);
 assert.match(css,/\.pa-seat\.finished\{border:4px solid #4aff9f/);
 assert.match(ui,/const angle=2\*Math\.PI\*i\/Math\.max\(1,game\.seats\.length\)/);
 assert.match(css,/@media\(max-width:850px\)/);
 assert.match(css,/@media\(max-width:560px\)/);
});
