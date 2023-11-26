#!/usr/bin/env bun

import { Command } from 'commander';
import { getPackageInfo } from './utils/get-package-info.ts';
import { push, pull, makeProfile } from './commands';
import 'dotenv/config';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

async function main() {
  const packageInfo = await getPackageInfo();

  const program = new Command()
    .name('vault')
    .description('Manage your secrets on HashiCorp Vault')
    .version(packageInfo.version || '1.0.0', '-v, --version', 'display the version number');

  program.addCommand(makeProfile).addCommand(push).addCommand(pull);

  program.parse();
}

main();
