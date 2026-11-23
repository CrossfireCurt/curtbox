import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const base=new URL('../../', import.meta.url);
const read=async(path)=>readFile(new URL(path,base),'utf8');

test('all 22 reaction IDs have a unique, CC0-licensed source page', async()=>{
 const manifest=JSON.parse(await read('docs/REACTION_AUDIO_CATALOG.json'));
 const shared=await read('shared/types.ts');
 const ids=[...shared.matchAll(/\{id:'([^']+)',label:'[^']+',emoji:'[^']+',rating:'[^']+',sound:'[^']+'\}/g)].map(x=>x[1]);
 assert.equal(manifest.length,22);
 assert.deepEqual(new Set(manifest.map(x=>x.id)),new Set(ids));
 assert.equal(new Set(manifest.map(x=>x.url)).size,22);
 for(const item of manifest){
  assert.match(item.url,/^https:\/\/freesound\.org\/people\/[^/]+\/sounds\/\d+\/$/);
  assert.equal(item.license,'CC0');
  assert.ok(item.maxSeconds>0 && item.maxSeconds<=5);
 }
});

test('installer normalizes to exactly the reaction filenames expected by host audio',async()=>{
 const installer=await read('scripts/install-reaction-audio.mjs');
 const host=await read('client/src/audio.ts');
 const pkg=JSON.parse(await read('package.json'));
 assert.equal(pkg.scripts['audio:reactions'],'node scripts/install-reaction-audio.mjs');
 assert.match(installer,/`reaction-\$\{item\.id\}\.ogg`/);
 assert.match(host,/`reaction-\$\{next\.sound\}`/);
 assert.match(installer,/loudnorm=/);
});

test('base audio downloader does not overwrite curated reactions',async()=>{
 const downloader=await read('scripts/fetch-audio.mjs');
 assert.match(downloader,/Preserve any hand-curated CC0 emote recording/);
});
