import { VaultError } from '@litehex/node-vault';
import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { z } from 'zod';

import { getUnsealedClient } from '@/lib/helpers';
import { hasEngine } from '@/lib/vault';
import logger from '@/logger';
import { handleError } from '@/utils/handle-error';

import { EndpointUrlOption, TokenOption } from './options';

export const unmount = new Command()
  .command('unmount <mount-path>')
  .description('Unmount a secret engine')
  .option('-P, --profile <name>', 'Name of the profile to use.')
  .addOption(EndpointUrlOption)
  .addOption(TokenOption)
  .action(async (mountPath, opts) => {
    logger.log('');

    try {
      const options = z
        .object({
          profile: z.string().optional(),
          endpointUrl: z.string().optional(),
          token: z.string().optional(),
        })
        .parse(opts);

      const vc = await getUnsealedClient(options);

      if (!(await hasEngine(vc, mountPath))) {
        logger.error(`Nothing to unmount. No secret engine at ${chalk.bold(mountPath)}.`);
        process.exitCode = 0;
        return;
      }

      const spinner = ora(`Unmounting ${mountPath}`).start();
      spinner.color = 'yellow';

      const res: any = await vc.unmount({ mountPath });

      if (typeof res === 'object' && 'errors' in res) {
        spinner.fail();
        return handleError(new VaultError(res.errors));
      }

      if (!res) {
        spinner.fail();
        return handleError(new VaultError([`Failed to unmount ${mountPath}.`]));
      }

      spinner.stop();
      logger.log('');
      logger.success(`Successfully unmounted ${chalk.cyan(mountPath)}`);
      logger.log('');
    } catch (error) {
      handleError(error);
    }
  });
