import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const component=readFileSync(resolve(root,'client/src/ConnectionName.tsx'),'utf8');
const app=readFileSync(resolve(root,'client/src/App.tsx'),'utf8');
const pa=readFileSync(resolve(root,'client/src/PresidentAsshole.tsx'),'utf8');
const types=readFileSync(resolve(root,'shared/types.ts'),'utf8');
const paTypes=readFileSync(resolve(root,'shared/president.ts'),'utf8');
const css=readFileSync(resolve(root,'client/src/styles.css'),'utf8');

test('presentation indicator has an accessible disconnected label and no warning for bots',()=>{
 assert.match(component,/offline\s*&&\s*!bot/);
 assert.match(component,/aria-label="Disconnected"/);
 assert.match(component,/WifiOff/);
 assert.match(css,/\.connection-warning/);
});
test('Survey Show host lobby and stage show disconnected state alongside player names',()=>{
 const lobby=app.slice(app.indexOf('function LobbyStage('),app.indexOf('function GameStage('));
 const stage=app.slice(app.indexOf('function GameStage('),app.indexOf('function Admin('));
 assert.match(lobby,/ConnectionName name=\{player\.name\} offline=\{!player\.online\}/);
 assert.match(stage,/ConnectionName name=\{p\.name\} offline=\{!p\.online\}/);
 assert.match(app,/function SurveyReveal\(/);
 assert.match(app,/disconnected\.has\(seat\.playerId\)/);
});
test('President / Asshole table excludes bots and honors persisted online status',()=>{
 assert.match(pa,/ConnectionName name=\{p\.name\} offline=\{!p\.online\} bot=\{p\.bot\}/);
 assert.match(paTypes,/online:boolean;ready:boolean;bot:boolean/);
 assert.match(types,/online:boolean;\s*score:number;\s*presentation:boolean/);
});
test('connection warning is noninteractive and reduced-motion safe',()=>{
 assert.doesNotMatch(component,/<button|onClick/);
 assert.match(css,/\.connection-name/);
 assert.doesNotMatch(component,/setInterval|setTimeout/);
});
