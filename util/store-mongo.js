const mongo = require("mongodb").MongoClient;

const client = new mongo(process.env.MONGODBURI, { useNewUrlParser: true });
let dbs = {}; // databases currently open

module.exports = {
  // setup the connection
  hello: () =>
    new Promise(async (resolve, reject) => {
      if (client.isConnected()) {
        console.log("[i] util:store-mongo - said hello, already connected");
        resolve();
      } else {
        client
          .connect()
          .then(() => {
            console.log("[i] util:store-mongo - said hello, connected");
            resolve();
          })
          .catch(reject);
      }
    }),

  // open database and add to open_dbs obj
  db_open: db_name =>
    new Promise(async (resolve, reject) => {
      if (!client.isConnected()) {
        // initiate the hello here if it hasn't already been setup
        console.log("[*] util:store-mongo - not connected, saying hello...");
        await module.exports.hello().catch(err => {
          console.error(`[*] util:store-mongo - error saying hello: ${err}`);
          reject(err);
        });
      }

      // make sure the client is definitely connected
      if (client.isConnected()) {
        try {
          // idek if the db method ever throws an error, docs were unclear
          dbs[db_name] = client.db(db_name);
          resolve();
        } catch (err) {
          console.error(
            `[*] util:store-mongo - error connecting to ${db_name}: ${err}`
          );
          reject(err);
        }
      }
    }),

  // find documents matching mongo search pattern, returns cursor
  find: (db_name, coll_name, search) =>
    new Promise(async (resolve, reject) => {
      // might end up connecting to the db ourselves here to simplify
      if (typeof dbs[db_name] === "undefined")
        reject("db not connected, use db_open first");
      else {
        // db.collection unfortunately isn't promisified :,(
        let collection = await module.exports
          .coll_get(db_name, coll_name)
          .catch(reject);

        try {
          resolve(collection.find(search));
        } catch (err) {
          reject(err);
        }
      }
    }),

  // get a collection in a db
  coll_get: (db_name, coll_name) =>
    new Promise((resolve, reject) =>
      dbs[db_name].collection(coll_name, { strict: true }, (err, coll) => {
        if (err) reject(err);
        else resolve(coll);
      })
    ),

  // close connection on terminate
  goodbye: async cb => {
    await client.close();
    cb();
  }
};
