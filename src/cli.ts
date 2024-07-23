#!/usr/bin/env node
import { Command } from 'commander';

import { makeProfile, mount, pipe, pull, push, remove, seal, unmount, unseal } from './commands';
import { getPackageInfo } from './utils/get-package-info.ts';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

async function main() {
  const packageInfo = await getPackageInfo();

  const program = new Command()
    .name('kvault')
    .description(
      `\
Manage your HashiCorp Vault Key/Value v2 secret engines from the command line.

Author: ${packageInfo.author}
License: ${packageInfo.license}`
    )
    .version(packageInfo.version || '0.0.0');

  program
    .addCommand(makeProfile)
    .addCommand(mount)
    .addCommand(pipe)
    .addCommand(push)
    .addCommand(pull)
    .addCommand(remove)
    .addCommand(seal)
    .addCommand(unmount)
    .addCommand(unseal);

  program.parse();
}

main();
