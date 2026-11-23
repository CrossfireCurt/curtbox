import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import test from 'node:test';

const source=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'../src/App.tsx'),'utf8');
const personalStart=source.indexOf('className="player-layout"');
const personalView=source.slice(personalStart,source.indexOf('  {showQR&&',personalStart));
const hostStage=source.slice(source.indexOf('function LobbyStage('),source.indexOf('function Admin('));

test('personal player view does not repeat TV scoreboard or room identification',()=>{
 assert.ok(personalView.startsWith('className="player-layout"'));
 for(const absent of ['player-heading','player-score','roster-panel','room-code','SURVEY SHOW · ROOM','<Leaderboard','<Highlights','view.me.name','currentName','players.length}/8']) {
  assert.ok(!personalView.includes(absent),`Unexpected player content: ${absent}`);
 }
});
test('only controller starts game and start is disabled when fewer than two players',()=>{
 assert.match(personalView,/view\.me\.primary&&view\.status==='lobby'&&<button[^>]*disabled=\{players\.length<2\}/);
 assert.match(personalView,/>Start game<\/button>/);
 assert.ok(!personalView.includes('Need at least 2 players to start'));
 assert.ok(!personalView.includes('Start game ·'));
});
test('host display communicates number of players and why starting is blocked',()=>{
 assert.match(hostStage,/\{players\.length\} \/ 8/);
 assert.match(hostStage,/NEED AT LEAST 2 PLAYERS TO START/);
 assert.match(hostStage,/className="score-strip"/);
});
