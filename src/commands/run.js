'use strict';
const {Command, flags} = require('@oclif/command');

class RunCommand extends Command {
  async run() {
    const chalk = require('chalk');
    const path = require('path');
    const fs = require('fs');
    const util = require('util');
    const readFile = util.promisify(fs.readFile);
    const writeFile = util.promisify(fs.writeFile);
    const access = util.promisify(fs.access);
    const { spawn } = require('child_process');
    const { getHashes, createHash } = require('crypto');
    const { argv, flags} = this.parse(RunCommand);
    const { cli } = require('cli-ux');

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
    const prePolicyContents = await readFile(policyFilepath);
    const pathEnvSeparator = process.platform === 'win32' ? ';' : ':';
    const childPATH = `${
        process.env.PATH
      }${
        pathEnvSeparator
      }${
        path.resolve(process.cwd(), 'node_modules', '.bin')
      }`;
    if (argv.length) {
      try {
        const resolved = path.resolve(process.cwd(), argv[0]);
        await access(resolved);
        argv[0] = resolved;
      } catch (e) {
        /**
         * @type {(cmd: string, options: {path: string}) => Promise<string>}
         */
        const which = util.promisify(require('which'));
        argv[0] = await which(argv[0], {
          path: childPATH,
        });
      }
    }
    const child = spawn(process.execPath, [
      '--experimental-policy',
      policyFilepath,
      ...argv
    ], {
      stdio: 'inherit',
    });
    child.on('exit', async (code, signal) => {
      const preHash = createHash(supportedAlgorithms[supportedAlgorithms.length - 1]);
      preHash.update(prePolicyContents);
      const beforeRunPolicyDigest = preHash.digest('base64');
      const postPolicyContents = await readFile(policyFilepath);
      const postHash = createHash(supportedAlgorithms[supportedAlgorithms.length - 1]);
      postHash.update(postPolicyContents);
      const afterRunPolicyDigest = postHash.digest('base64');
      if (beforeRunPolicyDigest !== afterRunPolicyDigest) {
        console.error(`${chalk.yellow(policyFilepath)} was modified.`);
        if (flags.interactive) {
          let c;
          while (c = await cli.prompt('Revert the policy to its original contents? yes (y) no (n)')) {
            if (c === 'y') {
              await writeFile(policyFilepath, prePolicyContents);
              break;
            } else if (c === 'n') {
              break;
            }
          }
        }
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

RunCommand.flags = Object.assign({
  interactive: flags.boolean({
    char: 'i',
    name: 'interactive',
    description: 'allow prompting for interactions regarding policies',
    default: false
  })
}, require('../flags'));

module.exports = RunCommand;
