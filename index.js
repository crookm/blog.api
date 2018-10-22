#!/usr/bin/node

require("dotenv").config();

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

/**
 * SVCWEB
 * web api events
 */
app.get(
  "/svcweb/github/commits/recent",
  require("./svcweb/github/get-commit_activity")
);
console.info(`[i] svcweb:github:get-commit_activity - route added`);

/**
 * SVCCRON
 * timed api events
 */
setTimeout(() => {
  require("./svccron/github/get-commit_activity")();
}, 1000 * 60 * 60 * 3); // 3 hours
console.info(`[i] svccron:github:get-commit_activity - set to run hourly`);

app.listen(port, () => console.log(`[i] listening on port ${port}`));
