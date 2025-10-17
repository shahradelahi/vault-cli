import { VaultError } from '@litehex/node-vault';
import chalk from 'chalk';
import ora from 'ora';
import { z } from 'zod';

import { BaseCommand } from '@/lib/command';
import logger from '@/logger';

import { EndpointUrlOption, ProfileOption, TokenOption } from './common-options';

const unmountOptionsSchema = z.object({
  mountPath: z.string(),
  profile: z.string().optional(),
  endpointUrl: z.string().optional(),
  token: z.string().optional(),
});

export const unmount = new BaseCommand({
  name: 'unmount <mount-path>',
  description: 'Unmount a secret engine',
  schema: unmountOptionsSchema,
  options: [ProfileOption(), EndpointUrlOption(), TokenOption()],
  action: async (options, vc) => {
    const { mountPath } = options;

    const spinner = ora(`Unmounting ${mountPath}`).start();
    spinner.color = 'yellow';

    const { error } = await vc.unmount({ mountPath });

    if (error) {
      spinner.fail();
      throw new VaultError(error.message);
    }

    spinner.stop();
    logger.log('');
    logger.success(`Successfully unmounted ${chalk.cyan(mountPath)}`);
    logger.log('');
  },
});
