'use strict';
const {Command, flags} = require('@oclif/command');

class LocateCommand extends Command {
  async run() {
    const chalk = require('chalk');
    const path = require('path');
    const fs = require('fs');
    const util = require('util');
    const access = util.promisify(fs.access);
    
    const {flags} = this.parse(LocateCommand);
    const policyFilepath = path.resolve(flags.policy);
    try {
      await access(policyFilepath, fs.constants.W_OK);
      const msg = `policy file ${chalk.bold(policyFilepath)} is writable`;
      if (flags.strict) {
        console.error(`${chalk.red('error')}: ${msg}`);
        process.exit(1);
      } else {
        console.error(`${chalk.yellow('warning')}: ${msg}`);
      }
    } catch (e) {}
    console.log(policyFilepath);
  }
}

LocateCommand.args = [
];

LocateCommand.description = `
Prints the location of the policy file, complaining if some common misconfiguration
`;

const {policy} = require('../flags');
LocateCommand.flags = {
  strict: flags.boolean({
    name: 'strict',
    description: 'exits with an error if policy is misconfigured',
    default: false,
  }),
  policy
};

module.exports = LocateCommand;
