import path from 'node:path';
import { Command } from 'commander';
import logger from '@/logger.ts';
import { handleError } from '@/utils/handle-error.ts';
import { z } from 'zod';
import prompts from 'prompts';
import dotenv from 'dotenv';
import ora from 'ora';
import chalk from 'chalk';
import { doesSecretPathExist, readKV2Path } from '@/lib/vault.ts';
import { getUnsealedClient } from '@/lib/helpers.ts';
import { fsAccess } from '@/utils/fs-access.ts';

const pushOptionsSchema = z.object({
  profile: z.string().optional(),
  endpointUrl: z.string().optional(),
  token: z.string().optional(),
  cwd: z.string(),
  envPath: z.string(),
  vaultPath: z.string(),
  force: z.boolean().default(false)
});

export const push = new Command()
  .command('push <env-file> <secrets-path>')
  .description('Push an environment to Vault')
  .option('-P, --profile <name>', 'Name of the profile to use.')
  .option('--endpoint-url <endpoint-url>', 'Vault endpoint URL')
  .option('--token <vault-token>', 'Vault token')
  .option('--cwd <cwd>', 'Current working directory', process.cwd())
  .option('--force', 'Write to Vault even if the secrets are in conflict', false)
  .action(async (envPath, vaultPath, opts) => {
    logger.log('');

    try {
      const options = pushOptionsSchema.parse({
        ...opts,
        envPath,
        vaultPath
      });

      const cwd = path.resolve(options.cwd);

      if (!(await fsAccess(cwd))) {
        logger.error(`The path ${cwd} does not exist. Please try again.`);
        process.exitCode = 1;
        return;
      }

      const envFile = path.resolve(cwd, envPath);

      if (!(await fsAccess(envFile))) {
        logger.error(`The path ${envFile} does not exist. Please try again.`);
        process.exitCode = 1;
        return;
      }

      const vc = await getUnsealedClient(options);

      if (!options.force && (await doesSecretPathExist(vc, vaultPath))) {
        const { overwrite } = await prompts({
          type: 'confirm',
          name: 'overwrite',
          message: `Secrets path "${vaultPath}" already exists. Do you wish to overwrite?`,
          initial: false
        });

        if (!overwrite) {
          logger.log('Aborting');
          process.exitCode = 0;
          return;
        }
      }

      const env = dotenv.config({ path: envFile });
      const secrets = env.parsed as Record<string, string>;

      logger.log('');
      const writeProgress = ora(`Writing secrets to Vault...`).start();

      const { mountPath, path: secretPath } = readKV2Path(vaultPath);
      await vc.kv2.write({
        mountPath,
        path: secretPath,
        data: secrets
      });

      logger.log('');
      writeProgress.succeed(`Done.`);
      logger.log('');

      logger.log('');
      logger.info(`${chalk.green('Success!')} Secrets written to Vault.`);
      logger.log('');
    } catch (e) {
      handleError(e);
    }
  });
