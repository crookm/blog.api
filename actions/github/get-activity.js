const { performance } = require("perf_hooks");
const gh = require("@octokit/rest")();
gh.authenticate({
  type: "token",
  token: process.env.GHTOKEN
});

let ghdata = {};
let ghprocessing = false; // avoid simultaneous updates
let update = async () => {
  let update_start = performance.now();
  ghprocessing = true;

  try {
    let activity_groups = [];
    console.info(`[i] github:get-activity - update: begin`);
    const repos = await gh.repos.getAll({
      visibility: "all",
      affiliation: "owner",
      sort: "pushed",
      per_page: 10
    });

    for (const item in repos.data) {
      if (repos.data.hasOwnProperty(item)) {
        const repo = repos.data[item];
        let commits = [];

        // use promises here to spawn all reqs at once
        if (!repo.private) {
          commits = await gh.repos
            .getCommits({
              owner: repo.owner.login,
              repo: repo.name,
              author: process.env.GHNAME,
              per_page: 5
            })
            .catch(err => {
              console.error(`[*] github:get-activity - update: ${err}`);
            });

          commits = Array.from(commits.data, commit => ({
            sha: commit.sha,
            commit: {
              author: {
                ...commit.commit.author,
                avatar_url: commit.author.avatar_url
              },
              committer: {
                ...commit.commit.committer,
                avatar_url: commit.committer.avatar_url
              },
              tree: { sha: commit.commit.tree.sha },
              comment_count: commit.commit.comment_count,
              verification: commit.commit.verification,
              message: commit.commit.message
            },
            html_url: commit.html_url,
            parents: Array.from(commit.parents, parent => ({
              sha: parent.sha,
              html_url: parent.html_url
            }))
          }));
        }

        activity_groups.push({
          repo: {
            id: repo.private ? "[private]" : repo.id,
            name: repo.private ? "[private]" : repo.name,
            full_name: repo.private
              ? `${repo.owner.login}/[private]`
              : repo.full_name,
            owner: {
              login: repo.owner.login,
              avatar_url: repo.owner.avatar_url
            },
            private: repo.private,
            html_url: repo.private ? "[private]" : repo.html_url,
            description: repo.private
              ? "A private repository"
              : repo.description,
            fork: repo.private ? "[private]" : repo.fork,
            created_at: repo.created_at,
            updated_at: repo.updated_at,
            pushed_at: repo.pushed_at,
            git_url: repo.private ? "[private]" : repo.git_url,
            ssh_url: repo.private ? "[private]" : repo.ssh_url,
            clone_url: repo.private ? "[private]" : repo.clone_url,
            homepage: repo.private ? "[private]" : repo.homepage,
            size: repo.size,
            stargazers_count: repo.private ? 0 : repo.stargazers_count,
            watchers_count: repo.private ? 0 : repo.watchers_count,
            forks_count: repo.private ? 0 : repo.forks_count,
            open_issues_count: repo.private ? 0 : repo.open_issues,
            language: repo.language
          },
          commits: commits
        });
      }
    }

    activity_groups.sort((a, b) => {
      // it's likely that they aren't in order
      return new Date(b.repo.pushed_at) - new Date(a.repo.pushed_at);
    });

    const rate_limit = await gh.misc.getRateLimit({});
    console.info(
      `[i] github:get-activity - update end (${(
        performance.now() - update_start
      ).toFixed(2)}ms)`
    );

    ghdata = { updated: new Date(), data: activity_groups };
    ghprocessing = false;
  } catch (err) {
    console.error(`[*] github:get-activity - update: ${err}`);
  }
};

update(); // initial update, get on it quick before requests come in
setInterval(() => update(), 1000 * 60 * 60); // hourly update to keep cached version fresh

module.exports = async (req, res) => {
  let req_start = performance.now();

  console.info(`[i] github:get-activity - begin`);
  let perf = performance.now() - req_start; // kinda redundant now??

  res.setHeader("x-api-endpoint", "github:get-activity");
  res.setHeader("x-api-perf", perf.toFixed(0));
  res.setHeader("last-modified", new Date(ghdata.updated).toUTCString());
  res.setHeader("cache-control", "public, max-age=1800"); // browser cache 30 mins

  res.type("json").send(ghdata);
  console.info(`[i] github:get-activity - end (${perf.toFixed(2)}ms)`);

  if (new Date() - ghdata.updated > 1000 * 60 * 5 && !ghprocessing)
    // update in the bg if not updated in the last 5 mins
    update();
};
