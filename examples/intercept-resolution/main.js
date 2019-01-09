'use strict';
// expected check-auth.js
const auth = require('./check-auth');
const app = require('express')();

app.use(auth);
app.post('/echo', (req, res) => {
  req.pipe(res);
});
