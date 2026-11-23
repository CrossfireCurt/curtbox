/** Audio-archive fetch/validation. Keep separately testable; HTML responses from
 * source sites may have HTTP 200, and must not suppress backup URLs. */
import {mkdir,mkdtemp,readdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,extname} from 'node:path';
import {execFileSync} from 'node:child_process';

async function listFiles(dir){
 const out=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isDirectory())out.push(...await listFiles(path));
  else out.push(path);
 }
 return out;
}
export async function unpackAudioArchive(urls,get){
 const dir=await mkdtemp(join(tmpdir(),'curtbox-audio-'));
 const zip=join(dir,'pack.zip');
 const output=join(dir,'unpacked');
 const errors=[];
 try{
  // A website may return an HTML error/challenge with HTTP 200. Validate each
  // candidate BEFORE deciding that the first URL succeeded, so mirrors are tried.
  for(const url of urls){
   try{
    const bytes=await get(url);
    if(bytes.length<1000||bytes[0]!==0x50||bytes[1]!==0x4b||![3,5,7].includes(bytes[2])||![4,6,8].includes(bytes[3])){
     throw Error(`not a ZIP archive (${bytes.length} bytes; possibly an HTML response)`);
    }
    await writeFile(zip,bytes);
    execFileSync('unzip',['-tq',zip],{stdio:'pipe'});
    await rm(output,{recursive:true,force:true});
    await mkdir(output);
    execFileSync('unzip',['-q','-o',zip,'-d',output],{stdio:'pipe'});
    const files=(await listFiles(output)).filter(f=>extname(f).toLowerCase()==='.ogg');
    if(files.length<5)throw Error(`only ${files.length} Ogg files found in pack`);
    console.log(`  ✓ verified archive from ${new URL(url).hostname} (${files.length} Ogg files)`);
    return {dir,files};
   }catch(e){
    errors.push(`${new URL(url).hostname}: ${e.message}`);
   }
  }
  throw Error(`All archive sources failed: ${errors.join('; ')}`);
 }catch(e){
  await rm(dir,{recursive:true,force:true});
  throw e;
 }
}
