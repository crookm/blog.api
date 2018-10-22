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
console.info(`svcweb:github:get-commit_activity - route added`);

/**
 * SVCCRON
 * timed api events
 */
setTimeout(() => {
  require("./svccron/github/get-commit_activity")();
}, 1000 * 60 * 60 * 1); // 1 hour
console.info(`svccron:github:get-commit_activity - set to run hourly`);

app.listen(port, () => console.log(`listening on port ${port}`));
