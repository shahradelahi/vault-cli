import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { z } from 'zod';

import { getUnsealedClient } from '@/lib/helpers';
import { hasEngine } from '@/lib/vault';
import logger from '@/logger';
import { handleError } from '@/utils/handle-error';

import { EndpointUrlOption, TokenOption } from './options';

export const mount = new Command()
  .command('mount <mount-path>')
  .description('Mount a new KV2 secret engine')
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

      if (await hasEngine(vc, mountPath)) {
        logger.error(`A secret engine already exists at ${chalk.bold(mountPath)}.`);
        process.exitCode = 1;
        return;
      }

      const spinner = ora(`Mounting ${mountPath}`).start();
      spinner.color = 'yellow';

      const { error } = await vc.mount({
        mountPath,
        type: 'kv-v2',
      });

      if (error) {
        spinner.fail();
        handleError(error);
      }

      spinner.stop();
      logger.log('');
      logger.success(`Successfully mounted ${chalk.cyan(mountPath)}`);
      logger.log('');
    } catch (error) {
      handleError(error);
    }
  });
