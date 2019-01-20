'use strict';
const {Command, flags} = require('@oclif/command');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const stat = util.promisify(fs.stat);
const realpath = util.promisify(fs.realpath);
const {pathToFileURL} = require('url');
const rrdir = require('rrdir');
const {relativeURLString} = require('../../url_helpers');
const {parse: parseSRI} = require('../../sri');
const crypto = require('crypto');
const {cli} = require('cli-ux');

class IntegrityVerifyCommand extends Command {
  async run() {
    const {flags, args} = this.parse(IntegrityVerifyCommand);
    const policyFilepath = path.resolve(flags.policy);
    const policyLocation = pathToFileURL(policyFilepath);
    const policy = JSON.parse(await readFile(policyFilepath, 'utf8'));
    const location = args.LOCATION;
    const interactive = flags.interactive;
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
    let modified = false;
    let selectedDefaultAlgorithm = false;
    let defaultAlgorithm = null;
    let numChecked = 0;
    for (const entry of entries) {
      const real = entry.symlink ? await realpath(entry.path) : entry.path;
      const realURL = pathToFileURL(real);
      const realHREF = realURL.href;
      const relativeString = relativeURLString(
        policyLocation,
        realURL
      );
      const fileContents = await readFile(real);
      function hasIntegrityToResource(location) {
        if (policy.resources[location]) {
          const seenAlgorithms = new Map();
          if (policy.resources[location].integrity) {
            for (const existing of parseSRI(policy.resources[location].integrity)) {
              let value;
              if (seenAlgorithms.has(existing.algorithm)) {
                value = seenAlgorithms.get(existing.algorithm);
              } else {
                const hasher = crypto.createHash(existing.algorithm);
                hasher.update(fileContents);
                value = hasher.digest('base64');
                seenAlgorithms.set(existing.algorithm, value);
              }
              const valueStr = existing.value.toString('base64');
              if (valueStr === value) {
                return true;
              }
            }
          }
        }
        return false;
      }
      numChecked++;
      if (
        hasIntegrityToResource(realHREF) || hasIntegrityToResource(relativeString)
      ) {
        // had a match
      } else {
        if (!policy.resources[realHREF] && !policy.resources[relativeString]) {
          console.error(`${chalk.yellow(relativeString)} is not in the policy`);
        } else {
          console.log(`${chalk.red(relativeString)} contents do not match integrity values`);
        }
        if (interactive) {
          choosing_action:
          while (true) {
            const str = (await cli.prompt('Open (o), Add to policy (a), Skip (s)')).trim();
            if (str === 'o') {
              await cli.open(real);
            } else if (str === 's') {
              break;
            } else if (str === 'a') {
              while (true) {
                let selectedAlgorithm = selectedDefaultAlgorithm && defaultAlgorithm !== null ?
                  defaultAlgorithm :
                  await cli.prompt('Algorithm (sha256, sha384, sha512)');
                if (['sha256', 'sha384', 'sha512'].includes(selectedAlgorithm)) {
                  if (!selectedDefaultAlgorithm) {
                    while (true) {
                      const always = await cli.prompt('Always use this algorithm (y, n)?');
                      if (always === 'y') {
                        defaultAlgorithm = selectedAlgorithm;
                        break;
                      } else if (always === 'n') {
                        break;
                      }
                    }
                    selectedDefaultAlgorithm = true;
                  }
                  modified = true;
                  const hasher = crypto.createHash(selectedAlgorithm);
                  hasher.update(fileContents);
                  const value = hasher.digest('base64');
                  const res = policy.resources[relativeString] = policy.resources[relativeString] || {};
                  if (res.integrity) {
                    res.integrity += ' ';
                  } else {
                    res.integrity = '';
                  }
                  res.integrity += `${selectedAlgorithm}-${value}`;
                  break choosing_action;
                }
              }
            }
          }
        }
      }
    }
    if (modified) {
      writeFile(policyFilepath, JSON.stringify(policy, null, 2));
      console.error(`modified ${chalk.bold(policyFilepath)}`);
    }
    console.error(`checked ${chalk.green(numChecked)} resources in ${chalk.bold(location)}`);
  }
}
IntegrityVerifyCommand.strict = false;
IntegrityVerifyCommand.args = [
  require('../../args').LOCATION,
];

IntegrityVerifyCommand.description = `
Checks integrity values for a location.
`;

IntegrityVerifyCommand.flags = Object.assign({
  interactive: flags.boolean({
    char: 'i',
    default: false
  })
}, require('../../flags'));

module.exports = IntegrityVerifyCommand;
