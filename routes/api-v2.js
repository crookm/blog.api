var express = require("express");
var router = express.Router();

router.use(require("body-parser").json());
router.use(
  require("cors")({
    origin: /crookm\.com$/,
    maxAge: 600, // cache cors resp in client
    optionsSuccessStatus: 200
  })
);

// set headers common to all methods
router.use((req, res, next) => {
  res.setHeader("x-api-version", "2.0.0");
  res.setHeader("x-api-deprecated", "false");
  next();
});

// handle body parser errors nicely
router.use(function(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    res.setHeader("x-api-perf", "0"); // justify: never entered func
    res.status(400).send({ code: 400, message: "bad request" });
  } else next();
});

// actions
let rc_get_react = require("../actions/react/get-react");
let rc_post_react = require("../actions/react/post-react");
let tw_get_thread = require("../actions/twitter/get-thread");
let gh_get_activity = require("../actions/github/get-activity");

// reaction routes
router.get("/rc/get/react", rc_get_react);
router.get("/rc/post/react", rc_post_react);

// twitter routes
router.get("/tw/get/thread", tw_get_thread);

// github routes
router.get("/gh/get/activity", gh_get_activity);

module.exports = router;
