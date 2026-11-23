/**
 * Install Mixkit's "Male crowd cheering short" (SFX #459) for President Socials.
 * Run: npm run audio:social
 *
 * This sound uses the Mixkit Sound Effects Free License (NOT CC0):
 * https://mixkit.co/license/modal/sfxFree/
 * https://mixkit.co/free-sound-effects/crowd/
 *
 * Mixkit permits embedding SFX in games, but not distributing the standalone
 * recording with source files. Keep this downloaded file out of Git.
 */
import {mkdir,rename,rm,stat,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

export const source='https://assets.mixkit.co/active_storage/sfx/459/459-preview.mp3';
const dest=resolve(import.meta.dirname,'../client/public/audio/sfx/mixkit-social-cheer-459.mp3');
const tmp=dest+'.tmp';

function isMP3(bytes){
 return bytes.subarray(0,3).toString('latin1')==='ID3' ||
  (bytes.length>=2&&bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0);
}

try{
 await mkdir(resolve(import.meta.dirname,'../client/public/audio/sfx'),{recursive:true});
 const response=await fetch(source,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error(`Mixkit returned HTTP ${response.status} ${response.statusText}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length<4096||!isMP3(bytes))
  throw new Error('Mixkit returned an invalid or unexpectedly small MP3 file');
 await writeFile(tmp,bytes);
 await rename(tmp,dest);
 console.log(`Installed Mixkit Social cheer (sound #459, ${Math.round(bytes.length/1024)} KiB) at ${dest}`);
}catch(error){
 await rm(tmp,{force:true}).catch(()=>{});
 console.error(`Could not download Mixkit Social cheer: ${error.message}`);
 console.error('Open https://mixkit.co/free-sound-effects/crowd/ and look for "Male crowd cheering short" to download manually if needed.');
 process.exitCode=1;
}
