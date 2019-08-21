'use strict';
const {Command} = require('@oclif/command');

class DependenciesViewCommand extends Command {
  async run() {
    const chalk = require('chalk');
    const path = require('path');
    const fs = require('fs');
    const util = require('util');
    const readFile = util.promisify(fs.readFile);
    const {pathToFileURL} = require('url');

    const {flags} = this.parse(DependenciesViewCommand);
    const policyFilepath = path.resolve(flags.policy);
    const policyLocation = pathToFileURL(policyFilepath);
    const policy = JSON.parse(await readFile(policyFilepath, 'utf8'));
    if (!policy.resources) {
      policy.resources = {};
    }
    let numShown = 0;
    let targetDependents = new Map();
    for (const [resourceHref, {dependencies}] of Object.entries(policy.resources)) {
      let resolvedTargets = new Set();
      if (dependencies === true) {
        resolvedTargets.add('*');
      } else if (dependencies && typeof dependencies === 'object' && !Array.isArray(dependencies)) {
        for (const [, target] of Object.entries(dependencies)) {
          if (target === true) {
            resolvedTargets.add('*');
          } else if (typeof target === 'string') {
            resolvedTargets.add(new URL(target, policyLocation).href);
          } else {
            continue
          }
        }
      } else {
        continue;
      }
      for (const resolved of resolvedTargets) {
        if (!targetDependents.has(resolved)) {
          targetDependents.set(resolved, new Set());
        }
        targetDependents.get(resolved).add(new URL(resourceHref, policyLocation));
      }
    }
    for (const [target, dependents] of targetDependents) {
      console.group(`${chalk.green(`${target}`)}`)
      for (const dependent of dependents) {
        console.log(`${chalk.yellow(dependent)}`);
      }
      console.groupEnd();
    }
  }
}

DependenciesViewCommand.description = `
Shows all fully resolved dependency URLs available when using a policy.
* shows when a policy does not have a completely static resolution.
`;

const {policy} = require('../../flags');
DependenciesViewCommand.flags = {
  policy,
};

module.exports = DependenciesViewCommand;
