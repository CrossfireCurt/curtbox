/** Download known CC0 game audio into Curtbox's self-hosted Vite public directory.
 * Run: npm run audio:fetch. Requires internet access and `unzip` on PATH.
 * This step is intentionally opt-in, not a Docker build dependency.
 */
import {mkdir, writeFile, copyFile, rm, stat} from 'node:fs/promises';
import {join,resolve,basename} from 'node:path';
import {unpackAudioArchive} from './audio-archive.mjs';

const root=resolve(import.meta.dirname,'../client/public/audio');
const music=join(root,'music');
const sfx=join(root,'sfx');
await mkdir(music,{recursive:true});await mkdir(sfx,{recursive:true});

async function get(url){
 const res=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'Curtbox/0.1 (CC0 asset downloader)'}});
 if(!res.ok)throw Error(`${res.status} ${res.statusText}`);
 return Buffer.from(await res.arrayBuffer());
}
async function downloadFile(url,dest){
 const bytes=await get(url);
 if(bytes.length<1000)throw Error('unexpectedly small file');
 if(dest.endsWith('.ogg')&&bytes.subarray(0,4).toString()!=='OggS')throw Error('response is not an Ogg recording');
 await writeFile(dest,bytes);console.log(`  ✓ ${basename(dest)} (${Math.round(bytes.length/1024)} KiB)`);
}
const failures=[];
// Each original track is a CC0 composition on OpenGameArt.org.
const tracks=[
 ['lobby.ogg','https://opengameart.org/sites/default/files/catchyswing.ogg'],
 ['guess.ogg','https://opengameart.org/sites/default/files/swing.ogg'],
 ['predict.ogg','https://opengameart.org/sites/default/files/jazz.ogg'],
 ['finale.ogg','https://opengameart.org/sites/default/files/battle_music_01-loop.ogg'],
];
console.log('Background music (OpenGameArt CC0):');
for(const [file,url] of tracks){try{await downloadFile(url,join(music,file));}catch(e){failures.push(file);console.warn(`  ✗ ${file}: ${e.message}`);}}
console.log('CC0 reaction effects:');
for(const [file,url] of [
 ['reaction-applause.ogg','https://opengameart.org/sites/default/files/Well%20Done%20CCBY3.ogg'],
]){try{if(await stat(join(sfx,file)).then(()=>true,()=>false))continue;await downloadFile(url,join(sfx,file));}catch(e){failures.push(file);console.warn(`  ✗ ${file}: ${e.message}`);}}
// Kenney's CC0 packs provide real playable jingles and interface effects.
console.log('Kenney CC0 music jingles:');
try{
 const pack=await unpackAudioArchive([
  'https://kenney.nl/media/pages/assets/music-jingles/f37e530b9e-1677590399/kenney_music-jingles.zip',
  'https://opengameart.org/sites/default/files/jingleSounds_Kenney.zip'
 ],get);
 try{
  const files=pack.files.sort((a,b)=>a.localeCompare(b));
  const pick=(name)=>files.find(f=>f.toLowerCase().includes(name))??files[0];
  const cues={countdown:'nes00',reveal:'sax04',score:'sax08',winner:'sax16',joined:'nes03',wrong:'hit01',nailed:'sax11',celebrate:'sax15',womp:'pizzi01'};
  for(const [name,key] of Object.entries(cues))await copyFile(pick(key),join(sfx,`cue-${name}.ogg`));
  for(const name of ['wrong','nailed','celebrate','womp']){
   const dest=join(sfx,`reaction-${name}.ogg`);
   // Preserve any hand-curated CC0 emote recording; don't restore a generic jingle.
   if(!await stat(dest).then(()=>true,()=>false))await copyFile(join(sfx,`cue-${name}.ogg`),dest);
  }
  console.log(`  ✓ installed ${Object.keys(cues).length} playable jingles from ${files.length} pack files`);
 }finally{await rm(pack.dir,{recursive:true,force:true});}
}catch(e){failures.push('Kenney music jingles');console.warn(`  ✗ jingles: ${e.message}`);}
console.log('Kenney CC0 interface effects:');
try{
 const pack=await unpackAudioArchive([
  'https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip',
  'https://opengameart.org/sites/default/files/kenney_interfaceSounds.zip'
 ],get);
 try{
  const files=pack.files.sort((a,b)=>a.localeCompare(b));
  const preferred=files.filter(f=>/confirmation|select|click|switch|open|close|toggle|error/i.test(basename(f)));
  const pool=preferred.length>=5?preferred:files;
  const names=['crickets','highfive','aww','mindblown','thinking','womp','wrong','nailed','awkward','oooh','celebrate','drumroll','goat','facepalm','poop','barf','burp','woozy','finger','wtf','bullshit'];
  for(let i=0;i<names.length;i++){
   const dest=join(sfx,`reaction-${names[i]}.ogg`);
   // Do not overwrite actual matched recorded applause or other curated sounds.
   if(await stat(dest).then(()=>true,()=>false))continue;
   await copyFile(pool[(i*3)%pool.length],dest);
  }
  await copyFile(pool[0],join(sfx,'cue-joined.ogg'));
  console.log(`  ✓ installed ${names.length} playable reactions from ${files.length} pack files`);
 }finally{await rm(pack.dir,{recursive:true,force:true});}
}catch(e){failures.push('Kenney interface sounds');console.warn(`  ✗ interface sounds: ${e.message}`);}
if(failures.length){console.warn(`\nSome files could not be installed (${failures.join(', ')}). Run again on a network that allows those sources. Already downloaded files are retained.`);process.exitCode=1;}
else console.log('\nAll requested audio installed. Run npm run build to include it in the app.');
