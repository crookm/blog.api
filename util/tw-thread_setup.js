const url = require("url");

const tw_threads = require("./store-tw_threads");

const tw = require("twit");
const twclient = new tw({
  consumer_key: process.env.TWCKEY,
  consumer_secret: process.env.TWCSEC,
  access_token: process.env.TWATKEY,
  access_token_secret: process.env.TWATSEC
});

module.exports = (tweet, tweet_url_entity) =>
  new Promise(async (resolve, reject) => {
    let thread = {
      id: tweet.id_str,
      path: url.parse(tweet_url_entity.expanded_url).pathname,
      title: tweet.text.replace(tweet_url_entity.url, "").trim() // we want the title
    };

    const new_collection_resp = await twclient
      .post("collections/create", {
        name: "Replies",
        description: thread.title.substring(0, 160 - 3) + "..."
      })
      .catch(reject);

    if (new_collection_resp) {
      thread["list"] = new_collection_resp.data.response.timeline_id; // id for the timeline of comments
      resolve(thread);

      // save the object in the bg
      tw_threads
        .put_thread(thread.id, thread)
        .catch(err => console.warn(`[w] util:store-tw_thread_setup - ${err}`));
    }
  });
