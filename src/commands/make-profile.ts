import chalk from 'chalk';
import { Command } from 'commander';
import prompts from 'prompts';
import { z } from 'zod';

import { ensureCredentialsPaths } from '@/lib/credentials.ts';
import { getProfile, setProfile } from '@/lib/profile.ts';
import logger from '@/logger.ts';
import { handleError } from '@/utils/handle-error.ts';

const makeProfileOptionsSchema = z.object({
  name: z.string(),
  endpointUrl: z.string(),
  token: z.string(),
  force: z.boolean(),
});

export const makeProfile = new Command()
  .command('make-profile <name>')
  .description('Create a new vault profile')
  .requiredOption('--endpoint-url <endpoint-url>', 'Vault endpoint URL')
  .requiredOption('--token <vault-token>', 'Vault token')
  .option('--force', 'Overwrite existing profile', false)
  .action(async (name, opts) => {
    logger.log('');

    try {
      const options = makeProfileOptionsSchema.parse({
        name,
        ...opts,
      });

      await ensureCredentialsPaths();

      const profile = await getProfile(name);

      if (!!profile && !options.force) {
        // ask user do wish to overwrite
        const { overwrite } = await prompts({
          type: 'confirm',
          name: 'overwrite',
          message: `Profile "${name}" already exists. Do you wish to overwrite?`,
          initial: false,
        });

        if (!overwrite) {
          logger.log('Aborting');
          process.exitCode = 0;
          return;
        }
      }

      await setProfile(name, {
        endpointUrl: options.endpointUrl,
        token: options.token,
      });

      logger.log('');
      logger.info(`${chalk.green('Success!')} Profile created.`);
      logger.log('');
    } catch (e) {
      handleError(e);
    }
  });
