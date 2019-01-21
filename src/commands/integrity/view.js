'use strict';
const {Command} = require('@oclif/command');

class IntegrityViewCommand extends Command {
  async run() {
    const chalk = require('chalk');
    const path = require('path');
    const fs = require('fs');
    const util = require('util');
    const readFile = util.promisify(fs.readFile);
    const stat = util.promisify(fs.stat);
    const realpath = util.promisify(fs.realpath);
    const {pathToFileURL} = require('url');
    const rrdir = require('rrdir');
    const {relativeURLString} = require('../../url_helpers');

    const {flags, args} = this.parse(IntegrityViewCommand);
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
    let numShown = 0;
    for (const entry of entries) {
      const real = entry.symlink ? await realpath(entry.path) : entry.path;
      const realURL = pathToFileURL(real);
      const realHREF = realURL.href;
      const relativeString = relativeURLString(
        policyLocation,
        realURL
      );
      if (policy.resources[realHREF]) {
        const integrity = policy.resources[realHREF].integrity;
        if (typeof integrity === 'string') {
          numShown++;
          console.log(`${chalk.bold(realHREF)} ${chalk.green(integrity)}`);
        }
      }
      if (policy.resources[relativeString]) {
        const integrity = policy.resources[relativeString].integrity;
        if (typeof integrity === 'string') {
          numShown++;
          console.log(`${chalk.bold(relativeString)}: ${chalk.green(integrity)}`);
        }
      }
    }
    console.error(`listed ${chalk.green(numShown)} resource integrities in ${chalk.bold(location)}`);
  }
}
IntegrityViewCommand.strict = false;
IntegrityViewCommand.args = [
  require('../../args').LOCATION,
];

IntegrityViewCommand.description = `
Shows all integrity values for a location.
`;

IntegrityViewCommand.flags = Object.assign({
}, require('../../flags'));

module.exports = IntegrityViewCommand;
