const { Octokit } = require('@octokit/rest');
const core = require('@actions/core');
const github = require('@actions/github');

const get_pull_requests = async (octokit, owner, repo, base) => {
  let results = []
  let page = 1
  let pagesRemaining = true;

  while (pagesRemaining) {
    const result = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'open',
      base,
      page: page
    })

    results = [...results, ...result.data]

    const linkHeader = result.headers.link;

    pagesRemaining = linkHeader && linkHeader.includes(`rel=\"next\"`);

    if (pagesRemaining) {
      page = page + 1
    }
  }

  return results
}

const main = async () => {
  try {
    const { owner, repo } = github.context.repo
    const apiUrl  = github.context.apiUrl
    const base = core.getInput('pr_base_branch')
    const token = core.getInput('github_token')
    const max_attempts = core.getInput('max_attempts')
    const workflow_id = core.getInput('workflow')
    const pr_match_filter = new RegExp(core.getInput('pr_title_filter_pattern'))

    const octokit = new Octokit ({ baseUrl: apiUrl, auth: token })

    let pull_requests = await get_pull_requests(octokit, owner, repo, base)

    if (pr_match_filter) {
      pull_requests = pull_requests.filter((pr) => (
        !!pr.title.match(pr_match_filter)
      ))
    }

    for(const pr of pull_requests) {
      console.log(`Checking if re-run needed for pull request: ${pr.title}`)
      const runs = await octokit.rest.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id,
        head_sha: pr.head.sha
      });

      if (runs.length === 0) { break; }

      const state = runs.data.workflow_runs[0].conclusion
      const attempts = runs.data.workflow_runs[0].run_attempt
      const run_id = runs.data.workflow_runs[0].id

      if (state === "failure" && attempts < max_attempts) {
        console.log(`Triggering re-run for ID: ${run_id}`);
        console.log(`Re-run sha: ${pr.head.sha}`);
        console.log(`Attempt #: ${attempts + 1}`);
        if ( process.env.DRY_RUN !== 'true') {
          await octokit.rest.actions.reRunWorkflowFailedJobs({
            owner,
            repo,
            run_id,
          });
        }
      }
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

main()
