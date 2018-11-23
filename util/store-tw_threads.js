const { performance } = require("perf_hooks");
const store = require("./store-mongo");

let changes = 0; // number of dirty changes
const MAX_CACHED = 50; // how many tweets should we cache in-memory
let thread_cache = {}; // local collection of tweets cached

// refresh thread tweet store
console.info(`[i] util:store-tw_threads - refreshing thread tweets...`);
let thread_tweet_start = performance.now();
let do_cache_threads = async () => {
  // get the most recently accessed tweets for the cache
  let cursor = await store
    .find("apidata", "twitter", {}, { sort: { accessed: -1, last_access: -1 } })
    .catch(err => console.error(`[*] util:store-tw_threads - ${err}`));

  // add to the cache
  if (cursor)
    cursor.limit(MAX_CACHED).forEach(
      (
        doc // iterate through the cursor
      ) =>
        (thread_cache[doc.id] = {
          id: doc.id,
          path: doc.path,
          title: doc.title,
          list: doc.list
        }),
      err => {
        // when all is done
        if (err) console.error(`[*] util:store-tw_threads - ${err}`);
        else
          console.info(
            `[i] util:store-tw_threads - finished caching threads (${(
              performance.now() - thread_tweet_start
            ).toFixed(2)}ms)`
          );
      }
    );
};

// setup connection and cache
store
  .hello()
  .then(() =>
    store
      .db_open("apidata")
      .then(do_cache_threads) // ensure client is connected, then pre-cache popular threads
      .catch(err => {
        console.error(`[*] util:store-tw_threads - ${err}`);
      })
  )
  .catch(err => {
    console.error(`[*] util:store-tw_threads - ${err}`);
  });

module.exports = {
  // returns a mongo cursor of all items
  get_threads: () => {
    return store
      .find("apidata", "twitter", {}, {})
      .catch(err => console.error(`[*] util:store-tw_threads - ${err}`));
  },

  get_thread: id =>
    new Promise(async (resolve, reject) => {
      let thread = thread_cache[id];
      if (typeof thread === "undefined") {
        // not in cache, get from mongo
        let cursor = await store
          .find("apidata", "twitter", { id }, {})
          .catch(reject);

        if (cursor) {
          let doc = await cursor.next().catch(reject); // .next() is null if no docs left
          if (doc)
            // add to cache at the same time
            thread = thread_cache[doc.id] = {
              id: doc.id,
              path: doc.path,
              title: doc.title,
              list: doc.list
            };
          else thread = false;
        }
      }

      resolve(thread);
    }),

  put_thread: (id, val) =>
    new Promise(async (resolve, reject) => {
      thread_cache[id] = val; // snatch to cache
      let cursor = await store
        .update(
          "apidata",
          "twitter",
          { id: id },
          { $set: { ...val, last_access: new Date(), accessed: 1 } },
          { upsert: true }
        )
        .catch(reject);

      resolve(cursor);
    }),

  search: val => // only really hit by svcweb
    new Promise(async (resolve, reject) => {
      let cache_filter = Object.keys(thread_cache).filter(
        key => thread_cache[key].path === val
      )[0];

      let thread = thread_cache[cache_filter];
      if (typeof thread === "undefined") {
        let cursor = await store
          .find("apidata", "twitter", { path: val }, {})
          .catch(reject);

        if (cursor) {
          let doc = await cursor.next().catch(reject);
          if (doc)
            // add to cache at the same time
            thread = thread_cache[doc.id] = {
              id: doc.id,
              path: doc.path,
              title: doc.title,
              list: doc.list
            };
          else thread = false;
        }
      }

      resolve(thread);

      // continue after resolving to inc access
      // > might need to debounce this and batch it up
      if (thread)
        await store
          .update(
            "apidata",
            "twitter",
            { id: thread.id },
            { $set: { last_access: new Date() }, $inc: { accessed: 1 } },
            {}
          )
          .catch(err => console.warn(`[w] util:store-tw_threads - ${err}`));
    })
};
