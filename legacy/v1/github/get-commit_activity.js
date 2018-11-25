// just use a snapshot of the resp - this method is legacy and shouldn't be used
let ghdata = require("./snapshot");

module.exports = async (req, res) => {
  console.info(`[i][legacy] svcweb:github:get-commit_activity - begin`);

  res.setHeader("x-api-endpoint", "svcweb:github:get-commit_activity");
  res.setHeader("x-api-perf", "0");
  res.setHeader("last-modified", "Sun, 25 Nov 2018 00:03:41 GMT");
  res.setHeader("cache-control", "public, max-age=1800"); // browser cache 30 mins

  res.type("json").send(ghdata);
  console.info(`[i][legacy] svcweb:github:get-commit_activity - end`);
};
