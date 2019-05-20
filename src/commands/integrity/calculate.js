'use strict';
const {Command} = require('@oclif/command');

class IntegrityCalculateCommand extends Command {
  async run() {
    const chalk = require('chalk');
    const fs = require('fs');
    const util = require('util');
    const readFile = util.promisify(fs.readFile);
    const stat = util.promisify(fs.stat);
    const realpath = util.promisify(fs.realpath);
    const crypto = require('crypto');
    
    const {flags, args} = this.parse(IntegrityCalculateCommand);
    const location = args.LOCATION;
    const algorithm = flags.algorithm;
    const info = await stat(location);
    if (info.isDirectory()) {
      console.error(`${chalk.default.red(location)} is not a file`);
      process.exit(1);
    }
    const real = await realpath(location);
    const hasher = crypto.createHash(algorithm);
    hasher.update(await readFile(real));
    const digest = hasher.digest('base64');
    console.log(`${algorithm}-${digest}`);
  }
}
IntegrityCalculateCommand.strict = true;
IntegrityCalculateCommand.args = [
  require('../../args').LOCATION,
];

IntegrityCalculateCommand.description = `
Calculates the integrity value a location, without consulting the policy.
`;

const {algorithm} = require('../../flags');
IntegrityCalculateCommand.flags = {
  algorithm
};

module.exports = IntegrityCalculateCommand;
