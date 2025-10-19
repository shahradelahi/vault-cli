import chalk from 'chalk';
import prompts from 'prompts';
import { z } from 'zod';

import { BaseCommand } from '@/lib/command';
import { ensureCredentialsPaths } from '@/lib/credentials';
import { getProfile, setProfile } from '@/lib/profile';
import logger from '@/logger';

import { EndpointUrlOption, ForceOption, TokenOption } from './common-options';

const makeProfileOptionsSchema = z.object({
  name: z.string(),
  endpointUrl: z.string(),
  token: z.string(),
  force: z.boolean(),
});

export const makeProfile = new BaseCommand({
  name: 'make-profile <name>',
  description: 'Create a new vault profile',
  schema: makeProfileOptionsSchema,
  options: [
    EndpointUrlOption().makeOptionMandatory(),
    TokenOption().makeOptionMandatory(),
    ForceOption('Overwrite existing profile'),
  ],
  needsClient: false,
  action: async (options, _) => {
    const { name, force } = options;

    await ensureCredentialsPaths();

    const profile = await getProfile(name);

    let overwrite = force;
    if (!!profile && !overwrite) {
      // ask user do wish to overwrite
      const res = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: `Profile "${name}" already exists. Do you wish to overwrite?`,
        initial: false,
      });
      overwrite = res.overwrite;
    }

    if (!!profile && !overwrite) {
      logger.log('Aborting');
      process.exitCode = 0;
      return;
    }

    await setProfile(name, {
      endpointUrl: options.endpointUrl,
      token: options.token,
    });

    logger.log('');
    logger.info(`${chalk.green('Success!')} Profile created.`);
    logger.log('');
  },
});
