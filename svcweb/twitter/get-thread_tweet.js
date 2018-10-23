const { performance } = require("perf_hooks");
const url = require("url");

const tw_threads = require("../../util/store-tw_threads");
const tw = require("twitter");
const twclient = new tw({
  consumer_key: process.env.TWCKEY,
  consumer_secret: process.env.TWCSEC,
  access_token_key: process.env.TWATKEY,
  access_token_secret: process.env.TWATSEC
});

module.exports = (req, res) => {
  if (typeof req.query.path === "undefined") {
    console.warn(
      `[w] svcweb:twitter:get-thread_tweet - req did not have path param`
    );
    res.status(400).send({ code: 400, message: "bad request" });
  } else {
    let t_start = performance.now();
    console.info(`[i] svcweb:twitter:get-thread_tweet - begin`);

    let sent = false;

    if (tw_threads.search(req.query.path)) {
      res.send({ twid: tw_threads.search(req.query.path) });
      console.info(
        `[i] svcweb:twitter:get-thread_tweet - end (${(
          performance.now() - t_start
        ).toFixed(2)}ms)`
      );
      return;
    } else {
      twclient.get(
        "statuses/user_timeline",
        {
          user_id: process.env.TWUID,
          count: 3,
          trim_user: true,
          exclude_replies: true,
          include_rts: false
        },
        (e, tweets, resp) => {
          if (e) {
            console.error(`[*] svcweb:twitter:get-thread_tweet - ${e}`);
            res
              .status(500)
              .send({ code: 500, message: "internal server error" });
            return;
          } else {
            tweets.forEach(tweet => {
              // check that it was me that tweeted this, so others
              // can't claim the post thread tweet by tweeting a url
              if (tweet.user.id_str == process.env.TWUID) {
                tweet.entities.urls.forEach(tw_url => {
                  // go through each url attached and see if it's to the blog
                  if (
                    tw_url.expanded_url.startsWith(
                      "https://www.crookm.com/journal/"
                    )
                  ) {
                    // valid thread tweet! check if it's the one we're looking for
                    if (
                      url.parse(tw_url.expanded_url).pathname === req.query.path
                    ) {
                      // it was! go ahead and store it
                      tw_threads.put_thread(
                        tweet.id_str,
                        url.parse(tw_url.expanded_url).pathname
                      );

                      res.send({ twid: tweet.id_str });
                      console.info(
                        `[i] svcweb:twitter:get-thread_tweet - end (${(
                          performance.now() - t_start
                        ).toFixed(2)}ms)`
                      );

                      sent = true;
                    }
                  }
                });
              }
            });

            if (!sent) {
              // couldn't be found in first ~200 tweets, don't bother further
              res.status(404).send({ code: 404, message: "not found" });
              console.info(
                `[i] svcweb:twitter:get-thread_tweet - could not find tweet for ${
                  req.query.path
                }`
              );
              console.info(
                `[i] svcweb:twitter:get-thread_tweet - end (${(
                  performance.now() - t_start
                ).toFixed(2)}ms)`
              );
            }
          }
        }
      );
    }
  }
};
