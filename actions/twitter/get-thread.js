const { performance } = require("perf_hooks");
const url = require("url");

const tw_threads = require("../../util/store-tw_threads");
const tw_thread_setup = require("../../util/tw-thread_setup");

const tw = require("twit");
const twclient = new tw({
  consumer_key: process.env.TWCKEY,
  consumer_secret: process.env.TWCSEC,
  access_token: process.env.TWATKEY,
  access_token_secret: process.env.TWATSEC
});

module.exports = async (req, res) => {
  let req_start = performance.now();
  console.info(`[i] tw:get-thread - begin`);

  try {
    res.setHeader("x-api-endpoint", "twitter:get-thread");
    res.setHeader("cache-control", "public, max-age=14400"); // browser cache 4 hrs

    if (typeof req.query.path === "undefined") {
      let perf = performance.now() - req_start;
      res.setHeader("x-api-perf", perf.toFixed(0));
      res.status(400).send({ code: 400, message: "bad request" });

      console.warn(`[w] twitter:get-thread - no path specified`);
    } else {
      let thread = await tw_threads.search(req.query.path).catch(err => {
        throw err;
      });

      if (thread) {
        let perf = performance.now() - req_start;
        res.setHeader("x-api-perf", perf.toFixed(0));
        res.send(thread);
      } else {
        const tw_timeline_resp = await twclient
          .get("statuses/user_timeline", {
            user_id: process.env.TWUID,
            count: 200,
            trim_user: true,
            exclude_replies: true,
            include_rts: false
          })
          .catch(err => {
            throw err;
          });

        if (tw_timeline_resp.data) {
          for (const tweet_lu in tw_timeline_resp.data) {
            // iterate tweeets in timeline
            if (tw_timeline_resp.data.hasOwnProperty(tweet_lu)) {
              const tweet = tw_timeline_resp.data[tweet_lu];

              for (const tweet_url_entity_lu in tweet.entities.urls) {
                // iterate urls in tweet
                if (tweet.entities.urls.hasOwnProperty(tweet_url_entity_lu)) {
                  const tweet_url_entity =
                    tweet.entities.urls[tweet_url_entity_lu];

                  // go through each url attached and see if it's to the blog
                  if (
                    tweet_url_entity.expanded_url.startsWith(
                      "https://www.crookm.com/journal/"
                    )
                  ) {
                    // we got a thread link, but is it the right one?
                    if (
                      url.parse(tweet_url_entity.expanded_url).pathname ===
                      req.query.path
                    ) {
                      thread = await tw_thread_setup(
                        tweet,
                        tweet_url_entity
                      ).catch(err => {
                        throw err;
                      });

                      let perf = performance.now() - req_start;
                      res.setHeader("x-api-perf", perf.toFixed(0));

                      if (thread) return res.send(thread);
                    }
                  }
                }
              }
            }
          }

          // couldn't be found in first ~200 tweets, don't bother further
          let perf = performance.now() - req_start;
          res.setHeader("x-api-perf", perf.toFixed(0));
          res.status(404).send({ code: 404, message: "not found" });

          console.info(
            `[i] twitter:get-thread - no thread for ${req.query.path}`
          );
        }
      }
    }
  } catch (err) {
    let perf = performance.now() - req_start;
    res.setHeader("x-api-perf", perf.toFixed(0));
    res.status(500).send({ code: 500, message: "internal server error" });

    console.error(`[*] twitter:get-thread - ${err}`);
  } finally {
    console.info(
      `[i] twitter:get-thread - end (${(performance.now() - req_start).toFixed(
        2
      )}ms)`
    );
  }
};
