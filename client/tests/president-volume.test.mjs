import assert from 'node:assert/strict';
import test from 'node:test';
import {clampPresidentVolume,readPresidentVolume} from '../src/presidentVolume.ts';
test('persisted President category volumes accept valid 0 to 1 values',()=>{
 assert.equal(readPresidentVolume('0',.2),0);
 assert.equal(readPresidentVolume('0.65',.2),.65);
 assert.equal(readPresidentVolume('1',.2),1);
 assert.equal(readPresidentVolume(null,.2),.2);
 assert.equal(readPresidentVolume('',.65),.65);
 assert.equal(readPresidentVolume('bad',.65),.65);
 assert.equal(readPresidentVolume('5',.65),.65);
 assert.equal(readPresidentVolume('-0.2',.65),.65);
});
test('slider values are clamped before reaching Web Audio gain / track volume',()=>{
 assert.equal(clampPresidentVolume(-20),0);
 assert.equal(clampPresidentVolume(.45),.45);
 assert.equal(clampPresidentVolume(10),1);
 assert.equal(clampPresidentVolume(NaN),0);
 assert.equal(clampPresidentVolume(Infinity),0);
});
