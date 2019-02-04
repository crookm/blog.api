const { performance } = require("perf_hooks");
const store = require("./store-mongo");

const ObjectID = require("mongodb").ObjectID;

// setup connection and cache
store
  .hello()
  .then(() =>
    store.db_open("apidata").catch(err => {
      console.error(`[*] util:store-react - ${err}`);
    })
  )
  .catch(err => {
    console.error(`[*] util:store-react - ${err}`);
  });

module.exports = {
  get_react: id =>
    new Promise(async (resolve, reject) => {
      let cursor = await store
        .aggregate("apidata", "react", [
          { $match: { _id: ObjectID(id) } },
          { $unwind: "$reactions" },
          { $group: {
            _id: "$reactions.reaction",
            count: { $sum: 1 }
          } }
        ], {})
        .catch(reject);
      let doc = await cursor.toArray().catch(reject);

      resolve(doc);
    }),

  post_react: (id, reaction, ip) =>
    new Promise(async (resolve, reject) => {
      await store
        .update(
          "apidata",
          "react",
          { _id: ObjectID(id) },
          {
            $push: {
              // add the vote
              reactions: {
                ip,
                date: new Date(),
                reaction
              }
            }
          }
        )
        .catch(reject);
      resolve();
    }),

  remove_react: (id, ip) =>
    new Promise(async (resolve, reject) => {
      await store
        .update(
          "apidata",
          "react",
          { _id: ObjectID(id) },
          {
            $pull: {
              reactions: { ip }
            }
          }
        )
        .catch(reject);
      resolve();
    })
};
