import assert from 'node:assert/strict';
import test from 'node:test';
import {presidentSoundCues,newPresidentSoundCues} from '../src/presidentSoundEvents.ts';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const base={stage:'play',handNumber:1,handRanks:[],previousRanks:[],seats:[],activeDecrees:[],presidencies:{},longestStreak:{},names:{},decreeActionsRemaining:0,handStats:{},playerStats:{}};
const cues=(game,role,playerId,now=10000,turnSeconds=30)=>presidentSoundCues({game:{...base,...game},role,playerId,now,offset:0,turnSeconds});
const kinds=items=>items.map(x=>x.kind);
test('card, Social cheering, and whoosh are presenter-only',()=>{
 const game={lastPlayed:{serial:1,at:9000,by:'p1'},lastClear:{serial:2,at:9050,by:'p1',reason:'Social',cards:['7C']}};
 assert.deepEqual(kinds(cues(game,'host','host')),['card','social','clear']);
 assert.deepEqual(kinds(cues(game,'player','p1')),[]);
});
test('skip event sounds on skipped phone and board; not other players',()=>{
 const game={lastSkip:{serial:5,at:9500,by:'p1',skipped:'p2'}};
 assert.deepEqual(kinds(cues(game,'host','host')),['skip']);
 assert.deepEqual(kinds(cues(game,'player','p2')),['skip']);
 assert.deepEqual(kinds(cues(game,'player','p1')),[]);
});
test('drink glass clink plays only for the targeted phone',()=>{
 const game={myDrinkEvent:{serial:8,at:9500}};
 assert.deepEqual(kinds(cues(game,'player','p3')),['drink']);
 assert.deepEqual(kinds(cues(game,'host','host')),[]);
});
test('turn cue is on the active phone only and final five seconds tick once per second',()=>{
 const turnEndsAt=38000; // 30 second turn began at 8000
 assert.deepEqual(kinds(cues({currentPlayerId:'p1',turnEndsAt},'player','p1',9000)),['turn']);
 assert.deepEqual(kinds(cues({currentPlayerId:'p1',turnEndsAt},'player','p2',9000)),[]);
 assert.deepEqual(kinds(cues({currentPlayerId:'p1',turnEndsAt},'player','p1',33900)),['tick']);
 assert.deepEqual(kinds(cues({currentPlayerId:'p1',turnEndsAt},'player','p1',39000)),[]);
});
test('duplicate room snapshots never replay the same sound and distant events expire',()=>{
 const game={lastPlayed:{serial:12,by:'p1',at:9000}};
 const seen=new Set();
 assert.equal(newPresidentSoundCues(cues(game,'host','host'),seen).length,1);
 assert.equal(newPresidentSoundCues(cues(game,'host','host'),seen).length,0);
 assert.equal(cues(game,'host','host',20000).length,0);
});
test('presenter countdown belongs to the active player seat and follows server deadline',()=>{
 const ui=read('client/src/PresidentAsshole.tsx'),css=read('client/src/styles.css');
 assert.match(ui,/game\.currentPlayerId===p\.id&&game\.turnEndsAt!==undefined/);
 assert.match(ui,/role="timer"/);
 assert.match(ui,/formatLeft\(game\.turnEndsAt,now,offset\)/);
 assert.match(css,/\.pa-seat-timer\.is-low/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('audio is user-controllable and generated locally rather than fetched',()=>{
 const audio=read('client/src/presidentAudio.ts'),ui=read('client/src/PresidentAsshole.tsx');
 assert.match(audio,/new AudioContext\(\)/);
 assert.match(audio,/localStorage\.setItem/);
 assert.match(ui,/sounds\.toggle/);
 const synthesized=audio.split('export function usePresidentMusic')[0];
 assert.doesNotMatch(synthesized,/\.ogg|\.mp3|https:\/\//);
 assert.match(audio,/\/audio\/music\//);
});

test('finishing Social cheers/clears and glass clink survive transition into Ready',()=>{
 const social={stage:'ready',lastClear:{serial:24,at:9200,by:'p2',reason:'Social',cards:['9C','9D','9H','9S']},myDrinkEvent:{serial:25,at:9200}};
 assert.deepEqual(kinds(cues(social,'host','host',10000)),['social','clear']);
 assert.deepEqual(kinds(cues(social,'player','p3',10000)),['drink']);
 assert.deepEqual(kinds(cues(social,'player','p3',13000)),[]);
});
