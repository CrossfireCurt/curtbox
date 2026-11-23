/**
 * Safely delete feature branches already incorporated through merged PRs.
 * Receives GitHub Actions github-script's authenticated Octokit instance.
 * Only deletes exact unchanged merged PR heads from this repository.
 */
async function cleanupMergedBranches({github,core,owner,repo}){
  const fullName=`${owner}/${repo}`;
  const {data: repository}=await github.rest.repos.get({owner,repo});
  const defaultBranch=repository.default_branch;
  const [branches,closedPulls,openPulls]=await Promise.all([
    github.paginate(github.rest.repos.listBranches,{owner,repo,per_page:100}),
    github.paginate(github.rest.pulls.list,{owner,repo,state:'closed',per_page:100}),
    github.paginate(github.rest.pulls.list,{owner,repo,state:'open',per_page:100})
  ]);
  const sameRepo=pr=>pr.head?.repo?.full_name===fullName;
  let removed=0;
  for(const branch of branches){
    if(branch.name===defaultBranch||branch.protected)continue;
    if(openPulls.some(pr=>sameRepo(pr)&&pr.head.ref===branch.name))continue;
    // Not every closed PR was merged. Require an actual merged PR into main.
    const merged=closedPulls.find(pr=>pr.merged_at&&sameRepo(pr)
      &&pr.base?.repo?.full_name===fullName
      &&pr.base.ref===defaultBranch
      &&pr.head.ref===branch.name
      &&pr.head.sha===branch.commit.sha);
    if(!merged)continue;
    // Race protection: a developer may have added commits since we listed it.
    let ref;
    try{
      const response=await github.rest.git.getRef({owner,repo,ref:`heads/${branch.name}`});
      ref=response.data;
    }catch(error){
      if(error.status===404)continue;
      throw error;
    }
    if(ref.object.sha!==branch.commit.sha)continue;
    try{
      await github.rest.git.deleteRef({owner,repo,ref:`heads/${branch.name}`});
      core.info(`Deleted merged PR #${merged.number} branch: ${branch.name}`);
      removed++;
    }catch(error){
      if(error.status===404)continue; // Another cleanup job already removed it.
      throw error;
    }
  }
  core.info(`Merged feature branches removed: ${removed}`);
  return removed;
}

module.exports={cleanupMergedBranches};
