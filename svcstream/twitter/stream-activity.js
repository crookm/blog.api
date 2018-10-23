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

module.exports = () => {
  let stream = twclient.stream("statuses/filter", {
    follow: process.env.TWUID
  });

  console.info(`[i] svcstream:twitter:stream-activity - streaming started`);

  stream.on("data", event => {
    if (
      typeof event.id_str === "string" &&
      typeof event.text === "string" &&
      event.in_reply_to_user_id_str === process.env.TWUID
    ) {
      // send off to reply event handler
      EventHandler.handle_reply(event);
    }
  });

  stream.on("error", e => {
    console.error(`[*] svcstream:twitter:stream-activity - ${e}`);
  });
};

class EventHandler {
  static handle_reply(event) {
    // check is in response to id is in thread_tweets
    this.is_thread_tweet(
      event.in_reply_to_status_id_str,
      () => {
        // we got a hit! do something with it!
        console.info(
          `[i] svcstream:twitter:stream-activity - reply to ${
            event.in_reply_to_status_id_str
          } from ${event.user.screen_name} for ${tw_threads.get_thread(
            event.in_reply_to_status_id_str
          )}`
        );
      },
      () => {
        // ignore event
      }
    );
  }

  static is_thread_tweet(tw_id, cb_true, cb_false) {
    // is the response_to ID a valid thread tweet?
    if (tw_id) {
      if (tw_threads.get_thread(tw_id)) cb_true();
      else {
        // id was not already locally cached, check if we just haven't got it yet
        twclient.get(
          "statuses/show",
          { id: tw_id, include_entities: true },
          (e, tweet, resp) => {
            if (e)
              console.error(`[*] svcstream:twitter:stream-activity - ${e}`);
            else {
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
                    // valid thread tweet! store it
                    tw_threads.put_thread(
                      tw_id,
                      url.parse(tw_url.expanded_url).pathname
                    );
                    cb_true();
                  }
                });
              }
            }

            cb_false();
          }
        );
      }
    } else cb_false();
  }
}
