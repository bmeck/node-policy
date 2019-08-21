'use strict';
const {Command} = require('@oclif/command');
class DependenciesAddCommand extends Command {
  async run() {
    const chalk = require('chalk');
    const path = require('path');
    const fs = require('fs');
    const util = require('util');
    const readFile = util.promisify(fs.readFile);
    const writeFile = util.promisify(fs.writeFile);
    const stat = util.promisify(fs.stat);
    const realpath = util.promisify(fs.realpath);
    const {pathToFileURL} = require('url');
    const rrdir = require('rrdir');
    const {relativeURLString} = require('../../url_helpers');
    const {createRequire, builtinModules} = require('module');
    
    const {flags, args} = this.parse(DependenciesAddCommand);
    const policyFilepath = path.resolve(flags.policy);
    const policyLocation = pathToFileURL(policyFilepath);
    let policyContents;
    try {
      policyContents = await readFile(policyFilepath, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') {
        policyContents = '{}';
      }
    }
    const policy = JSON.parse(policyContents);
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
    let numAdditions = 0;
    const parsed = new Set();
    for (const entry of entries) {
      const real = entry.symlink ? await realpath(entry.path) : entry.path;
      const realURL = pathToFileURL(real);
      const realHREF = realURL.href;
      if (parsed.has(realHREF)) continue;
      const relativeString = relativeURLString(
        policyLocation,
        realURL
      );
      const contents = await fs.promises.readFile(realURL, 'utf8');
      try {
        const analysis = require('@bradleymeck/tofu/dump/index.js')(contents, {
          parseOptions: {
            sourceType: 'unambiguous',
            allowReturnOutsideFunction: true,
            allowAwaitOutsideFunction: true,
            plugins: [
              'jsx',
              'typescript',
              'asyncGenerators',
              'bigInt',
              'classProperties',
              'classPrivateProperties',
              'classPrivateMethods',
              'dynamicImport',
              'exportDefaultFrom',
              'exportNamespaceFrom',
              'importMeta',
              'nullishCoalescingOperator',
              'numericSeparator',
              'objectRestSpread',
              'optionalCatchBinding',
              'optionalChaining'
            ]
          },
          forceFunction: false,
          forceStrict: false,
          nonFreeVariables: () => []
        });
        const analyzed = analysis.analyzed({loc:true});
        const relativeResolve = createRequire(realURL);
        let dynamic = false;
        let dependencies = [];
        // TODO use ESM resolver explicitly once exposed
        for (const require of [...(analyzed.requires || []), ...(analyzed.imports || [])]) {
          if (require.type !== 'static') {
            dynamic = true;
            break;
          }
          const specifier = JSON.parse(require.specifier.value);
          let resolved;
          try {
            resolved = relativeResolve.resolve(specifier);
            if (path.isAbsolute(resolved)) {
              resolved = relativeURLString(
                policyLocation,
                pathToFileURL(resolved)
              );
            } else if (builtinModules.includes(resolved)) { // builtin
              const url = new URL(`node:${resolved}`);
              resolved = url.href;
            } else {
              resolved = true;
            }
          } catch (e) {
            resolved = true;
          }
          dependencies.push([
            specifier,
            resolved
          ]);
        }
        parsed.add(realHREF);
        let depPolicy = dynamic ? true : Object.fromEntries(dependencies);
        let destinationResourceHREF = policy.resources[realHREF] ? realHREF : relativeString;
        if (!policy.resources[destinationResourceHREF]) {
          policy.resources[destinationResourceHREF] = {
            integrity: true
          };
        }
        policy.resources[destinationResourceHREF].dependencies = depPolicy;
      } catch (e) {
        // console.log(realHREF, e)
      }
    }
    await writeFile(policyFilepath, JSON.stringify(policy, null, 2));
    console.error(`${chalk.green(numAdditions)} integrity values added to ${chalk.bold(policyFilepath)}`);
  }
}
DependenciesAddCommand.strict = false;
DependenciesAddCommand.args = [
  require('../../args').LOCATION,
];

DependenciesAddCommand.description = `
Adds dependency mappings for a location.
`;

const {dependencies, discard, policy} = require('../../flags');
DependenciesAddCommand.flags = {
  //dependencies,
  discard,
  policy
};

module.exports = DependenciesAddCommand;
