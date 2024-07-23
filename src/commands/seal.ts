import { Command } from 'commander';
import { getCredentialsFromOpts } from '@/lib/helpers.ts';
import { z } from 'zod';
import logger from '@/logger.ts';
import { Client } from '@litehex/node-vault';
import { handleError } from '@/utils/handle-error.ts';
import ora from 'ora';

export const seal = new Command()
  .command('seal')
  .description('Seal Vault')
  .option('-P, --profile <name>', 'Name of the profile to use.')
  .option('--endpoint-url <endpoint-url>', 'Vault endpoint URL')
  .action(async (opts) => {
    logger.log('');

    try {
      const options = z
        .object({
          profile: z.string().optional(),
          endpointUrl: z.string().optional()
        })
        .parse(opts);

      const credentials = await getCredentialsFromOpts(options);

      const vc = new Client({
        endpoint: credentials.endpointUrl,
        token: credentials.token
      });

      const { data: status, error } = await vc.sealStatus();
      if (error) {
        handleError(error);
      }

      if (status.sealed) {
        logger.info('Vault is already sealed.');
        logger.log('');
        process.exitCode = 0;
        return;
      }

      const spinner = ora('Sealing Vault').start();

      await vc.seal();

      spinner.succeed('Vault sealed.');
      logger.log('');
    } catch (err) {
      handleError(err);
    }
  });
