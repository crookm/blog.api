#!/usr/bin/node

require("dotenv").config();

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.set("env", "production");

// setup versioned api routes
const api_v1 = require("./routes/api-v1");
const api_v2 = require("./routes/api-v2");

app.use("/", api_v1); // legacy un-versioned - will be removed v soon
app.use("/v1", api_v1);
app.use("/v2", api_v2);

// setup streamed actions
require("./actions/twitter/stream-activity")();

const srv = app.listen(port, () =>
  console.info(`[i] listening on port ${port}`)
);

// handle shutdowns gracefully
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
