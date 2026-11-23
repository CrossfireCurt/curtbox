import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const app=readFileSync(resolve(root,'client/src/App.tsx'),'utf8');
const css=readFileSync(resolve(root,'client/src/styles.css'),'utf8');
const lobby=app.slice(app.indexOf('function LobbyStage('),app.indexOf('function GameStage('));
test('lobby has 8 stable seats with empty placeholders and controller highlight',()=>{
 assert.match(lobby,/Array\.from\(\{length:8\}/);
 assert.match(lobby,/lobby-controller-tag/);
 assert.match(lobby,/OPEN SLOT/);
 assert.match(lobby,/lobby-player-name/);
});
test('host lobby includes a visible room QR and clearly displayed code',()=>{
 assert.match(lobby,/<QRCodeSVG/);
 assert.match(lobby,/roomPath\(view\.code\)/);
 assert.match(lobby,/lobby-room-code/);
 assert.match(lobby,/NEED AT LEAST 2 PLAYERS TO START/);
});
test('no scoring strip in lobby; show scoreboard during gameplay only',()=>{
 const stage=app.slice(app.indexOf('function GameStage('),app.indexOf('function Admin('));
 assert.match(stage,/view\.status==='playing'&&g&&<>/);
 assert.match(stage,/className=\{'board-bottom'/);
 assert.ok(!lobby.includes('score-strip'));
});
test('player grid has four big screen columns, two rows, arrival animation, responsive fallback',()=>{
 assert.match(css,/\.lobby-players-grid\{[^}]*grid-template-columns:repeat\(4/);
 assert.match(css,/grid-template-rows:repeat\(2/);
 assert.match(css,/@keyframes lobby-seat-join/);
 assert.match(css,/@media\(max-width:650px\)/);
});
test('real audio download script and license inventory are provided',()=>{
 const script=readFileSync(resolve(root,'scripts/fetch-audio.mjs'),'utf8');
 assert.match(script,/opengameart\.org\/sites\/default\/files\/catchyswing\.ogg/);
 assert.match(script,/kenney\.nl\/media\/pages\/assets\/music-jingles/);
 assert.match(readFileSync(resolve(root,'docs/AUDIO_ASSET_SOURCES.md'),'utf8'),/CC0/);
});
