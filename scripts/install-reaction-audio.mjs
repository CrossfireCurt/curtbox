/**
 * Install individually curated CC0 reaction recordings downloaded manually from
 * the Freesound links in docs/REACTION_AUDIO_CATALOG.md.
 *
 * Download each original recording to assets/reaction-raw/ and rename it to
 * <reaction-id>.<original-extension> (e.g. crickets.wav). Then run:
 *    npm run audio:reactions
 *
 * Requires ffmpeg on PATH. Converts, normalizes and trims each recording into
 * the .ogg filenames the Curtbox host player already looks for.
 */
import {readdir, readFile, mkdir, rename, rm} from 'node:fs/promises';
import {join, resolve, extname, basename} from 'node:path';
import {execFileSync} from 'node:child_process';

const root=resolve(import.meta.dirname,'..');
const inbox=join(root,'assets','reaction-raw');
const out=join(root,'client','public','audio','sfx');
const manifest=JSON.parse(await readFile(join(root,'docs','REACTION_AUDIO_CATALOG.json'),'utf8'));
const check=process.argv.includes('--check');
const extensions=new Set(['.wav','.wave','.mp3','.ogg','.flac','.aif','.aiff','.m4a','.opus']);
await mkdir(inbox,{recursive:true});
await mkdir(out,{recursive:true});
const supplied=(await readdir(inbox)).filter(f=>extensions.has(extname(f).toLowerCase()));
const allowed=new Set(manifest.map(x=>x.id));
if(allowed.size!==22)throw Error('Expected 22 unique reaction IDs in catalog');
if(!check){
 try{execFileSync('ffmpeg',['-version'],{stdio:'ignore',timeout:10000});}
 catch{console.error('ffmpeg is required. macOS: brew install ffmpeg');process.exit(1);}
}
let installed=0,missing=0,failed=0;
for(const item of manifest){
 const matches=supplied.filter(name=>basename(name,extname(name))===item.id);
 if(!matches.length){missing++;console.log(`  - ${item.label.padEnd(14)} missing: ${item.id}.wav/mp3/ogg/etc`);continue;}
 if(matches.length>1){failed++;console.error(`  ! ${item.label}: multiple candidate files: ${matches.join(', ')}`);continue;}
 if(check){installed++;console.log(`  ✓ ${item.label.padEnd(14)} ${matches[0]}`);continue;}
 const source=join(inbox,matches[0]);
 const target=join(out,`reaction-${item.id}.ogg`);
 const temp=target+'.tmp.ogg';
 try{
  execFileSync('ffmpeg',[
   '-hide_banner','-nostdin','-loglevel','error','-y',
   '-i',source,'-t',String(item.maxSeconds),'-vn',
   '-af','loudnorm=I=-18:TP=-2:LRA=9',
   '-ar','44100','-ac','2','-c:a','libvorbis','-q:a','4',temp
  ],{timeout:120000,stdio:'pipe'});
  await rename(temp,target);
  installed++;console.log(`  ✓ ${item.label.padEnd(14)} ${matches[0]} → reaction-${item.id}.ogg`);
 }catch(e){
  failed++;await rm(temp,{force:true});
  console.error(`  ! ${item.id}: ${(e.stderr?.toString()||e.message).slice(-500)}`);
 }
}
console.log(`\n${check?'Available':'Installed'}: ${installed}/22; missing: ${missing}; errors: ${failed}.`);
if(missing)console.log('See docs/REACTION_AUDIO_CATALOG.md for all source URLs and download instructions.');
if(installed===22 && !check)console.log('All 22 reactions are ready for npm run build and Docker.');
if(failed)process.exitCode=1;
