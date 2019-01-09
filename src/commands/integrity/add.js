'use strict';
const {Command, flags} = require('@oclif/command');
const path = require('path');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const stat = util.promisify(fs.stat);
const realpath = util.promisify(fs.realpath);
const {pathToFileURL} = require('url');
const rrdir = require('rrdir');
const {relativeURLString} = require('../../url-helpers');
const {parse: parseSRI} = require('../../sri');
const crypto = require('crypto');

class IntegrityAddCommand extends Command {
  async run() {
    const {flags, args} = this.parse(IntegrityAddCommand);
    const policyFilepath = path.resolve(flags.policy);
    const policyLocation = pathToFileURL(policyFilepath);
    let policyContents;
    try {
      policyContents = await readFile(policyFilepath, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') {
        policyContents = '{}';
      }
    }
    const policy = JSON.parse(policyContents);
    const location = args.LOCATION;
    const algorithm = flags.algorithm;
    const info = await stat(location);
    let entries = [];
    if (info.isDirectory()) {
      entries = (await rrdir(location)).filter(r => !r.directory);
      if (entries.length === 0) return;
    } else {
      entries = [{path: location, directory: false, symlink: info.isSymbolicLink()}];
    }
    if (!policy.resources) {
      policy.resources = {};
    }
    for (const entry of entries) {
      const real = entry.symlink ? await realpath(entry.path) : entry.path;
      const realURL = pathToFileURL(real);
      const realHREF = realURL.href;
      const relativeString = relativeURLString(
        policyLocation,
        realURL
      );
      const hasher = crypto.createHash(algorithm);
      hasher.update(await readFile(real));
      const digest = hasher.digest('base64');
      function addIntegrityToResource(location, algorithm, value) {
        if (policy.resources[location]) {
          let seen = new Map();
          if (!policy.resources[location].integrity) {
            policy.resources[location].integrity = '';
          }
          let alreadyExists = false;
          for (const existing of parseSRI(policy.resources[location].integrity)) {
            if (!seen.has(existing.algorithm)) {
              seen.set(existing.algorithm, new Set());
            }
            const valueStr = existing.value.toString('base64');
            seen.get(existing.algorithm).add(valueStr);
            if (existing.algorithm === algorithm && valueStr === value) {
              alreadyExists = true;
            }
          }
          if (!alreadyExists) {
            if (!seen.has(algorithm)) {
              seen.set(algorithm, new Set());
            }
            seen.get(algorithm).add(value);
          }
          policy.resources[location].integrity = [
            ...seen.entries()
          ].sort((a,b) => {
            return `${a[0]}` > `${b[0]}` ? 1 : -1;
          }).map(([alg, values]) => {
            return [...values].map(v => `${alg}-${v}`).join(' ')
          }).join(' ');
          return true;
        }
        return false;
      }
      if (addIntegrityToResource(realHREF, algorithm, digest)) {
        addIntegrityToResource(relativeString, algorithm, digest);
      } else {
        if (!policy.resources[relativeString]) {
          policy.resources[relativeString] = {integrity: ''};
        };
        addIntegrityToResource(relativeString, algorithm, digest);
      }
    }
    await writeFile(policyFilepath, JSON.stringify(policy, null, 2));
  }
}
IntegrityAddCommand.strict = false;
IntegrityAddCommand.args = [
  require('../../args').LOCATION,
];

IntegrityAddCommand.description = `
Adds integrity values for a location.
`;

IntegrityAddCommand.flags = Object.assign({
  algorithm: flags.enum({
    char: 'a',
    name: 'algorithm',
    description: 'digest algorithm to use for integrity checks',
    required: true,
    options: [
      'sha256',
      'sha384',
      'sha512',
    ]
  })
}, require('../../flags'));

module.exports = IntegrityAddCommand;
