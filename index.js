#!/usr/bin/node

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
    optionsSuccessStatus: 200
  })
);

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

/**
 * SVCCRON
 * timed api events
 */
setInterval(() => {
  require("./svccron/github/get-commit_activity")();
}, 1000 * 60 * 60 * 3); // 3 hours
console.info(`[i] svccron:github:get-commit_activity - set to run hourly`);

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
  //require("./util/store-analytics").goodbye(() => readiness++); NYI

  // exit after 5s (or 1s if local) regardless of readiness
  setTimeout(
    () => {
      console.info(`[i] reached exit state with ${readiness} readiness.`);
      console.info(`[i] goodbye!`);
      process.exit(0);
    },
    process.env.PORT === 3000 ? 1000 : 1000 * 5
  );
};

process.on("SIGHUP", () => goodbye("SIGHUP"));
process.on("SIGINT", () => goodbye("SIGINT"));
process.on("SIGTERM", () => goodbye("SIGTERM"));
