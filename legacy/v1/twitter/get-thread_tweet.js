const { performance } = require("perf_hooks");
const url = require("url");

const tw_threads = require("../../../util/store-tw_threads");

module.exports = async (req, res) => {
  let req_start = performance.now();
  console.info(`[i][legacy] svcweb:twitter:get-thread_tweet - begin`);

  try {
    res.setHeader("x-api-endpoint", "svcweb:twitter:get-thread_tweet");
    res.setHeader("cache-control", "public, max-age=14400"); // browser cache 4 hrs

    if (typeof req.query.path === "undefined") {
      let perf = performance.now() - req_start;
      res.setHeader("x-api-perf", perf.toFixed(0));
      res.status(400).send({ code: 400, message: "bad request" });

      console.warn(
        `[w][legacy] svcweb:twitter:get-thread_tweet - no path specified`
      );
    } else {
      let thread = await tw_threads.search(req.query.path).catch(err => {
        throw err;
      });

      if (thread) {
        let perf = performance.now() - req_start;
        res.setHeader("x-api-perf", perf.toFixed(0));
        res.send(thread);
      } else {
        // we're not searching the tw api any more - use new api version
        let perf = performance.now() - req_start;
        res.setHeader("x-api-perf", perf.toFixed(0));
        res.status(404).send({ code: 404, message: "not found" });

        console.info(
          `[i][legacy] svcweb:twitter:get-thread_tweet - no thread for ${
            req.query.path
          }`
        );
      }
    }
  } catch (err) {
    let perf = performance.now() - req_start;
    res.setHeader("x-api-perf", perf.toFixed(0));
    res.status(500).send({ code: 500, message: "internal server error" });

    console.error(`[*][legacy] svcweb:twitter:get-thread_tweet - ${err}`);
  } finally {
    console.info(
      `[i][legacy] svcweb:twitter:get-thread_tweet - end (${(
        performance.now() - req_start
      ).toFixed(2)}ms)`
    );
  }
};
