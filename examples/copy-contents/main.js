'use strict';
const bodyParser = require('./body-parser');
const auth = require('./check-auth');
const app = require('express')();

app.use(auth);
app.use(bodyParser);
app.post('/echo', (req, res) => {
  req.pipe(res);
});
