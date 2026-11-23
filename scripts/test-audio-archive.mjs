import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {unpackAudioArchive} from './audio-archive.mjs';

async function sampleZip(){
 const dir=await mkdtemp(join(tmpdir(),'curtbox-audio-test-'));
 try{
  const source=join(dir,'source');await mkdir(source);
  for(let i=0;i<6;i++)await writeFile(join(source,`sound-${i}.ogg`),randomBytes(300));
  const zip=join(dir,'sample.zip');
  execFileSync('zip',['-q',zip,...Array.from({length:6},(_,i)=>`sound-${i}.ogg`)],{cwd:source});
  return await readFile(zip);
 }finally{await rm(dir,{recursive:true,force:true});}
}

test('invalid HTTP-200 body falls through to valid backup audio ZIP',async()=>{
 const valid=await sampleZip();let attempted=[];
 const pack=await unpackAudioArchive(['https://one.example/zip','https://two.example/zip'],async url=>{
  attempted.push(url);return url.includes('one.example')?Buffer.from('<html>'.repeat(2000)):valid;
 });
 try{
  assert.equal(pack.files.length,6);
  assert.equal(attempted.length,2);
 }finally{await rm(pack.dir,{recursive:true,force:true});}
});

test('corrupt ZIP falls through to valid backup audio ZIP',async()=>{
 const valid=await sampleZip();let calls=0;
 const pack=await unpackAudioArchive(['https://one.example/zip','https://two.example/zip'],async()=>++calls===1?Buffer.concat([Buffer.from([0x50,0x4b,0x03,0x04]),randomBytes(1500)]):valid);
 try{assert.equal(pack.files.length,6);assert.equal(calls,2);}finally{await rm(pack.dir,{recursive:true,force:true});}
});

test('no valid archive produces meaningful source errors',async()=>{
 await assert.rejects(()=>unpackAudioArchive(['https://one.example/zip','https://two.example/zip'],async()=>Buffer.alloc(1600)),/All archive sources failed: .*not a ZIP archive.*not a ZIP archive/);
});
