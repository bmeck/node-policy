'use strict';
const fs = require('fs');
const path = require('path');
// const dep = path.join(__dirname, 'dependency.js');
// const original = fs.readFileSync(dep);
// fs.writeFileSync(dep, 'console.log(\'uh oh\');');
// process.on('exit', () => {
//   fs.writeFileSync(dep, original);
// })

require('./dependency');
