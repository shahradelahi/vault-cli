import { Command } from 'commander';
import logger from '@/logger.ts';
import prompts from 'prompts';
import chalk from 'chalk';
import { z } from 'zod';
import { handleError } from '@/utils/handle-error.ts';
import { ensureCredentialsPaths } from '@/lib/credentials.ts';
import { getProfile, setProfile } from '@/lib/profile.ts';

const makeProfileOptionsSchema = z.object({
  name: z.string(),
  endpointUrl: z.string(),
  token: z.string(),
  force: z.boolean()
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
        ...opts
      });

      await ensureCredentialsPaths();

      const profile = await getProfile(name);

      if (!!profile && !options.force) {
        // ask user do wish to overwrite
        const { overwrite } = await prompts({
          type: 'confirm',
          name: 'overwrite',
          message: `Profile "${name}" already exists. Do you wish to overwrite?`,
          initial: false
        });

        if (!overwrite) {
          logger.log('Aborting');
          process.exitCode = 0;
          return;
        }
      }

      await setProfile(name, {
        endpointUrl: options.endpointUrl,
        token: options.token
      });

      logger.log('');
      logger.info(`${chalk.green('Success!')} Profile created.`);
      logger.log('');
    } catch (e) {
      handleError(e);
    }
  });
