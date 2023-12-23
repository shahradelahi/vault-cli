#!/usr/bin/env node

import { Command } from 'commander';
import { getPackageInfo } from './utils/get-package-info.ts';
import { makeProfile, pipe, pull, push, remove, seal, unseal } from './commands';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

async function main() {
  const packageInfo = await getPackageInfo();

  const program = new Command()
    .name('vault')
    .description('Manage your secrets on HashiCorp Vault')
    .version(packageInfo.version || '1.0.0', '-v, --version', 'display the version number');

  program
    .addCommand(makeProfile)
    .addCommand(pipe)
    .addCommand(push)
    .addCommand(pull)
    .addCommand(remove)
    .addCommand(seal)
    .addCommand(unseal);

  program.parse();
}

main();
