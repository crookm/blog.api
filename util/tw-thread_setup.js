const url = require("url");

const tw_threads = require("./store-tw_threads");

const tw = require("twitter");
const twclient = new tw({
  consumer_key: process.env.TWCKEY,
  consumer_secret: process.env.TWCSEC,
  access_token_key: process.env.TWATKEY,
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
      thread["list"] = new_collection_resp.response.timeline_id; // id for the timeline of comments

      // save the object
      tw_threads.put_thread(thread.id, thread);
      resolve(thread);

      // add the thread tweet to the coll to set it up
      await twclient
        .post("collections/entries/add", {
          id: thread.list,
          tweet_id: thread.id
        })
        .catch(reject);
    }
  });
