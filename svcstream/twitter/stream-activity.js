const { performance } = require("perf_hooks");
const url = require("url");

const tw_threads = require("../../util/store-tw_threads");
const tw_thread_setup = require("../../util/tw-thread_setup");

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

  stream.on("error", err => {
    console.error(`[*] svcstream:twitter:stream-activity - ${err}`);
  });
};

class EventHandler {
  static async handle_reply(event) {
    // check is in response to id is in thread_tweets
    const thread = await this.is_thread_tweet(
      event.in_reply_to_status_id_str
    ).catch(err => {
      console.error(`[*] svcstream:twitter:stream-activity - ${err}`);
    });

    if (thread) {
      console.info(
        `[i] svcstream:twitter:stream-activity - reply to ${
          event.in_reply_to_status_id_str
        } from ${event.user.screen_name} for ${
          tw_threads.get_thread(event.in_reply_to_status_id_str).path
        }`
      );

      // add to collection
    }

    // else ignored
  }

  static is_thread_tweet(tweet_id) {
    return new Promise(async (resolve, reject) => {
      // is the response_to ID a valid thread tweet?
      if (tweet_id) {
        let thread = tw_threads.get_thread(tweet_id);
        if (thread) resolve(thread);
        else {
          // id was not already locally cached, check if we just haven't got it yet
          const tweet = await twclient
            .get("statuses/show", {
              id: tweet_id,
              include_entities: true
            })
            .catch(reject);

          // check that it was me that tweeted this, so others
          // can't claim the post thread tweet by tweeting a url
          if (tweet.user.id_str == process.env.TWUID) {
            for (const tweet_url_entity_lu in tweet.entities.urls) {
              if (tweet.entities.urls.hasOwnProperty(tweet_url_entity_lu)) {
                const tweet_url_entity =
                  tweet.entities.urls[tweet_url_entity_lu];

                // go through each url attached and see if it's to the blog
                if (
                  tweet_url_entity.expanded_url.startsWith(
                    "https://www.crookm.com/journal/"
                  )
                ) {
                  // this is what we were looking for - initiate setup
                  thread = await tw_thread_setup(tweet, tweet_url_entity).catch(
                    reject
                  );

                  if (thread) resolve(thread);
                }
              }
            }
          }

          resolve(false); // nothing relevant found
        }
      }
    });
  }
}
