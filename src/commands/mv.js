'use strict';
const {Command} = require('@oclif/command');
const path = require('path');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const {
  URL,
  pathToFileURL,
} = require('url');
const {relativeURLString} = require('../url-helpers');

class MoveCommand extends Command {
  async run() {
    const {flags, args} = this.parse(MoveCommand);
    const policyFilepath = path.resolve(flags.policy);
    const desinationFilepath = path.resolve(args.DESTINATION);
    const destinationLocation = new URL(pathToFileURL(desinationFilepath).href);
    const policy = JSON.parse(await readFile(policyFilepath, 'utf8'));
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
          policy.resources[newURLString] = policy.resources[urlString];
          delete policy.resources[urlString];
        }
      }
    }
    await writeFile(args.DESTINATION, JSON.stringify(policy, null, 2));
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
