'use strict';
const {Command} = require('@oclif/command');

class MoveCommand extends Command {
  async run() {
    const chalk = require('chalk');
    const path = require('path');
    const fs = require('fs');
    const util = require('util');
    const readFile = util.promisify(fs.readFile);
    const writeFile = util.promisify(fs.writeFile);
    const {
      URL,
      pathToFileURL,
    } = require('url');
    const {relativeURLString} = require('../url_helpers');

    const {flags, args} = this.parse(MoveCommand);
    const policyFilepath = path.resolve(flags.policy);
    const desinationFilepath = path.resolve(args.DESTINATION);
    const destinationLocation = new URL(pathToFileURL(desinationFilepath).href);
    const policy = JSON.parse(await readFile(policyFilepath, 'utf8'));
    let numRewrittenPaths = 0;
    if (policy && typeof policy === 'object' && policy.resources) {
      for (const urlString of Object.keys(policy.resources)) {
        try {
          new URL(urlString); // eslint-disable-line no-new
          // absolute, do nothing
        } catch (error) {
          // URL resolution needs to be preserved
          const resourceLocation = new URL(urlString, pathToFileURL(policyFilepath));
          const newURLString = relativeURLString(
            destinationLocation,
            resourceLocation);
          if (newURLString !== urlString) {
            numRewrittenPaths++;
            policy.resources[newURLString] = policy.resources[urlString];
            delete policy.resources[urlString];
          }
        }
      }
    }
    await writeFile(desinationFilepath, JSON.stringify(policy, null, 2));
    console.error(`moved ${chalk.dim(policyFilepath)} to ${chalk.bold(desinationFilepath)}`);
    if (numRewrittenPaths !== 0) {
      console.error(`rewrote ${chalk.green(numRewrittenPaths)} relative paths to resources`);
    }
  }
}

MoveCommand.args = [
  require('../args').DESTINATION,
];

MoveCommand.description = `
Move a policy file to a new location, rewriting resource paths as needed
`;

MoveCommand.flags = Object.assign({}, require('../flags'));

module.exports = MoveCommand;
