'use strict';
const {Command} = require('@oclif/command');
for (let ext of ['.ts', '.jsx', '.es6', '.es', '.json5', '.tsx']) {
  require.extensions[ext] = () => {throw new Error('stub');};
}
class ResourceAddCommand extends Command {
  async run() {
    const findPackageJSON = require('find-package-json');
    const chalk = require('chalk');
    const path = require('path');
    const fs = require('fs');
    const util = require('util');
    const readFile = util.promisify(fs.readFile);
    const writeFile = util.promisify(fs.writeFile);
    const stat = util.promisify(fs.stat);
    const realpath = util.promisify(fs.realpath);
    const {pathToFileURL, fileURLToPath} = require('url');
    const rrdir = require('rrdir');
    const {relativeURLString} = require('../../url_helpers');
    const {parse: parseSRI} = require('../../sri');
    const crypto = require('crypto');
    const {createRequire, builtinModules} = require('module');
    const tofuAnalyze = require('@bradleymeck/tofu/dump/index.js');
    
    const {flags, args} = this.parse(ResourceAddCommand);
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
    const algorithm = flags.algorithm;
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
    const dynamicDependents = new Map();
    const unresolvedDependents = new Map();
    const builtinDependents = new Map();
    for (const entry of entries) {
      const real = entry.symlink ? await realpath(entry.path) : entry.path;
      const realURL = pathToFileURL(real);
      const realHREF = realURL.href;
      const relativeString = relativeURLString(
        policyLocation,
        realURL
      );
      const contents = await readFile(realURL);
      // MATCH git by only checking first 1000 bytes
      let binary = contents.slice(0, 8000).indexOf(0) !== -1;
      if (!binary) {
        // analyze deps
        const contentStr = contents.toString('utf8');
        let plugins = [
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
        ];
        while (true) {
          try {
            // console.error('parsing', realHREF)
            const analysis = tofuAnalyze(contentStr, {
              parseOptions: {
                sourceType: 'unambiguous',
                allowReturnOutsideFunction: true,
                allowAwaitOutsideFunction: true,
                sourceFilename: realHREF,
                plugins
              },
              forceFunction: false,
              forceStrict: false,
              nonFreeVariables: () => []
            });
            const analyzed = analysis.analyzed({loc:true});
            const relativeResolve = createRequire(realURL).resolve;
            let dynamic = false;
            let dependencies = [];
            let destinationResourceHREF = policy.resources[realHREF] ? realHREF : relativeString;
            // TODO use ESM resolver explicitly once exposed
            for (const require of [...(analyzed.requires || []), ...(analyzed.imports || [])]) {
              if (require.type !== 'static') {
                dynamic = true;
                if (!dynamicDependents.has(realHREF)) {
                  dynamicDependents.set(realHREF, []);
                }
                dynamicDependents.get(realHREF).push(require.loc.start);
                break;
              }
              const specifier = JSON.parse(require.specifier.value);
              let resolved;
              try {
                resolved = relativeResolve(specifier);
                if (path.isAbsolute(resolved)) {
                  resolved = relativeURLString(
                    policyLocation,
                    pathToFileURL(resolved)
                  );
                } else if (builtinModules.includes(resolved)) { // builtin
                  const url = new URL(`node:${resolved}`);
                  resolved = url.href;
                  if (!builtinDependents.has(resolved)) {
                    builtinDependents.set(resolved, new Set());
                  }
                  builtinDependents.get(resolved).add(realHREF);
                } else {
                  throw new Error('not found');
                }
              } catch (e) {
                resolved = true;
                if (!unresolvedDependents.has(realHREF)) {
                  unresolvedDependents.set(realHREF, new Map());
                }
                const resourceUnresolved = unresolvedDependents.get(realHREF);
                if (!resourceUnresolved.has(specifier)) {
                  resourceUnresolved.set(specifier, []);
                }
                resourceUnresolved.get(specifier).push(require.loc.start);
              }
              dependencies.push([
                specifier,
                resolved
              ]);
            }
            parsed.add(realHREF);
            let depPolicy = dynamic ? true : Object.fromEntries(dependencies);
            if (!policy.resources[destinationResourceHREF]) {
              policy.resources[destinationResourceHREF] = {
                integrity: true
              };
            }
            policy.resources[destinationResourceHREF].dependencies = depPolicy;
            break;
          } catch (e) {
            if (e.missingPlugin) {
              if (typeof e.missingPlugin === 'string') {
                plugins.push(e.missingPlugin);
              } else {
                plugins.push(e.missingPlugin[0]);
              }
            } else {
              // FAILED TO PARSE, ignore
              break;
            }
          }
        }     
      }
      const hasher = crypto.createHash(algorithm);
      hasher.update(contents);
      const digest = hasher.digest('base64');
      function addIntegrityToResource(location, algorithm, digest) {
        if (policy.resources[location]) {
          let seen = new Map();
          let alreadyExists = false;
          const integrityStr = policy.resources[location].integrity || '';
          if (integrityStr === true) return;
          for (const existing of parseSRI(integrityStr)) {
            if (!seen.has(existing.algorithm)) {
              seen.set(existing.algorithm, new Set());
            }
            const valueStr = existing.value.toString('base64');
            seen.get(existing.algorithm).add(valueStr);
            if (existing.algorithm === algorithm && valueStr === digest) {
              alreadyExists = true;
            }
          }
          if (!alreadyExists) {
            numAdditions++;
            if (!seen.has(algorithm)) {
              seen.set(algorithm, new Set());
            }
            seen.get(algorithm).add(digest);
          } else if (flags.discard) {
            if (seen.size === 1 && seen.get(algorithm).size === 1) {
              return true;
            } else {
              numAdditions++;
              policy.resources[location].integrity = `${algorithm}-${digest}`;
              return true;
            }
          }
          const newIntegrityStr = [
            ...seen.entries()
          ].sort((a,b) => {
            return `${a[0]}` > `${b[0]}` ? 1 : -1;
          }).map(([alg, values]) => {
            return [...values].map(v => `${alg}-${v}`).join(' ')
          }).join(' ');
          policy.resources[location].integrity = newIntegrityStr;
          return true;
        }
        return false;
      }
      if (addIntegrityToResource(realHREF, algorithm, digest)) {
        addIntegrityToResource(relativeString, algorithm, digest);
      } else {
        if (!policy.resources[relativeString]) {
          policy.resources[relativeString] = {integrity: ''};
        };
        addIntegrityToResource(relativeString, algorithm, digest);
      }
    }
    await writeFile(policyFilepath, JSON.stringify(policy, null, 2));
    console.error(`${chalk.green(numAdditions)} integrity values added to ${chalk.bold(policyFilepath)}`);
    for (const [builtin, dependents] of [...builtinDependents.entries()].sort(sortEntriesByKeysAndTypeof)) {
      console.error(`${chalk.green(builtin)} permission was be granted to ${chalk.green(dependents.size)} modules`);
    }
    if (dynamicDependents.size > 0) {
      console.error(`${chalk.red('arbitrary code loading')} permission will be granted to ${chalk.green(dynamicDependents.size)} modules`);
      for (const [resourceHREF, locations] of dynamicDependents) {
        for (const {line, column} of locations) {
          console.error(`dynamic specifier at ${chalk.bold(`${resourceHREF}:${line}:${column}`)}`);
        }
      }
    }
    if (unresolvedDependents.size > 0) {
      console.error(`${chalk.red('unresolved code loading')} permission will be granted to ${chalk.green(unresolvedDependents.size)} modules (are some modules not installed?)`);
      const missingPackageDeps = new Map();
      const missingUnknownDeps = new Map();
      for (const [resourceHREF, unresolvedSpecifiers] of unresolvedDependents) {
        resolve_specifiers:
        for (const [specifier, locations] of unresolvedSpecifiers) {
          const realPath = fileURLToPath(resourceHREF);
          let missingDependency = null;
          if (/^\.?\.?\//.test(specifier) === false) {
            for (const value of findPackageJSON(realPath)) {
              if (!value) continue;
              const {__path: filename} = value;
              function isMatchingDepName(depName) {
                if (specifier === depName) return true;
                if (specifier.startsWith(`${depName}/`)) return true;
                // FIXME, warn when not on windows
                if (specifier.startsWith(`${depName}\\`)) return true;
                return false;
              }
              const depSources = [
                'dependencies',
                'devDependencies',
                'peerDependencies',
                'optionalDependencies'
              ].map(pkgFieldName => {
                const depName = Object.keys(value[pkgFieldName] || {}).find(isMatchingDepName)
                if (depName !== undefined) return {
                  type: pkgFieldName,
                  name: depName
                };
              }).filter(Boolean);
              if (depSources.length > 0) {
                if (!missingPackageDeps.has(filename)) {
                  missingPackageDeps.set(filename, new Map());
                }
                const unresolvedPackageFields = missingPackageDeps.get(filename);
                // only get the relevant packageField
                const { type, name } = depSources[0];
                if (!unresolvedPackageFields.has(type)) {
                  unresolvedPackageFields.set(type, new Map());
                }
                const unresolvedPackageField = unresolvedPackageFields.get(type);
                if (!unresolvedPackageField.has(name)) {
                  unresolvedPackageField.set(name, new Set());
                }
                unresolvedPackageField.get(name).add({resourceHREF, locations});
                break resolve_specifiers;
              }
            }
          }
          if (!missingUnknownDeps.has(resourceHREF)) {
            missingUnknownDeps.set(resourceHREF, new Set());
          }
          missingUnknownDeps.get(resourceHREF).add({specifier, locations});
        }
      }
      for (const [pkgFileName, unresolvedPackageFields] of missingPackageDeps) {
        console.group(`unresolved resolutions seem to be coming from ${chalk.bold(pkgFileName)} not having all dependencies installed`);
        for (const [field, unresolvedDepNames] of unresolvedPackageFields) {
          console.group(`the following ${chalk.yellow(field)} are missing`);
          for (const [depName, dependents] of unresolvedDepNames) {
            console.error(`${chalk.green(depName)} is missing and depended on ${
              [...dependents].sort(({locations: a}, {locations: b}) => {
                return a.line < b.line ? -1 : a.column < b.column ? -1 : 1;
              }).flatMap(
                ({resourceHREF, locations}) => locations.map(({line, column}) => {
                  return chalk.bold(`${resourceHREF}:${line}:${column}`);
                })
              ).join(' , ')
            }`);
          }
          console.groupEnd();
        }
        console.groupEnd();
      }
      for (const [resourceHREF, unresolvedSpecifierAndLocations] of missingUnknownDeps) {
        console.group(`unresolved resolutions are coming from ${chalk.bold(resourceHREF)} that have no recommendations`);
        for (const {specifier, locations} of unresolvedSpecifierAndLocations) {
          console.error(`${chalk.green(specifier)} is missing and depended on at ${
            [...locations].sort((a, b) => {
              return a.line < b.line ? -1 : a.column < b.column ? -1 : 1;
            }).map(({line, column}) => {
              return chalk.bold(`${resourceHREF}:${line}:${column}`);
            }).join(' , ')
          }`);
        }
        console.groupEnd();
      }
    }
  }
}
ResourceAddCommand.strict = false;
ResourceAddCommand.args = [
  require('../../args').LOCATION,
];

ResourceAddCommand.description = `
Adds integrity values for a location.
`;

const {algorithm, discard, policy} = require('../../flags');
ResourceAddCommand.flags = {
  algorithm,
  discard,
  policy
};

module.exports = ResourceAddCommand;

/**
 * @template T
 * @param {[any, T]} param0 
 * @param {[any, T]} param1
 */
function sortEntriesByKeysAndTypeof([a, _a], [b, _b]) {
  if (typeof a !== typeof b) {
    return typeof a < typeof b ? -1 : 1;
  }
  return String(a) < String(b) ? -1 : 1;
}
