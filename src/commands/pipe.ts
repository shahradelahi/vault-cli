import { Command } from 'commander';
import logger from '@/logger.ts';
import { handleError } from '@/utils/handle-error.ts';
import { z } from 'zod';
import { getUnsealedClient, resolveAccessiblePath } from '@/lib/helpers.ts';
import { doesSecretPathExist, readKV2Path } from '@/lib/vault.ts';
import ora from 'ora';
import { execaCommand } from 'execa';
import { VaultError } from '@litehex/node-vault';

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

      const cwd = await resolveAccessiblePath(options.cwd);

      const vc = await getUnsealedClient(options);

      if (!(await doesSecretPathExist(vc, vaultPath))) {
        logger.error(`The path ${vaultPath} does not exist. Please try again.`);
        process.exitCode = 1;
        return;
      }

      const spinner = ora('Pulling secrets from Vault').start();

      const { mountPath, path: secretPath } = readKV2Path(vaultPath);
      const read = await vc.kv2.read({
        mountPath,
        path: secretPath
      });
      if ('errors' in read) {
        return handleError(new VaultError(read.errors));
      }

      const { data: secrets } = read.data;
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
        env: secrets,
        stdio: 'inherit',
        cleanup: true
      });
    } catch (e) {
      handleError(e);
    }
  });
