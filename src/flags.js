'use strict';
const {flags} = require('@oclif/command');
module.exports = {
  get algorithm() {
      return flags.enum({
      char: 'a',
      name: 'algorithm',
      description: 'digest algorithm to use for integrity checks',
      required: true,
      multiple: false,
      options: [
        'sha256',
        'sha384',
        'sha512',
      ]
    });
  },
  get discard() {
    return flags.boolean({
      char: 'd',
      name: 'discard',
      description: 'discards other integrities for the resources',
      required: false,
      default: false,
    });
  },
  get interactive() {
    return flags.boolean({
      char: 'i',
      default: false
    });
  },
  get policy() {
    const path = require('path');
    return flags.string({
      char: 'p',
      description: 'path of policy file',
      default: () => {
        return path.join(require('os').homedir(), '.node-policy.json');
      },
    });
  },
  get prefix() {
    return flags.string({
      name: 'prefix',
      description: 'prefix that all resources path should be within, even relative ones',
      required: true,
      parse: input => {
        const prefix = new URL(input, pathToFileURL(process.cwd()));
        if (prefix.search || prefix.hash) {
          throw new SyntaxError('prefix cannot have search or hash component');
        }
        if (!prefix.pathname.endsWith('/')) {
          prefix.pathname += '/';
        }
        return prefix.href;
      }
    });
  }
};
