node-policy
========



[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@bradleymeck/node-policy.svg)](https://npmjs.org/package/@bradleymeck/node-policy)
[![CircleCI](https://circleci.com/gh/bmeck/node-policy/tree/master.svg?style=shield)](https://circleci.com/gh/bmeck/node-policy/tree/master)
[![Codecov](https://codecov.io/gh/bmeck/node-policy/branch/master/graph/badge.svg)](https://codecov.io/gh/bmeck/node-policy)
[![Downloads/week](https://img.shields.io/npm/dw/@bradleymeck/node-policy.svg)](https://npmjs.org/package/@bradleymeck/node-policy)
[![License](https://img.shields.io/npm/l/@bmeck/node-policy.svg)](https://github.com/bmeck/node-policy/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @bradleymeck/node-policy
$ node-policy COMMAND
running command...
$ node-policy (-v|--version|version)
@bradleymeck/node-policy/0.1.0 darwin-x64 node-v12.7.0
$ node-policy --help [COMMAND]
USAGE
  $ node-policy COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`node-policy dependencies:add LOCATION`](#node-policy-dependenciesadd-location)
* [`node-policy dependencies:summarize`](#node-policy-dependenciessummarize)
* [`node-policy dependencies:view LOCATION`](#node-policy-dependenciesview-location)
* [`node-policy extract DESTINATION`](#node-policy-extract-destination)
* [`node-policy help [COMMAND]`](#node-policy-help-command)
* [`node-policy install`](#node-policy-install)
* [`node-policy integrity:add LOCATION`](#node-policy-integrityadd-location)
* [`node-policy integrity:calculate LOCATION`](#node-policy-integritycalculate-location)
* [`node-policy integrity:delete LOCATION`](#node-policy-integritydelete-location)
* [`node-policy integrity:verify LOCATION`](#node-policy-integrityverify-location)
* [`node-policy integrity:view LOCATION`](#node-policy-integrityview-location)
* [`node-policy locate`](#node-policy-locate)
* [`node-policy mv DESTINATION`](#node-policy-mv-destination)
* [`node-policy resource:add LOCATION`](#node-policy-resourceadd-location)
* [`node-policy run`](#node-policy-run)

## `node-policy dependencies:add LOCATION`

Adds dependency mappings for a location.

```
USAGE
  $ node-policy dependencies:add LOCATION

ARGUMENTS
  LOCATION  desired location

OPTIONS
  -d, --discard        discards existing values for the resources
  -p, --policy=policy  [default: /Users/bfarias/.node-policy.json] path of policy file

DESCRIPTION
  Adds dependency mappings for a location.
```

_See code: [src/commands/dependencies/add.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/dependencies/add.js)_

## `node-policy dependencies:summarize`

Shows all fully resolved dependency URLs available when using a policy.

```
USAGE
  $ node-policy dependencies:summarize

OPTIONS
  -p, --policy=policy  [default: /Users/bfarias/.node-policy.json] path of policy file

DESCRIPTION
  Shows all fully resolved dependency URLs available when using a policy.
  * shows when a policy does not have a completely static resolution.
```

_See code: [src/commands/dependencies/summarize.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/dependencies/summarize.js)_

## `node-policy dependencies:view LOCATION`

Shows all dependency mappings for a location.

```
USAGE
  $ node-policy dependencies:view LOCATION

ARGUMENTS
  LOCATION  desired location

OPTIONS
  -p, --policy=policy  [default: /Users/bfarias/.node-policy.json] path of policy file

DESCRIPTION
  Shows all dependency mappings for a location.
```

_See code: [src/commands/dependencies/view.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/dependencies/view.js)_

## `node-policy extract DESTINATION`

Create a new policy file that only contains paths pointing within a specific prefix

```
USAGE
  $ node-policy extract DESTINATION

ARGUMENTS
  DESTINATION  desired new path of the policy file

OPTIONS
  -p, --policy=policy  [default: /Users/bfarias/.node-policy.json] path of policy file

DESCRIPTION
  Create a new policy file that only contains paths pointing within a specific prefix
```

_See code: [src/commands/extract.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/extract.js)_

## `node-policy help [COMMAND]`

display help for node-policy

```
USAGE
  $ node-policy help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.1.4/src/commands/help.ts)_

## `node-policy install`

////////

```
USAGE
  $ node-policy install

OPTIONS
  -p, --policy=policy                [default: /Users/bfarias/.node-policy.json] path of policy file
  --fix=(always|never|prompt)        [default: prompt]
  --package-manager=package-manager  [default: npm]

DESCRIPTION
  ////////
  UNSTABLE
  ////////
  Installs the current directory without running install scripts
  then runs install scripts with integrity checks applied
```

_See code: [src/commands/install.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/install.js)_

## `node-policy integrity:add LOCATION`

Adds integrity values for a location.

```
USAGE
  $ node-policy integrity:add LOCATION

ARGUMENTS
  LOCATION  desired location

OPTIONS
  -a, --algorithm=(sha256|sha384|sha512)  (required) digest algorithm to use for integrity checks
  -d, --discard                           discards existing values for the resources
  -p, --policy=policy                     [default: /Users/bfarias/.node-policy.json] path of policy file

DESCRIPTION
  Adds integrity values for a location.
```

_See code: [src/commands/integrity/add.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/integrity/add.js)_

## `node-policy integrity:calculate LOCATION`

Calculates the integrity value a location, without consulting the policy.

```
USAGE
  $ node-policy integrity:calculate LOCATION

ARGUMENTS
  LOCATION  desired location

OPTIONS
  -a, --algorithm=(sha256|sha384|sha512)  (required) digest algorithm to use for integrity checks

DESCRIPTION
  Calculates the integrity value a location, without consulting the policy.
```

_See code: [src/commands/integrity/calculate.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/integrity/calculate.js)_

## `node-policy integrity:delete LOCATION`

Removes integrity values for a location.

```
USAGE
  $ node-policy integrity:delete LOCATION

ARGUMENTS
  LOCATION  desired location

OPTIONS
  -p, --policy=policy  [default: /Users/bfarias/.node-policy.json] path of policy file

DESCRIPTION
  Removes integrity values for a location.
```

_See code: [src/commands/integrity/delete.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/integrity/delete.js)_

## `node-policy integrity:verify LOCATION`

Checks integrity values for a location.

```
USAGE
  $ node-policy integrity:verify LOCATION

ARGUMENTS
  LOCATION  desired location

OPTIONS
  -i, --interactive
  -p, --policy=policy  [default: /Users/bfarias/.node-policy.json] path of policy file

DESCRIPTION
  Checks integrity values for a location.
```

_See code: [src/commands/integrity/verify.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/integrity/verify.js)_

## `node-policy integrity:view LOCATION`

Shows all integrity values for a location.

```
USAGE
  $ node-policy integrity:view LOCATION

ARGUMENTS
  LOCATION  desired location

OPTIONS
  -p, --policy=policy  [default: /Users/bfarias/.node-policy.json] path of policy file

DESCRIPTION
  Shows all integrity values for a location.
```

_See code: [src/commands/integrity/view.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/integrity/view.js)_

## `node-policy locate`

Prints the location of the policy file, complaining if some common misconfiguration

```
USAGE
  $ node-policy locate

OPTIONS
  -p, --policy=policy  [default: /Users/bfarias/.node-policy.json] path of policy file
  --strict             exits with an error if policy is misconfigured

DESCRIPTION
  Prints the location of the policy file, complaining if some common misconfiguration
```

_See code: [src/commands/locate.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/locate.js)_

## `node-policy mv DESTINATION`

Move a policy file to a new location, rewriting resource paths as needed

```
USAGE
  $ node-policy mv DESTINATION

ARGUMENTS
  DESTINATION  desired new path of the policy file

OPTIONS
  -p, --policy=policy  [default: /Users/bfarias/.node-policy.json] path of policy file

DESCRIPTION
  Move a policy file to a new location, rewriting resource paths as needed
```

_See code: [src/commands/mv.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/mv.js)_

## `node-policy resource:add LOCATION`

Adds integrity values for a location.

```
USAGE
  $ node-policy resource:add LOCATION

ARGUMENTS
  LOCATION  desired location

OPTIONS
  -a, --algorithm=(sha256|sha384|sha512)  (required) digest algorithm to use for integrity checks
  -d, --discard                           discards existing values for the resources
  -p, --policy=policy                     [default: /Users/bfarias/.node-policy.json] path of policy file

DESCRIPTION
  Adds integrity values for a location.
```

_See code: [src/commands/resource/add.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/resource/add.js)_

## `node-policy run`

Prints the location of the policy file, complaining if some common misconfiguration

```
USAGE
  $ node-policy run

OPTIONS
  -i, --interactive
  -p, --policy=policy  [default: /Users/bfarias/.node-policy.json] path of policy file

DESCRIPTION
  Prints the location of the policy file, complaining if some common misconfiguration
```

_See code: [src/commands/run.js](https://github.com/bmeck/node-policy/blob/v0.1.0/src/commands/run.js)_
<!-- commandsstop -->
