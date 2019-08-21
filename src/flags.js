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
  get dependencies() {
    return flags.string({
      name: 'dependencies',
      description: 'a dependency mapping, as JSON. e.g. --dependencies=\'{"fs":"node:fs"}\'',
      required: true,
      parse: input => {
        const json = JSON.parse(`${input}`);
        if (json === true) return true;
        if (json && typeof json === 'object' && !Array.isArray(json)) {
          for (const value of Object.values(json)) {
            if (typeof value !== 'string' && value !== true) {
              throw SyntaxError('dependency values must be a string or the boolean value true');
            }
          }
          return json;
        }
        throw SyntaxError('dependency must be an object in JSON format');
      }
    });
  },
  get discard() {
    return flags.boolean({
      char: 'd',
      name: 'discard',
      description: 'discards existing values for the resources',
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
