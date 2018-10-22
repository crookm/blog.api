const store = require("../../util/store-do");
const gh = require("@octokit/rest")();
gh.authenticate({
  type: "token",
  token: process.env.GHTOKEN
});

module.exports = async () => {
  try {
    let activity_groups = [];
    console.info(`svccron:github:get-commit_activity - begin`);
    const repos = await gh.repos.getAll({
      visibility: "public",
      sort: "pushed",
      per_page: 5
    });

    let reporting = 0;
    for (const item in repos.data) {
      if (repos.data.hasOwnProperty(item)) {
        const repo = repos.data[item];
        console.debug(
          `svccron:github:get-commit_activity - getting commits for ${
            repo.full_name
          }`
        );

        // use promises here to spawn all reqs at once
        gh.repos
          .getCommits({
            owner: repo.owner.login,
            repo: repo.name,
            author: process.env.GHNAME,
            per_page: 5
          })
          .then(async commits => {
            activity_groups.push({
              repo,
              commits: commits.data
            });

            if (++reporting === 5) {
              // lookups for all repos are back
              activity_groups.sort((a, b) => {
                // it's likely that they aren't in order
                return new Date(b.repo.pushed_at) - new Date(a.repo.pushed_at);
              });

              // save to spaces
              store.put_obj(
                "api/obj/github/recent_commits.json",
                activity_groups,
                {
                  ContentType: "application/json",
                  ContentDisposition: "inline"
                },
                async (err, res) => {
                  if (err) console.error(err);
                  else
                    console.info(
                      `svccron:github:get-commit_activity - cached to spaces (ETag: ${
                        res.ETag
                      })`
                    );

                  // finish off with a message and the rate limit
                  const rate_limit = await gh.misc.getRateLimit({});
                  console.info(`svccron:github:get-commit_activity - end`);
                  console.info(
                    `svccron:github:get-commit_activity - github rate limit at ${
                      rate_limit.data.rate.remaining
                    }, restarts at ${new Date(
                      rate_limit.data.rate.reset * 1000
                    ).toISOString()}`
                  );
                }
              );
            }
          })
          .catch(e => {
            console.error(`svccron:github:get-commit_activity - ${e}`);
          });
      }
    }
  } catch (e) {
    console.error(`svccron:github:get-commit_activity - ${e}`);
  }
};
