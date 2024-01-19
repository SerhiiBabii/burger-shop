const parseMultipart = require('parse-multipart');

const extractFile = (request) => {
  const boundary = parseMultipart.getBoundary(request.headers['content-type']);
  const files = parseMultipart.Parse(Buffer.from(request.body, 'base64'), boundary);
  const [{ filename, data }] = files;

  return {
    filename,
    data
  }
};

module.exports = { extractFile };