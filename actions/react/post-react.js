const { performance } = require("perf_hooks");
const url = require("url");

const react = require("../../util/store-react");

const valid_reacts = ["like", "love", "haha", "wow", "sad", "angry"];

module.exports = async (req, res) => {
  let req_start = performance.now();
  console.info(`[i] react:post-react - begin`);

  try {
    res.setHeader("x-api-endpoint", "react:post-react");
    res.setHeader("cache-control", "no-cache, no-store, must-revalidate"); // no cache
    res.setHeader("expires", "0"); // no cache on proxies

    if (
      typeof req.query.id === "undefined" ||
      typeof req.query.reaction === "undefined" ||
      !valid_reacts.includes(req.query.reaction)
    ) {
      let perf = performance.now() - req_start;
      res.setHeader("x-api-perf", perf.toFixed(0));
      res.status(400).send({ code: 400, message: "bad request" });

      console.warn(`[w] react:post-react - invalid react or id`);
    } else {
      let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
      
      // remove any previous vote, then add latest
      react
        .remove_react(req.query.id, ip)
        .then(() => {
          react
            .post_react(req.query.id, req.query.reaction, ip)
            .catch(err => {
              throw err;
            });
        })
        .catch(err => {
          throw err;
        });
      
      res.status(200).send({ code: 200, message: "success" });
    }
  } catch (err) {
    let perf = performance.now() - req_start;
    res.setHeader("x-api-perf", perf.toFixed(0));
    res.status(500).send({ code: 500, message: "internal server error" });

    console.error(`[*] react:post-react - ${err}`);
  } finally {
    console.info(
      `[i] react:post-react - end (${(performance.now() - req_start).toFixed(
        2
      )}ms)`
    );
  }
};
