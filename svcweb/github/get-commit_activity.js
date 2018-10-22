const store = require("../../util/store-do");

module.exports = async (req, res) => {
  store.get_obj("api/obj/github/recent_commits.json", (err, data) => {
    if (err) res.status(500).send(err);
    else {
      res.setHeader("ETag", data.ETag);
      res.type("json").send(data.Body);
    }
  });
};
