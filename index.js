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
setTimeout(() => {
  require("./svccron/github/get-commit_activity")();
}, 1000 * 60 * 60 * 3); // 3 hours
console.info(`[i] svccron:github:get-commit_activity - set to run hourly`);

/**
 * SVCSTREAM
 * live socket events
 */
require("./svcstream/twitter/stream-activity")();

app.listen(port, () => console.log(`[i] listening on port ${port}`));
