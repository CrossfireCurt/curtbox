/**
 * Install the two Mixkit Sound Effects Free License recordings used by Curtbox.
 *   Social: "Male crowd cheering short" (#459)
 *   Skipped phone: "Crowd laugh" (#424)
 *
 * Run: npm run audio:mixkit
 *
 * Source: https://mixkit.co/free-sound-effects/crowd/
 * License: https://mixkit.co/license/modal/sfxFree/
 * These are NOT CC0. Embedding in a video game is permitted, but distributing
 * recordings alone or alongside source files is not. Outputs are gitignored.
 */
import {mkdir,rename,rm,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const out=resolve(import.meta.dirname,'../client/public/audio/sfx');
const clips=[
 {id:459,title:'Male crowd cheering short',file:'mixkit-social-cheer-459.mp3'},
 {id:424,title:'Crowd laugh',file:'mixkit-skip-laugh-424.mp3'},
];
function isMP3(bytes){
 return bytes.subarray(0,3).toString('latin1')==='ID3' ||
  (bytes.length>=2&&bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0);
}
await mkdir(out,{recursive:true});
let failures=0;
for(const {id,title,file} of clips){
 const dest=join(out,file),tmp=dest+'.tmp';
 const url=`https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`HTTP ${response.status} ${response.statusText}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<4096||!isMP3(bytes))
   throw new Error('Mixkit returned an invalid or unexpectedly small MP3 file');
  await writeFile(tmp,bytes);
  await rename(tmp,dest);
  console.log(`✓ ${title} (#${id}): ${Math.round(bytes.length/1024)} KiB → ${dest}`);
 }catch(error){
  failures++;
  await rm(tmp,{force:true}).catch(()=>{});
  console.error(`✗ Could not install "${title}" (#${id}): ${error.message}`);
 }
}
if(failures){
 console.error('Download the missing clips from https://mixkit.co/free-sound-effects/crowd/ if Mixkit is unreachable.');
 process.exitCode=1;
}
