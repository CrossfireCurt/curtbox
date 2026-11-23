/** Dependency-light core + client smoke tests without running Postgres, browser or Vite.
 * Uses TypeScript installed locally or globally to transpile pure server game
 * modules to a temp ESM directory and runs node:test against both game suites.
 * It deliberately does NOT imply a full build/integration test. */
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
 catch{console.error('Install TypeScript locally or globally before running pure tests.');process.exit(1);}
}
const root=path.resolve(import.meta.dirname,'..');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'curtbox-core-tests-'));
let ok=true;
try{
 const files=['shared/types.ts','shared/president.ts','server/src/core.ts','server/src/president.ts','server/src/seed.ts','server/src/cultureSeed.ts','server/src/expandedCultureSeed.ts','server/tests/core.test.ts','server/tests/president.test.ts'];
 for(const rel of files){
  const src=path.join(root,rel),dst=path.join(temporary,rel.replace(/\.ts$/,'.js'));
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  fs.writeFileSync(dst,ts.transpileModule(fs.readFileSync(src,'utf8'),{fileName:src,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
 }
 fs.writeFileSync(path.join(temporary,'package.json'),'{"type":"module"}');
 console.log('\n=== Pure Server Game Engine Tests (Survey Show + President / Asshole) ===');
 const unit=spawnSync(process.execPath,['--test',path.join(temporary,'server/tests/core.test.js'),path.join(temporary,'server/tests/president.test.js')],{stdio:'inherit'});
 if(unit.status!==0)ok=false;
 console.log('\n=== Client Static/Route Tests ===');
 const client=spawnSync(process.execPath,['--experimental-strip-types','--test',...fs.readdirSync(path.join(root,'client/tests')).filter(f=>f.endsWith('.test.mjs')).map(f=>path.join(root,'client/tests',f))],{stdio:'inherit',cwd:root});
 if(client.status!==0)ok=false;
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
process.exitCode=ok?0:1;
