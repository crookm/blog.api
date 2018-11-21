const { performance } = require("perf_hooks");
const store = require("./store-do");

let changes = 0;
let thread_tweets = {};

// refresh thread tweet store
console.info(`[i] util:store-tw_threads - refreshing thread tweets...`);
let thread_tweet_start = performance.now();
store.get_obj("api/obj/twitter/threads.json", (err, data) => {
  if (err) {
    console.error(`[*] util:store-tw_threads - ${err}`);
  } else {
    let body = JSON.parse(data.Body);
    if (body) thread_tweets = body.data;

    console.info(
      `[i] util:store-tw_threads - finished refreshing threads (${(
        performance.now() - thread_tweet_start
      ).toFixed(2)}ms)`
    );
  }
});

module.exports = {
  get_threads: () => {
    return thread_tweets;
  },

  get_thread: id => {
    return thread_tweets[id];
  },

  put_thread: (id, val) => {
    thread_tweets[id] = val;
    console.info(
      `[i] util:store-tw_threads - thread inserted, backlog now at ${++changes}`
    );
  },

  search: val => {
    return thread_tweets[
      Object.keys(thread_tweets).filter(key => thread_tweets[key].path === val)
    ];
  },

  update_ep: () => {
    if (changes > 0) {
      let from_changes = changes;
      console.debug(
        `[d] util:store-tw_threads - updating ${from_changes} changes to ep`
      );
      store.put_obj(
        "api/obj/twitter/threads.json",
        thread_tweets,
        {
          ContentType: "application/json",
          ContentDisposition: "inline"
        },
        (err, res) => {
          if (err) console.error(`[*] util:store-tw_threads - ${err}`);
          else {
            console.info(
              `[i] util:store-tw_threads - cached thread data to spaces (ETag: ${
                res.ETag
              })`
            );

            changes -= from_changes; // in case new changes were made since we started
          }
        }
      );
    }
  }
};

// update the endpoint every 5 minutes - if there are no
// changes, nothing will happen and no connection is made
setInterval(module.exports.update_ep, 1000 * 60 * 5);
