import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PA_FINALE_INTRO_MS,PA_FINALE_RANK_MS,PA_FINALE_HOLD_MS,paFinaleVisibleRanks,paFinaleRevealEndsAt} from '../../shared/president.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const ui=readFileSync(resolve(root,'client/src/PresidentAsshole.tsx'),'utf8');
const css=readFileSync(resolve(root,'client/src/styles.css'),'utf8');

test('reveals final ranks from last place to President, synchronized to the server clock',()=>{
 const at=10000;
 assert.equal(PA_FINALE_INTRO_MS,1800);
 assert.equal(PA_FINALE_RANK_MS,800);
 assert.equal(PA_FINALE_HOLD_MS,10000);
 assert.equal(paFinaleVisibleRanks(at,at+1799,4),0);
 assert.equal(paFinaleVisibleRanks(at,at+1800,4),1);
 assert.equal(paFinaleVisibleRanks(at,at+2600,4),2);
 assert.equal(paFinaleVisibleRanks(at,at+3400,4),3);
 assert.equal(paFinaleVisibleRanks(at,at+4200,4),4);
 assert.equal(paFinaleVisibleRanks(at,at+5000,4),4);
 assert.equal(paFinaleRevealEndsAt(at,4),at+5000);
 assert.equal(paFinaleVisibleRanks(at,at-500,4),0);
 assert.equal(paFinaleVisibleRanks(at,at+1800,0),0);
 assert.match(ui,/const ranks=\[\.\.\.game\.handRanks\]\.sort\(\(a,b\)=>a\.position-b\.position\)/);
 assert.match(ui,/const visible=ranks\.slice\(Math\.max\(0,ranks\.length-revealed\)\)/);
 assert.match(ui,/className=\{'pa-finale-rank'/);
 assert.match(ui,/className="pa-finale-screen"/);
 assert.match(ui,/game\.finaleIsGameOver\?'GAME OVER!':'ROUND OVER!'/);
 assert.match(ui,/aria-label=\{game\.finaleIsGameOver\?"Game over finale":"Round over finale"\}/);
 assert.match(ui,/<h2>\{game\.finaleIsGameOver\?'GAME OVER!':'ROUND OVER!'\}<\/h2>/);
});

test('final reveal shows remaining time only after ranking animations finish',()=>{
 assert.match(ui,/serverNow>=paFinaleRevealEndsAt\(start,ranks\.length\)/);
 assert.match(ui,/revealDone\?<span>Stats in <strong>/);
 assert.match(ui,/game\.stage==='finale'\?<RankingsFinale/);
 assert.match(ui,/game\.stage==='finale'&&<div className="panel pa-message pa-finale-phone"/);
 assert.match(css,/@keyframes pa-finale-rank-enter/);
 assert.match(css,/@keyframes pa-finale-champion-enter/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.pa-finale-heading/);
});
