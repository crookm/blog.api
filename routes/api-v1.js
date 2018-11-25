var express = require("express");
var router = express.Router();

router.use(
  require("cors")({
    origin: /crookm\.com$/, // changed from the original v1 for security
    optionsSuccessStatus: 200
  })
);

// set headers common to all methods
router.use((req, res, next) => {
  res.setHeader("x-api-version", "1.0.0");
  res.setHeader("x-api-deprecated", "true");
  next();
});

// actions
let tw_get_thread = require("../legacy/v1/twitter/get-thread_tweet");
let gh_get_activity = require("../legacy/v1/github/get-commit_activity");

// twitter routes
router.get("/svcweb/twitter/post/thread", tw_get_thread);

// github routes
router.get("/svcweb/github/commits/recent", gh_get_activity);

module.exports = router;
