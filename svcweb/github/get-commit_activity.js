const gh = require("@octokit/rest")();
gh.authenticate({
  type: "token",
  token: process.env.GHTOKEN
});

module.exports = async (req, res) => {
  try {
    let activity_groups = [];
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
          `svcweb:github:get-commit_activity - getting commits for ${
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

              res.send(activity_groups); // return the data

              // finish off with a message and the rate limit
              const rate_limit = await gh.misc.getRateLimit({});
              console.info(`svcweb:github:get-commit_activity - finished request`);
              console.info(rate_limit.data);
            }
          })
          .catch(e => {
            console.error(`svcweb:github:get-commit_activity - ${e}`);
            res
              .status(500)
              .send({ code: 500, message: "internal server error" });
          });
      }
    }
  } catch (e) {
    console.error(`svcweb:github:get-commit_activity - ${e}`);
    res.status(500).send({ code: 500, message: "internal server error" });
  }
};
