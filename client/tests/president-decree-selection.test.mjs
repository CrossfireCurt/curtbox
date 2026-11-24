import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decreeActionDescription} from '../src/presidentDecreeDescriptions.ts';
import {PA_DECREE_NAMES,PA_DEFAULT_SETTINGS} from '../../shared/president.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const ui=readFileSync(resolve(root,'client/src/PresidentAsshole.tsx'),'utf8');
const css=readFileSync(resolve(root,'client/src/styles.css'),'utf8');
const server=readFileSync(resolve(root,'server/src/president.ts'),'utf8');

test('the presenter has no duplicate ROOM CODE panel beside the table',()=>{
 assert.doesNotMatch(ui,/<div className="section-kicker">ROOM CODE<\/div>/);
 assert.match(ui,/<aside className="pa-aside"><div className="panel"><h3>Presidencies<\/h3>/);
 assert.match(ui,/const roomCode=view.code/,'the room code remains available in the existing results footer');
});

test('choosing an ordinary Presidential decree does not submit until Enact or Repeal is pressed',()=>{
 assert.match(ui,/const \[selectedDecree,setSelectedDecree\]=useState/);
 assert.match(ui,/aria-pressed=\{expanded\} aria-expanded=\{expanded\}/);
 assert.match(ui,/onClick=\{\(\)=>setSelectedDecree\(old=>old===key\?undefined:key\)\}/);
 assert.match(ui,/className="pa-decree-explanation"/);
 assert.match(ui,/disabled=\{!selectedAction\}/);
 assert.match(ui,/selectedAction&&void onAction\('president:decree',\{action:selectedAction\}\)/);
 assert.match(ui,/>\{selectedAction\?\.kind==='repeal'\?'Repeal':'Enact'\}<\/button>/);
 assert.doesNotMatch(ui,/className="choice-card" key=\{optionKey\(a\)\} onClick=\{\(\)=>void onAction\('president:decree'/);
 assert.match(css,/\.pa-decree-option\.is-selected/);
 assert.match(css,/\.pa-decree-list\{max-height:min\(52vh,480px\);overflow-y:auto/);
});

test('Democracy selections expand an explanation and retain separate proposal submission',()=>{
 assert.match(ui,/const key=optionKey\(a\),checked=nominees.includes\(key\)/);
 assert.match(ui,/checked&&<p className="pa-decree-explanation">/);
 assert.match(ui,/Propose \{nominees.length\} change/);
 assert.match(ui,/Skip decree/);
});

test('every decree has a meaningful description with current host settings and action details',()=>{
 for(const key of Object.keys(PA_DECREE_NAMES)){
  const desc=decreeActionDescription({key,kind:'enact',...(key==='max_active'?{value:3}:{})},PA_DEFAULT_SETTINGS);
  assert.ok(desc.length>55,key);
  assert.ok(!desc.includes('undefined'),key);
 }
 assert.match(decreeActionDescription({key:'double_trouble',kind:'enact'},PA_DEFAULT_SETTINGS),/two 3s/);
 assert.match(decreeActionDescription({key:'term_limits',kind:'enact'},PA_DEFAULT_SETTINGS),/3 complete hands/);
 assert.match(decreeActionDescription({key:'term_limits',kind:'enact'},{...PA_DEFAULT_SETTINGS,termSelfExpires:true}),/can expire/);
 assert.match(decreeActionDescription({key:'max_active',kind:'enact',value:4},PA_DEFAULT_SETTINGS),/4 active decrees/);
 assert.match(decreeActionDescription({key:'card_exchange',kind:'repeal'},PA_DEFAULT_SETTINGS,2),/reduces Card Exchange from Level 2 to Level 1/);
 assert.match(decreeActionDescription({key:'reverse_play',kind:'repeal'},PA_DEFAULT_SETTINGS),/removes the decree/);
});

test('the existing server remains authoritative: simply selecting an option cannot apply a decree',()=>{
 assert.match(server,/export function decreePA\(/);
 assert.match(server,/if\(a\)apply\(r,a\);afterDecision\(r\)/);
});
