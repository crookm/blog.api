const aws = require("aws-sdk");
aws.config.update({
  accessKeyId: process.env.SPACESID,
  secretAccessKey: process.env.SPACESKEY
});

const spaces = new aws.S3({
  endpoint: "ams3.digitaloceanspaces.com"
});

module.exports = {
  get_obj: (file, cb) => {
    spaces.getObject({ Bucket: process.env.SPACESBUCKET, Key: file }, cb);
  },

  put_obj: (file, data, params, cb) => {
    spaces.putObject(
      {
        Bucket: process.env.SPACESBUCKET,
        Key: file,
        ...params,
        Body: JSON.stringify({
          updated: new Date(),
          data
        })
      },
      cb
    );
  }
};
