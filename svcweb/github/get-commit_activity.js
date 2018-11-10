const { performance } = require("perf_hooks");
const store = require("../../util/store-do");

module.exports = async (req, res) => {
  let req_start = performance.now();

  console.info(`[i] svcweb:github:get-commit_activity - begin`);
  store.get_obj("api/obj/github/recent_commits.json", (err, data) => {
    if (err) {
      console.error(`[*] svcweb:github:get-commit_activity - ${err}`);
      res.status(500).send({ code: 500, message: "internal server error" });
    } else {
      let body = JSON.parse(data.Body);
      let perf = performance.now() - req_start;

      res.setHeader("x-api-endpoint", "svcweb:github:get-commit_activity");
      res.setHeader("x-api-perf", perf.toFixed(0));
      res.setHeader("last-modified", new Date(body.updated).toUTCString());
      res.setHeader("cache-control", "public, max-age=1800"); // browser cache 30 mins
      res.setHeader("etag", data.ETag);

      res.type("json").send(body);
      console.info(`[i] svcweb:github:get-commit_activity - end (${perf.toFixed(2)}ms)`);
    }
  });
};
