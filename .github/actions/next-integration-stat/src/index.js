const { context, getOctokit } = require('@actions/github');
const { info, getInput } = require('@actions/core');
const stripAnsi = require('strip-ansi').default;
const fetch = require('node-fetch').default;

async function run() {
  const token = getInput('token');
  const octokit = getOctokit(token);

  const prNumber = context?.payload?.pull_request?.number;
  const prSha = context?.sha;

  console.log('Trying to collect integration stats for PR', { prNumber, sha: prSha });

  if (!prNumber) {
    info('No PR number found in context, exiting');
    return;
  }

  /*
  const pr = await octokit.rest.pulls.get({
    ...context.repo,
    pull_number: prNumber,
  });*/

  // Iterate all the jobs in the current workflow run
  console.log('Trying to collect next.js integration test logs');
  const jobs = await octokit.paginate(octokit.rest.actions.listJobsForWorkflowRun, {
    ...context.repo,
    run_id: context?.runId,
    per_page: 50,
  });

  // Filter out next.js integration test jobs
  const integrationTestJobs = jobs?.filter(job => job?.name?.startsWith('Next.js integration test ('));
  console.log(`Logs found for ${integrationTestJobs.length} jobs`);

  // Consolidate all logs from the jobs
  let logs = '';
  for (const job of integrationTestJobs) {
    // downloadJobLogsForWorkflowRun returns a redirect to the actual logs
    const jobLogsRedirectResponse = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
      ...context.repo,
      job_id: job.id,
    });

   //const logText = jobLogsRedirectResponse.data;;

    // fetch the actual logs
    const jobLogsResponse = await fetch(jobLogsRedirectResponse.url, {
      headers: {
        Authorization: `token ${token}`,
      },
    });

    if (!jobLogsResponse.ok) {
      throw new Error(`Failed to get logsUrl, got status ${jobLogsResponse.status}`)
    }

    // this should be the check_run's raw logs including each line
    // prefixed with a timestamp in format 2020-03-02T18:42:30.8504261Z
    const logText = await jobLogsResponse.text();

    logs += logText
      .split('\n')
      .map((line) => line.substr('2020-03-02T19:39:16.8832288Z '.length))
      .join('\n');
  }

  console.log(logs);

  console.log('Trying to check logs for failed tests');
  if (
    !logs.includes(`failed to pass within`) ||
    !logs.includes('--test output start--')
  ) {
    console.log(
      `Couldn't find failed tests in logs, not posting for ${context?.runId}`
    )
    return
  }

  let failedTest = logs.split(`failed to pass within`).shift()

  failedTest = failedTest?.includes('test/')
    ? failedTest?.split('\n').pop()?.trim()
    : ''

  let testData

  try {
    testData = logs?.split('--test output start--')
      .pop()
      ?.split('--test output end--')
      ?.shift()
      ?.trim()

    testData = JSON.parse(testData)
  } catch (_) {
    console.log(`Failed to parse test data`, testData)
  }

  if (!failedTest || !testData) {
    console.log(
      `Couldn't parse failed test data from logs, not posting for ${context?.runId}`
    )
    return
  }

  const groupedFails = {}
  const testResult = testData.testResults[0]
  const resultMessage = stripAnsi(testResult.message)
  const failedAssertions = testResult.assertionResults.filter(
    (res) => res.status === 'failed'
  )

  for (const fail of failedAssertions) {
    const ancestorKey = fail.ancestorTitles.join(' > ')

    if (!groupedFails[ancestorKey]) {
      groupedFails[ancestorKey] = []
    }
    groupedFails[ancestorKey].push(fail)
  }

  const comments = await octokit.rest.issues.listComments({
    ...context.repo,
    issue_number: prNumber,
  });

  const existingComment = comments?.data.find(comment => comment?.user?.login === 'github-actions[bot]' && comment?.body?.includes(`<!-- __marker__ next.js integration stats __marker__ -->`));

  const commentTitlePre = `## Failing next.js integration test suites`
  const commentTitle = `${commentTitlePre} <!-- __marker__ next.js integration stats __marker__ -->` + `\nCommit: ${prSha}`

  let commentToPost = ''
  if (existingComment?.body?.includes(prSha)) {
    if (existingComment.body?.includes(failedTest)) {
      console.log(`Suite is already included in current comment on ${prNumber}`)
      // the check_suite comment already says this test failed
      return
    }
    commentToPost = existingComment.body
  } else {
    commentToPost = `${commentTitle}\n`
  }
  commentToPost += `\n\`pnpm testheadless ${failedTest}\` `

  for (const group of Object.keys(groupedFails).sort()) {
    const fails = groupedFails[group]
    commentToPost +=
      `\n- ` + fails.map((fail) => `${group} > ${fail.title}`).join('\n- ')
  }

  commentToPost += `\n\n<details>`
  commentToPost += `\n<summary>Expand output</summary>`
  commentToPost += `\n\n${resultMessage}`
  commentToPost += `\n</details>\n`

  try {
    if (!existingComment) {
      info('No existing comment found, creating a new one');
      await octokit.rest.issues.createComment({
        ...context.repo,
        issue_number: prNumber,
        body: commentToPost,
      });
      return;
    } else {
      info('Existing comment found, updating it');
      await octokit.rest.issues.updateComment({
        ...context.repo,
        comment_id: existingComment.id,
        body: commentToPost,
      });
      return;
    }
  } catch (error) {
    if (error.status === 403) {
      info('No permission to create a comment, exiting');
      return;
    }
  }
}

run();