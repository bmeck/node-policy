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

class IntegrityDeleteCommand extends Command {
  async run() {
    const {flags, args} = this.parse(IntegrityDeleteCommand);
    const policyFilepath = path.resolve(flags.policy);
    const policyLocation = pathToFileURL(policyFilepath);
    const policy = JSON.parse(await readFile(policyFilepath, 'utf8'));
    const location = args.LOCATION;
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
    let numDeleted = 0;
    for (const entry of entries) {
      const real = entry.symlink ? await realpath(entry.path) : entry.path;
      const realURL = pathToFileURL(real);
      const realHREF = realURL.href;
      const relativeString = relativeURLString(
        policyLocation,
        realURL
      );
      if (policy.resources[realHREF]) {
        if (
          policy.resources[realHREF].integrity &&
          delete policy.resources[realHREF].integrity
        ) {
          numDeleted++;
        }
      }
      if (policy.resources[relativeString]) {
        if (
          policy.resources[relativeString].integrity &&
          delete policy.resources[relativeString].integrity
        ) {
          numDeleted++;
        }
      }
    }
    if (numDeleted != 0) {
      writeFile(policyFilepath, JSON.stringify(policy, null, 2));
      console.error(`modified ${chalk.bold(policyFilepath)}`);
    }
    console.error(`deleted ${chalk.green(numDeleted)} resource integrities in ${chalk.bold(location)}`);
  }
}
IntegrityDeleteCommand.strict = false;
IntegrityDeleteCommand.args = [
  require('../../args').LOCATION,
];

IntegrityDeleteCommand.description = `
Removes integrity values for a location.
`;

IntegrityDeleteCommand.flags = Object.assign({
}, require('../../flags'));

module.exports = IntegrityDeleteCommand;
