'use strict';
const {Command} = require('@oclif/command');
class IntegrityAddCommand extends Command {
  async run() {
    const chalk = require('chalk');
    const path = require('path');
    const fs = require('fs');
    const util = require('util');
    const readFile = util.promisify(fs.readFile);
    const writeFile = util.promisify(fs.writeFile);
    const stat = util.promisify(fs.stat);
    const realpath = util.promisify(fs.realpath);
    const {pathToFileURL} = require('url');
    const rrdir = require('rrdir');
    const {relativeURLString} = require('../../url_helpers');
    const {parse: parseSRI} = require('../../sri');
    const crypto = require('crypto');
    
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
    let numAdditions = 0;
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
      function addIntegrityToResource(location, algorithm, digest) {
        if (policy.resources[location]) {
          let seen = new Map();
          let alreadyExists = false;
          const integrityStr = policy.resources[location].integrity || '';
          for (const existing of parseSRI(integrityStr)) {
            if (!seen.has(existing.algorithm)) {
              seen.set(existing.algorithm, new Set());
            }
            const valueStr = existing.value.toString('base64');
            seen.get(existing.algorithm).add(valueStr);
            if (existing.algorithm === algorithm && valueStr === digest) {
              alreadyExists = true;
            }
          }
          if (!alreadyExists) {
            numAdditions++;
            if (!seen.has(algorithm)) {
              seen.set(algorithm, new Set());
            }
            seen.get(algorithm).add(digest);
          } else if (flags.discard) {
            if (seen.size === 1 && seen.get(algorithm).size === 1) {
              return true;
            } else {
              numAdditions++;
              policy.resources[location].integrity = `${algorithm}-${digest}`;
              return true;
            }
          }
          const newIntegrityStr = [
            ...seen.entries()
          ].sort((a,b) => {
            return `${a[0]}` > `${b[0]}` ? 1 : -1;
          }).map(([alg, values]) => {
            return [...values].map(v => `${alg}-${v}`).join(' ')
          }).join(' ');
          policy.resources[location].integrity = newIntegrityStr;
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
    console.error(`${chalk.green(numAdditions)} integrity values added to ${chalk.bold(policyFilepath)}`);
  }
}
IntegrityAddCommand.strict = false;
IntegrityAddCommand.args = [
  require('../../args').LOCATION,
];

IntegrityAddCommand.description = `
Adds integrity values for a location.
`;

const {algorithm, discard, policy} = require('../../flags');
IntegrityAddCommand.flags = {
  algorithm,
  discard,
  policy
};

module.exports = IntegrityAddCommand;
