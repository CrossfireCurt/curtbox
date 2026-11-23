import assert from 'node:assert/strict';
import test from 'node:test';
import {roomFromPath,roomPath} from '../src/roomRoute.ts';

test('canonical Curtbox room URLs load their exact room',()=>{
 assert.equal(roomFromPath('/room/IBUY'),'IBUY');
 assert.equal(roomFromPath('/room/ibuy'),'IBUY');
 assert.equal(roomFromPath('/room/IBUY/'),'IBUY');
 assert.equal(roomPath('ibuy'),'/room/IBUY');
});
test('legacy QR codes and punctuation at end of shared links still work',()=>{
 assert.equal(roomFromPath('/join/IBUY'),'IBUY');
 assert.equal(roomFromPath('/join/IBUY/'),'IBUY');
 assert.equal(roomFromPath('/room/IBUY,'),'IBUY');
});
test('invalid or unrelated paths are not interpreted as room codes',()=>{
 for(const path of ['/','/admin','/room/ABC','/room/ABCDE','/room/AB1D','/room/IBUY/extra','/join/']){
  assert.equal(roomFromPath(path),'',path);
 }
});
