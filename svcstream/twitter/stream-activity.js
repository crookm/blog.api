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

let event_handler = {
  handle_reply: async event => {
    // check is in response to id is in thread_tweets
    const thread = await event_handler
      .is_thread_tweet(event.in_reply_to_status_id_str)
      .catch(err => {
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

      console.log(event);

      // add to collection
      await event_handler.add_to_collection(event.id_str, thread).catch(err => {
        console.error(`[*] svcstream:twitter:stream-activity - ${err}`);
      });
    }
  },

  is_thread_tweet: tweet_id =>
    new Promise(async (resolve, reject) => {
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
          if (tweet.data.user.id_str == process.env.TWUID) {
            for (const tweet_url_entity_lu in tweet.data.entities.urls) {
              if (tweet.data.entities.urls.hasOwnProperty(tweet_url_entity_lu)) {
                const tweet_url_entity =
                  tweet.data.entities.urls[tweet_url_entity_lu];

                // go through each url attached and see if it's to the blog
                if (
                  tweet_url_entity.expanded_url.startsWith(
                    "https://www.crookm.com/journal/"
                  )
                ) {
                  // this is what we were looking for - initiate setup
                  thread = await tw_thread_setup(tweet.data, tweet_url_entity).catch(
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
    }),

  add_to_collection: (tweet_id, thread) =>
    new Promise(async (resolve, reject) => {
      await twclient
        .post("collections/entries/add", {
          id: thread.list,
          tweet_id: tweet_id
        })
        .catch(reject);

      resolve();
    })
};

module.exports = () => {
  let stream = twclient.stream("statuses/filter", {
    follow: process.env.TWUID
  });

  console.info(`[i] svcstream:twitter:stream-activity - streaming started`);

  stream.on("tweet", event => {
    if (
      typeof event.id_str === "string" &&
      typeof event.text === "string" &&
      event.in_reply_to_user_id_str === process.env.TWUID
    ) {
      // send off to reply event handler
      event_handler.handle_reply(event);
    }
  });

  stream.on("error", err => {
    console.error(`[*] svcstream:twitter:stream-activity - ${err}`);
  });

  stream.on("disconnect", err => {
    console.error(`[*] svcstream:twitter:stream-activity - dc: ${err}`);
  });

  stream.on("reconnect", () => {
    console.info(`[i] svcstream:twitter:stream-activity - reconnecting`);
  });
};
