//////////
/// WIP //
//////////
// needs to manually crawl the tree as it installs to check
// 1. if packages attempt to modify the integrity of other packages
//    1. including bins
// 2. which packages were kept/added/updated/moved/removed
//    1. if the packages have pending vulnerabilitites
// 3. perform install scripts after initial unpacking and cross reference integrity changes
// 4. all of this out of band and then updated with a safer final swap operation
'use strict';
const {Command, flags} = require('@oclif/command');
const path = require('path');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const jsonFile = require('json-file-plus');
const { asyncSpawn } = require('../child_process_helpers');
const {
  URL,
  pathToFileURL,
} = require('url');
const semver = require('semver');
const {relativeURLString} = require('../url_helpers');
const {cli} = require('cli-ux');


class InstallCommand extends Command {
  async run() {
    const {flags, args} = this.parse(InstallCommand);
    const fix = flags.fix;
    const packageManager = flags['package-manager'];
    const {
      added,
      removed,
      updated,
      moved,
      warnings,
      audit,
    } = await getInstallerActions(packageManager);
    const vulnerablePackages = Object.keys(audit.advisories);
    const fixedPackages = [];
    const pkg = await jsonFile('package.json');
    for (
      const [k, desc] of vulnerablePackages.map(k => [k, audit.advisories[k]])
    ) {
      let update = false;
      if (fix === 'always') {
        update = true;
      } else if (fix === 'prompt') {
        console.log(`${desc.severity} vulnerability found for ${desc.module_name}`);
        while (true) {
          const act = await cli.prompt('Update (u), Ignore (i), Open details (o)');
          if (act === 'i') {
            break;
          } else if (act === 'o') {
            for (const cve of desc.cves) {
              await cli.open(`https://nvd.nist.gov/vuln/detail/${cve}`);
            }
          } else if (act === 'u') {
            update = true;
            break;
          }
        }
      }
      if (update) {
        const requests = await findPathsToPackage(packageManager, desc.module_name);
        const transitive = requests.filter(r => r.path.length !== 1);
        const transitiveConflicts = [];
        for (var i = 0; i < transitive.length; i++) {
          const a = transitive[i];
          console.log(a, desc)
          const intersects = semver.intersects(a.from, desc.patched_versions);
          if (!intersects) {
            transitiveConflicts.push(a);
          }
        }
        if (transitiveConflicts.length) {
          console.log(`Unable to safely update ${desc.module_name} to safe non-vulnerable version ${desc.patched_versions}`)
          for (const conflict of transitiveConflicts) {
            console.log(`Transitive dependency ${conflict.path.join(' -> ')}@${conflict.from} cannot be satisfied`)
          }
        } else {
          let needToAddToTop = true;
          for (const dict of [
            pkg.data.dependencies,
            pkg.data.devDependencies,
            pkg.data.peerDependencies,
            pkg.data.optionalDependencies,
          ]) {
            if (dict) {
              if (dict[desc.module_name]) {
                needToAddToTop = false;
                dict[desc.module_name] = desc.patched_versions;
              }
            }
          }
          if (needToAddToTop) {
            pkg.data.dependencies = pkg.data.dependencies || {};
            pkg.data.dependencies[desc.module_name] = desc.patched_versions;
          }
          fixedPackages.push(desc.module_name);
        }
      }
    }
    if (fixedPackages.length) {
      await pkg.save();
      console.log(`Fixed ${fixedPackages.length} known vulnerable packages`);
    }
  }
}

InstallCommand.args = [
];

InstallCommand.description = `
////////
UNSTABLE
////////
Installs the current directory without running install scripts
then runs install scripts with integrity checks applied
`;

InstallCommand.flags = Object.assign({
  'package-manager': flags.string({
    default: 'npm'
  }),
  fix: flags.enum({
    options: [
      'always',
      'never',
      'prompt',
    ],
    default: 'prompt',
  })
}, require('../flags'));

module.exports = InstallCommand;

async function getInstallerActions(packageManager) {
  const [code, stdout, stderr] = await asyncSpawn(packageManager, [
    'install',
    '--dry-run',
    '--json',
    '--ignore-scripts'
  ]);
  if (code !== 0) {
    throw new Error(`Package manager exited with code ${code}\n${stderr.toString('utf8')}`);
  } else {
    return JSON.parse(stdout.toString('utf8'));
  }
}

async function findPathsToPackage(packageManager, name) {
  const [code, stdout, stderr] = await asyncSpawn(packageManager, ['ls', '--json', '--', name]);
  // missing causes non-zero exit
  const routes = JSON.parse(stdout);
  const paths = [];
  const walk = (node, path = []) => {
    const packages = Object.keys(node);
    for (const pkgName of packages) {
      const nextPath = [...path, pkgName];
      const pkg = node[pkgName];
      if (pkg.dependencies) {
        walk(pkg.dependencies, nextPath)
      }
      if (pkgName === name) {
        paths.push({
          path: nextPath,
          from: pkg.missing ? pkg.required : pkg.from.slice(name.length + 1),
        })
      }
    }
  }
  walk(routes.dependencies);
  return paths;
}
