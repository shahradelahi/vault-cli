import chalk from 'chalk';
import ora from 'ora';
import { z } from 'zod';

import { BaseCommand } from '@/lib/command';
import { hasEngine } from '@/lib/vault';
import logger from '@/logger';

import { EndpointUrlOption, ProfileOption, TokenOption } from './common-options';

const mountOptionsSchema = z.object({
  mountPath: z.string(),
  profile: z.string().optional(),
  endpointUrl: z.string().optional(),
  token: z.string().optional(),
});

export const mount = new BaseCommand({
  name: 'mount <mount-path>',
  description: 'Mount a new KV2 secret engine',
  schema: mountOptionsSchema,
  options: [ProfileOption(), EndpointUrlOption(), TokenOption()],
  action: async (options, vc) => {
    const { mountPath } = options;

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
      throw error;
    }

    spinner.stop();
    logger.log('');
    logger.success(`Successfully mounted ${chalk.cyan(mountPath)}`);
    logger.log('');
  },
});
