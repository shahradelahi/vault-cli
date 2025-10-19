import ora from 'ora';
import { z } from 'zod';

import { BaseCommand } from '@/lib/command';
import logger from '@/logger';

import { EndpointUrlOption, ProfileOption } from './common-options';

const sealOptionsSchema = z.object({
  profile: z.string().optional(),
  endpointUrl: z.string().optional(),
});

export const seal = new BaseCommand({
  name: 'seal',
  description: 'Seal Vault',
  schema: sealOptionsSchema,
  options: [ProfileOption(), EndpointUrlOption()],
  needsClient: 'any',
  action: async (_, vc) => {
    const { data: status, error } = await vc.sealStatus();
    if (error) {
      throw error;
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
  },
});
