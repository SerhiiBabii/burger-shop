const { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({});

const S3 = {
    async getAll(bucket) {
      const command = new ListObjectsV2Command({
        Bucket: bucket
      });

      try {
        const { Contents } = await s3Client.send(command);
        let urls = [];

        if (Contents && Contents.length) {
          urls = Contents.map(({ Key }) => `https://${bucket}.s3-${process.env.REGION}.amazonaws.com/${Key}`);
        }

        return [ null, urls ];
      } catch (err) {
        console.error(err);

        return [ err, null ];
      }
    },
    async write(data, fileName, bucket) {
      const timestamp = new Date().getTime();
      const key = `${timestamp}_${fileName}`;
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data,
        ACL: "public-read"
      });

      try {
        await s3Client.send(command);
        const url = `https://${bucket}.s3-${process.env.REGION}.amazonaws.com/${key}`;

        return [ null, url ];
      } catch (err) {
        console.error(err);

        return [ err, null ];
      }
    },
};

module.exports = S3;