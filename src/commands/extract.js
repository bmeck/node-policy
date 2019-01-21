'use strict';
const {Command, flags} = require('@oclif/command');

class ExtractCommand extends Command {
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
    const {flags, args} = this.parse(ExtractCommand);
    const policyFilepath = path.resolve(flags.policy);
    const desinationFilepath = path.resolve(args.DESTINATION);
    const destinationLocation = new URL(pathToFileURL(desinationFilepath).href);
    const policy = JSON.parse(await readFile(policyFilepath, 'utf8'));
    const prefix = flags.prefix;
    let numResources = 0;
    if (policy && typeof policy === 'object' && policy.resources) {
      for (const urlString of Object.keys(policy.resources)) {
        try {
          const absolute = new URL(urlString);
          if (!absolute.href.startsWith(prefix)) {
            delete policy.resources[urlString];
          }
          numResources++;
        } catch (error) {
          // URL resolution needs to be preserved
          const resourceLocation = new URL(urlString, pathToFileURL(policyFilepath));
          const value = policy.resources[urlString];
          delete policy.resources[urlString];
          if (resourceLocation.href.startsWith(prefix)) {
            const newURLString = relativeURLString(
              destinationLocation,
              resourceLocation);
            policy.resources[newURLString] = value;
            numResources++;
          }
        }
      }
    }
    await writeFile(desinationFilepath, JSON.stringify(policy, null, 2));
    console.error(`wrote policy ${chalk.bold(desinationFilepath)} containing ${chalk.green(numResources)} resources`)
  }
}

ExtractCommand.args = [
  require('../args').DESTINATION,
];

ExtractCommand.description = `
Create a new policy file that only contains paths pointing within a specific prefix
`;

ExtractCommand.flags = Object.assign({
  prefix: flags.string({
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
  })
}, require('../flags'));

module.exports = ExtractCommand;
