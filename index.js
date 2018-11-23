#!/usr/bin/node

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

app.set("env", "production");
app.use(require("body-parser").json());
app.use(
  cors({
    origin: "*",
    optionsSuccessStatus: 200
  })
);

// ffs with body parser not handling exceptions well
app.use(function(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    res.setHeader("x-api-perf","0"); // justify: never entered func
    res.status(400).send({ code: 400, message: "bad request" });
  } else next();
});

/**
 * SVCWEB
 * web api events
 */
app.get(
  "/svcweb/github/commits/recent",
  require("./svcweb/github/get-commit_activity")
);
console.info(`[i] svcweb:github:get-commit_activity - route added`);

app.get(
  "/svcweb/twitter/post/thread",
  require("./svcweb/twitter/get-thread_tweet")
);
console.info(`[i] svcweb:twitter:get-thread_tweet - route added`);

// NYI
// app.post(
//   "/svcweb/analytics/event/do/:cat",
//   require("./svcweb/analytics/do-produce_event")
// );
// console.info(`[i] svcweb:analytics:do-produce_event - route added`);

/**
 * SVCSTREAM
 * live socket events
 */
require("./svcstream/twitter/stream-activity")();

const srv = app.listen(port, () =>
  console.info(`[i] listening on port ${port}`)
);

let goodbye = signal => {
  console.info(`[i] received ${signal}, shutting down...`);
  let readiness = 0; // num of services saying goodbye

  srv.close(() => readiness++);
  require("./util/store-mongo").goodbye(() => readiness++);
  //require("./util/store-analytics").goodbye(() => readiness++); NYI

  // exit after 1s (or .5s if local) regardless of readiness
  setTimeout(
    () => {
      console.info(`[i] reached exit state with ${readiness} readiness.`);
      console.info(`[i] goodbye!`);
      process.exit(0);
    },
    process.env.PORT === 3000 ? 500 : 1000
  );
};

process.on("SIGHUP", () => goodbye("SIGHUP"));
process.on("SIGINT", () => goodbye("SIGINT"));
process.on("SIGTERM", () => goodbye("SIGTERM"));
