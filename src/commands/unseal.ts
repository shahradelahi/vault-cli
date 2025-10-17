import { Option } from 'commander';
import ora from 'ora';
import { z } from 'zod';

import { BaseCommand } from '@/lib/command';
import logger from '@/logger';

import { EndpointUrlOption, ProfileOption } from './common-options';

const unsealOptionsSchema = z.object({
  keys: z.array(z.string()).default([]),
  profile: z.string().optional(),
  endpointUrl: z.string().optional(),
  stdin: z.boolean().default(false),
});

export const unseal = new BaseCommand({
  name: 'unseal [keys...]',
  description: 'Unseal Vault',
  schema: unsealOptionsSchema,
  options: [
    ProfileOption(),
    EndpointUrlOption(),
    new Option('--stdin', 'Read unseal keys from stdin'),
  ],
  needsClient: 'any',
  action: async (options, vc) => {
    const { data: status, error } = await vc.sealStatus();

    if (error) {
      throw error;
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
        spinner.fail();
        throw error;
      }

      if (!data.sealed || data.progress === 0) {
        break;
      }

      spinner.text = `Unsealing Vault (${data.t - data.progress}/${data.t})`;
    }

    spinner.succeed('Vault unsealed.');
    logger.log('');
  },
});
