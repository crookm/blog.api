require("dotenv").config();

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.get(
  "/svcweb/github/commits/recent",
  require("./svcweb/github/get-commit_activity")
);

app.listen(port, () => console.log(`listening on port ${port}`));
