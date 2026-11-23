import test from 'node:test';
import assert from 'node:assert/strict';
import {presidentPlayButtonMode} from '../src/presidentSelection.ts';
import {topRankRun,completesFourOfKind} from '../../shared/president.ts';
import {readFileSync} from 'node:fs';
test('Social counts successive top rank cards rather than the last play size',()=>{
 assert.deepEqual(topRankRun(['4C','4D']),{rank:'4',count:2});
 assert.equal(completesFourOfKind(['4C','4D'],['4H','4S']),true);
 assert.equal(completesFourOfKind(['6H','4C','4D'],['4H','4S']),true);
 assert.equal(completesFourOfKind(['4C','6H','4D'],['4H','4S']),false);
});
test('single button becomes Social for top-run completion or one four-card play',()=>{
 assert.deepEqual(presidentPlayButtonMode(['4H','4S'],{rank:'4',count:2},false,true),{label:'Social!',enabled:true,social:true});
 assert.deepEqual(presidentPlayButtonMode(['7C','7D','7H','7S'],undefined,true,false),{label:'Social!',enabled:true,social:true});
 assert.deepEqual(presidentPlayButtonMode(['4H'],{rank:'4',count:2},true,true),{label:'Play',enabled:true,social:false});
 assert.equal(presidentPlayButtonMode(['4H','4S'],{rank:'4',count:2},false,false).enabled,false);
});
test('phone uses only one Play / Social button',()=>{
 const ui=readFileSync(new URL('../src/PresidentAsshole.tsx',import.meta.url),'utf8');
 assert.match(ui,/playButton\.label/);assert.match(ui,/choose\(playButton.social\)/);
 assert.doesNotMatch(ui,/>Social!<\/button>/);
});
