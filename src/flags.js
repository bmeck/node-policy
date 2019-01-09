'use strict';
const path = require('path');
const {flags} = require('@oclif/command');
module.exports = {
  policy: flags.string({
    char: 'p',
    description: 'path of policy file being ',
    default: () => {
      return path.join(require('os').homedir(), '.node-policy.json');
    },
  }),
};
