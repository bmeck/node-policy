'use strict';
const {Command} = require('@oclif/command');

class RunCommand extends Command {
  async run() {
    const chalk = require('chalk');
    const path = require('path');
    const fs = require('fs');
    const util = require('util');
    const readFile = util.promisify(fs.readFile);
    const { spawn } = require('child_process');
    const { getHashes, createHash } = require('crypto');
    const {flags} = this.parse(RunCommand);
    const SUPPORTED_HASHES = new Set(getHashes());
    const USABLE_ALGORITHMS = Object.freeze([
      'sha256',
      'sha384',
      'sha512',
    ]);
    const policyFilepath = path.resolve(flags.policy);
    const supportedAlgorithms = USABLE_ALGORITHMS.filter(
      algo => SUPPORTED_HASHES.has(algo)
    );
    if (!supportedAlgorithms.length) {
      console.error(`No supported algorithms, node must support one of ${
        USABLE_ALGORITHMS.map(algo => chalk.green(algo)).join(', ')
      }`);
    }
    const policyContents = await readFile(policyFilepath);
    const hash = createHash(supportedAlgorithms[supportedAlgorithms.length - 1]);
    hash.update(policyContents);
    const beforeRunPolicyDigest = hash.digest('base64');
    const child = spawn(process.execPath, [
      '--experimental-policy',
      policyFilepath,
      ...this.argv
    ], {
      stdio: 'inherit',
    });
    child.on('exit', async (code, signal) => {
      const policyContents = await readFile(policyFilepath);
      const hash = createHash(supportedAlgorithms[supportedAlgorithms.length - 1]);
      hash.update(policyContents);
      const afterRunPolicyDigest = hash.digest('base64');
      if (beforeRunPolicyDigest !== afterRunPolicyDigest) {
        console.error(`${chalk.yellow(policyFilepath)} was modified.`)
      }
      if (signal) {
        process.kill(process.pid, signal);
      }
      process.exit(code);
    })
  }
}

RunCommand.strict = false;

RunCommand.args = [
];

RunCommand.description = `
Prints the location of the policy file, complaining if some common misconfiguration
`;

RunCommand.flags = Object.assign({}, require('../flags'));

module.exports = RunCommand;
