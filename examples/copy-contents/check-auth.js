'use strict';
module.exports = (req, _res, next) => {
  if (req.headers.authorization === 'SECRET') {
    next();
  } else {
    next(new Error('Not Authorized'));
  }
};
