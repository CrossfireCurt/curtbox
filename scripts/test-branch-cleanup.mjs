import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
const {cleanupMergedBranches}=createRequire(import.meta.url)('./cleanup-merged-branches.cjs');
const me='CrossfireCurt/curtbox';
const branch=(name,sha,{protected:protectedBranch=false}={})=>({name,commit:{sha},protected:protectedBranch});
const pr=(number,ref,sha,{merged=true,repo=me,base=me,baseBranch='main'}={})=>({
  number,merged_at:merged?'2026-11-23T00:00:00Z':null,
  head:{ref,sha,repo:{full_name:repo}},
  base:{ref:baseBranch,repo:{full_name:base}}
});
function harness({branches,closed=[],open=[],fresh={}}){
  const deleted=[],logs=[],queries=[];
  const github={
    rest:{
      repos:{
        get:async()=>({data:{default_branch:'main'}}),
        listBranches:()=>{},
      },
      pulls:{list:()=>{}},
      git:{
        getRef:async({ref})=>({data:{object:{sha:fresh[ref]??branches.find(x=>'heads/'+x.name===ref)?.commit.sha}}}),
        deleteRef:async({ref})=>{deleted.push(ref);return {status:204};}
      }
    },
    paginate:async(fn,args)=>{
      queries.push(args);
      if(fn===github.rest.repos.listBranches)return branches;
      if(args.state==='closed')return closed;
      if(args.state==='open')return open;
      throw Error('Unexpected pagination');
    }
  };
  return {github,core:{info:s=>logs.push(s)},deleted,logs,queries};
}
test('deletes only exact merged same-repo branch HEADs; never main or protected',async()=>{
 const b=[branch('main','m'),branch('feat/yes','a'),branch('docs/no','b'),branch('feat/protected','c',{protected:true})];
 const t=harness({branches:b,closed:[pr(1,'feat/yes','a'),pr(2,'docs/no','different'),pr(3,'feat/protected','c')]});
 assert.equal(await cleanupMergedBranches({github:t.github,core:t.core,owner:'CrossfireCurt',repo:'curtbox'}),1);
 assert.deepEqual(t.deleted,['heads/feat/yes']);
});
test('does not delete open PRs, unmerged PRs, fork PRs, or non-main merges',async()=>{
 const b=['open','unmerged','fork','develop','orphan'].map(n=>branch('feat/'+n,n));
 const t=harness({branches:b,closed:[
   pr(1,'feat/open','open'),pr(2,'feat/unmerged','unmerged',{merged:false}),
   pr(3,'feat/fork','fork',{repo:'another/fork'}),
   pr(4,'feat/develop','develop',{baseBranch:'develop'})],
   open:[pr(5,'feat/open','open',{merged:false})]});
 await cleanupMergedBranches({github:t.github,core:t.core,owner:'CrossfireCurt',repo:'curtbox'});
 assert.deepEqual(t.deleted,[]);
});
test('protects branches with new commits after a stale merged-PR listing',async()=>{
 const b=[branch('feat/changed','old')];
 const t=harness({branches:b,closed:[pr(6,'feat/changed','old')],fresh:{'heads/feat/changed':'new'}});
 await cleanupMergedBranches({github:t.github,core:t.core,owner:'CrossfireCurt',repo:'curtbox'});
 assert.deepEqual(t.deleted,[]);
});
test('propagates permission errors so failed cleanup is visible in Actions',async()=>{
 const b=[branch('feat/forbidden','f')];
 const t=harness({branches:b,closed:[pr(7,'feat/forbidden','f')]});
 t.github.rest.git.deleteRef=async()=>{const e=Error('Forbidden');e.status=403;throw e;};
 await assert.rejects(cleanupMergedBranches({github:t.github,core:t.core,owner:'CrossfireCurt',repo:'curtbox'}),/Forbidden/);
});
