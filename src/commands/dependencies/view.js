'use strict';
const {Command} = require('@oclif/command');

class DependenciesViewCommand extends Command {
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

    const {flags, args} = this.parse(DependenciesViewCommand);
    console.log({flags, args})
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
      function printDeps(resourceString, dependencies) {
        if (dependencies === true) {
          numShown++;
          console.log(`${chalk.bold(resourceString)}: ${chalk.green('*')}`);
        } else if (dependencies && typeof dependencies === 'object' && !Array.isArray(dependencies)) {
          numShown++;
          const mappings = Object.entries(dependencies);
          for (const [specifier, target] of mappings) {
            if (target === true) {
              console.log(`${chalk.bold(resourceString)}: ${chalk.green(specifier)} => ${chalk.green('*')}`);
            } else if (typeof target === 'string') {
              console.log(`${chalk.bold(resourceString)}: ${chalk.green(specifier)} => ${chalk.green(new URL(target, policyLocation).href)}`);
            }
          }
        }
      }
      if (policy.resources[realHREF]) {
        const dependencies = policy.resources[realHREF].dependencies;
        printDeps(realHREF, dependencies);
      }
      if (policy.resources[relativeString]) {
        const dependencies = policy.resources[relativeString].dependencies;
        printDeps(relativeString, dependencies);
      }
    }
    console.error(`listed ${chalk.green(numShown)} resource dependency maps in ${chalk.bold(location)}`);
  }
}
DependenciesViewCommand.strict = false;
DependenciesViewCommand.args = [
  require('../../args').LOCATION,
];

DependenciesViewCommand.description = `
Shows all dependency mappings for a location.
`;

const {policy} = require('../../flags');
DependenciesViewCommand.flags = {
  policy
};

module.exports = DependenciesViewCommand;
