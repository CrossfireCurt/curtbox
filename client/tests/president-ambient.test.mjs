import assert from 'node:assert/strict';
import test from 'node:test';
import {ambientChord} from '../src/presidentAmbientMusic.ts';
test('offline background groove has repeatable distinct modes',()=>{
 const lobby=ambientChord('lobby',0),play=ambientChord('guess',0),decision=ambientChord('predict',0);
 assert.equal(lobby.length,4);
 assert.notDeepEqual(play,lobby);
 assert.notDeepEqual(decision,play);
 assert.deepEqual(ambientChord('guess',32),play);
 assert.deepEqual(ambientChord('unknown',0),lobby);
});
