'use strict';
module.exports = (req, _res, next) => {
  if (req.body) {
    next();
    return;
  }
  const bufs = [];
  req.on('data', bufs.push.bind(bufs));
  req.on('end', () => {
    req.body = Buffer.concat(bufs);
    next();
  });
};
