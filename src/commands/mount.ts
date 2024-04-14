import { Command } from 'commander';
import logger from '@/logger.ts';
import { handleError } from '@/utils/handle-error.ts';
import { z } from 'zod';
import { getUnsealedClient } from '@/lib/helpers.ts';
import { VaultError } from '@litehex/node-vault';
import chalk from 'chalk';
import ora from 'ora';
import { hasEngine } from '@/lib/vault.ts';

export const mount = new Command()
  .command('mount <mount-path>')
  .description('Mount a new KV2 secret engine')
  .option('-P, --profile <name>', 'Name of the profile to use.')
  .option('--endpoint-url <endpoint-url>', 'Vault endpoint URL')
  .option('--token <vault-token>', 'Vault token')
  .action(async (mountPath, opts) => {
    logger.log('');

    try {
      const options = z
        .object({
          profile: z.string().optional(),
          endpointUrl: z.string().optional(),
          token: z.string().optional()
        })
        .parse(opts);

      const vc = await getUnsealedClient(options);

      if (await hasEngine(vc, mountPath)) {
        logger.error(`A secret engine already exists at ${chalk.bold(mountPath)}.`);
        process.exitCode = 1;
        return;
      }

      const spinner = ora(`Mounting ${mountPath}`).start();
      spinner.color = 'yellow';

      const res: any = await vc.mount({
        mountPath,
        type: 'kv-v2'
      });

      if (typeof res === 'object' && 'errors' in res) {
        spinner.fail();
        return handleError(new VaultError(res.errors));
      }

      if (!res) {
        spinner.fail();
        return handleError(new VaultError([`Failed to mount ${mountPath}.`]));
      }

      spinner.stop();
      logger.log('');
      logger.success(`Successfully mounted ${chalk.cyan(mountPath)}`);
      logger.log('');
    } catch (error) {
      handleError(error);
    }
  });
