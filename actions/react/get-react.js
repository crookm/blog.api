const { performance } = require("perf_hooks");
const url = require("url");

const react = require("../../util/store-react");

module.exports = async (req, res) => {
  let req_start = performance.now();
  console.info(`[i] react:get-react - begin`);

  try {
    res.setHeader("x-api-endpoint", "react:get-react");
    res.setHeader("cache-control", "public, max-age=14400"); // browser cache 4 hrs

    if (typeof req.query.id === "undefined") {
      let perf = performance.now() - req_start;
      res.setHeader("x-api-perf", perf.toFixed(0));
      res.status(400).send({ code: 400, message: "bad request" });

      console.warn(`[w] react:get-react - no id specified`);
    } else {
      let data = await react.get_react(req.query.id).catch(err => {
        throw err;
      });

      if (data) {
        let perf = performance.now() - req_start;
        res.setHeader("x-api-perf", perf.toFixed(0));
        res.status(200).send(data);
      } else {
        res.status(404).send({ code: 404, message: "not found" });
      }
    }
  } catch (err) {
    let perf = performance.now() - req_start;
    res.setHeader("x-api-perf", perf.toFixed(0));
    res.status(500).send({ code: 500, message: "internal server error" });

    console.error(`[*] react:get-react - ${err}`);
  } finally {
    console.info(
      `[i] react:get-react - end (${(performance.now() - req_start).toFixed(
        2
      )}ms)`
    );
  }
};
