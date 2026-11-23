/** Fallback dependency-light President / Asshole core tests.
 * Uses locally installed TypeScript, or global TypeScript if npm dependencies
 * are unavailable. Only exercises engine logic: NOT frontend/DB/Socket.IO. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
let ts;
try{ts=require('typescript');}
catch{
 try{ts=require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'));}
 catch{console.error('TypeScript is required locally or globally. Run npm install or npm install -g typescript.');process.exit(1);}
}
const root=path.resolve(import.meta.dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'curtbox-pa-tests-'));
try{
 const files=['server/src/core.ts','server/src/president.ts','shared/president.ts','shared/types.ts','server/tests/president.test.ts'];
 for(const rel of files){
  const from=path.join(root,rel),dest=path.join(tmp,rel.replace(/\.ts$/,'.js'));
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  const compiled=ts.transpileModule(fs.readFileSync(from,'utf8'),{fileName:from,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
  fs.writeFileSync(dest,compiled.outputText);
 }
 fs.writeFileSync(path.join(tmp,'package.json'),'{"type":"module"}');
 const processResult=spawnSync(process.execPath,['--test',path.join(tmp,'server/tests/president.test.js')],{stdio:'inherit'});
 process.exitCode=processResult.status??1;
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
