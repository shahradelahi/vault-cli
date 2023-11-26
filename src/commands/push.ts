import path from 'node:path';
import { Command } from 'commander';
import logger from '@/logger.ts';
import { Client } from '@litehex/node-vault';
import { handleError } from '@/utils/handle-error.ts';
import { z } from 'zod';
import { exists } from 'node:fs/promises';
import prompts from 'prompts';
import dotenv from 'dotenv';
import ora from 'ora';
import chalk from 'chalk';
import { doesSecretPathExist } from '@/lib/vault.ts';
import { getCredentialsFromOpts } from '@/lib/helpers.ts';

const pushOptionsSchema = z.object({
  name: z.string().optional(),
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
  .option('-P, --profile <name>', 'name of the profile to use.')
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

      if (!(await exists(cwd))) {
        logger.error(`The path ${cwd} does not exist. Please try again.`);
        process.exitCode = 1;
        return;
      }

      const envFile = path.resolve(cwd, envPath);

      if (!(await exists(envFile))) {
        logger.error(`The path ${envFile} does not exist. Please try again.`);
        process.exitCode = 1;
        return;
      }

      const credentials = await getCredentialsFromOpts(options);

      const vc = new Client({
        endpoint: credentials.endpointUrl,
        token: credentials.token
      });

      const status = await vc.status();
      if (status.sealed) {
        logger.error('Vault is sealed. Please unseal Vault and try again.');
        process.exitCode = 1;
        return;
      }

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

      const env = await dotenv.config({ path: envFile });
      const secrets = Object.entries(env.parsed || {}).reduce(
        (acc, [key, value]) => {
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      logger.log('');
      const writeProgress = ora(`Writing secrets to Vault...`).start();

      await vc.write({
        path: vaultPath,
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
