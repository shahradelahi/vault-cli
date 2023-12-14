import { Command } from 'commander';
import logger from '@/logger.ts';
import { handleError } from '@/utils/handle-error.ts';
import { z } from 'zod';
import path from 'node:path';
import { fsAccess } from '@/utils/fs-access.ts';
import { getUnsealedClient } from '@/lib/helpers.ts';
import { doesSecretPathExist, readKV2Path } from '@/lib/vault.ts';
import ora from 'ora';
import { execaCommand } from 'execa';

export const pipe = new Command()
  .command('pipe <secrets-path>')
  .argument('[command...]', 'Command to pipe to', [])
  .description('Pull an environment from Vault and pipe it to a command')
  .option('-P, --profile <name>', 'Name of the profile to use.')
  .option('--endpoint-url <endpoint-url>', 'Vault endpoint URL')
  .option('--token <vault-token>', 'Vault token')
  .option('--cwd <cwd>', 'Current working directory', process.cwd())
  .action(async (vaultPath, command, opts) => {
    logger.log('');

    try {
      const options = z
        .object({
          profile: z.string().optional(),
          endpointUrl: z.string().optional(),
          token: z.string().optional(),
          cwd: z.string().default(process.cwd()),
          vaultPath: z.string(),
          command: z.array(z.string()).default([])
        })
        .parse({
          vaultPath,
          command,
          ...opts
        });

      const cwd = path.resolve(options.cwd);

      if (!(await fsAccess(cwd))) {
        logger.error(`The path ${cwd} does not exist. Please try again.`);
        process.exitCode = 1;
        return;
      }

      const vc = await getUnsealedClient(options);
      const kv2 = vc.kv2();

      if (!(await doesSecretPathExist(vc, vaultPath))) {
        logger.error(`The path ${vaultPath} does not exist. Please try again.`);
        process.exitCode = 1;
        return;
      }

      const spinner = ora('Pulling secrets from Vault').start();

      const { mountPath, path: secretPath } = readKV2Path(vaultPath);
      const { data: secrets } = await kv2.read({
        mountPath,
        path: secretPath
      });
      if (!secrets) {
        logger.error(`No secrets found at ${vaultPath}. Please try again.`);
        process.exitCode = 1;
        return;
      }

      spinner.succeed('Successfully pulled secrets from Vault');

      logger.log('');

      execaCommand(options.command.join(' '), {
        shell: true,
        cwd,
        env: secrets.data,
        stdio: 'inherit',
        cleanup: true
      });
    } catch (e) {
      handleError(e);
    }
  });
