import { Command } from 'commander';
import { getCredentialsFromOpts } from '@/lib/helpers.ts';
import { z } from 'zod';
import logger from '@/logger.ts';
import { Client } from '@litehex/node-vault';
import { handleError } from '@/utils/handle-error.ts';
import ora from 'ora';

export const unseal = new Command()
  .command('unseal')
  .description('Unseal Vault')
  .argument('[keys...]', 'Unseal keys', [])
  .option('-P, --profile <name>', 'Name of the profile to use.')
  .option('--endpoint-url <endpoint-url>', 'Vault endpoint URL')
  .option('--stdin', 'Read unseal keys from stdin')
  .action(async (keys, opts) => {
    logger.log('');

    try {
      const options = z
        .object({
          profile: z.string().optional(),
          endpointUrl: z.string().optional(),
          keys: z.array(z.string()).default([]),
          stdin: z.boolean().default(false)
        })
        .parse({
          ...opts,
          keys
        });

      const credentials = await getCredentialsFromOpts({
        ...options,
        token: 'NOT_REQUIRED'
      });

      const vc = new Client({
        endpoint: credentials.endpointUrl,
        token: credentials.token
      });

      const { data: status, error } = await vc.sealStatus();

      if (error) {
        handleError(error);
      }

      if (!status.sealed) {
        logger.info('Vault is already unsealed.');
        logger.log('');
        return;
      }

      // check if stdin is provided
      if (options.stdin) {
        const stdin = await new Promise<string>((resolve) => {
          let data = '';

          process.stdin.on('data', (chunk) => {
            data += chunk;
          });

          process.stdin.on('end', () => {
            resolve(data);
          });
        });

        options.keys = stdin
          .replace(/\n$/, '')
          .replace(/\r$/, '')
          .replace(/\r\n$/, '')
          .replace(/\t/g, ' ')
          .replace(/ +/g, ' ')
          .split(' ')
          .filter((key) => key);
      }

      // if count of provided keys in options was not enough to unseal
      if (status.t > options.keys.length) {
        logger.error('The provided keys were not enough to unseal Vault.');
        logger.log('');
        process.exitCode = 1;
        return;
      }

      const spinner = ora('Unsealing Vault').start();

      // t is total of keys required to unseal
      // progress is the number of keys left to unseal
      for (const key of options.keys) {
        const { data, error } = await vc.unseal({ key });
        if (error) {
          return handleError(error);
        }

        if (!data.sealed || data.progress === 0) {
          break;
        }

        spinner.text = `Unsealing Vault (${data.t - data.progress}/${data.t})`;
      }

      spinner.succeed('Vault unsealed.');
      logger.log('');
    } catch (err) {
      handleError(err);
    }
  });
