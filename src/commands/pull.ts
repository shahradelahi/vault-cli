import path from 'node:path';
import { Command } from 'commander';
import logger from '@/logger.ts';
import { Client } from '@litehex/node-vault';
import { handleError } from '@/utils/handle-error.ts';
import { z } from 'zod';
import prompts from 'prompts';
import ora from 'ora';
import chalk from 'chalk';
import { doesSecretPathExist } from '@/lib/vault.ts';
import { getCredentialsFromOpts } from '@/lib/helpers.ts';
import { fsAccess } from '@/utils/fs-access.ts';
import { promises } from 'fs';

const pushOptionsSchema = z.object({
  name: z.string().optional(),
  endpointUrl: z.string().optional(),
  token: z.string().optional(),
  cwd: z.string(),
  vaultPath: z.string(),
  envPath: z.string().default('.env'),
  format: z.enum(['dotenv', 'json']).default('dotenv'),
  force: z.boolean().default(false)
});

export const pull = new Command()
  .command('pull <secrets-path>')
  .description('Pull an environment from Vault')
  .option('-P, --profile <name>', 'name of the profile to use.')
  .option('--endpoint-url <endpoint-url>', 'Vault endpoint URL')
  .option('--token <vault-token>', 'Vault token')
  .option('-E, --env-path <env-path>', 'Path to the environment file', '.env')
  .option('-F, --format <format>', 'Format of the environment file', 'dotenv')
  .option('--cwd <cwd>', 'Current working directory', process.cwd())
  .option('--force', 'Write environment file even if it exists', false)
  .action(async (vaultPath, opts) => {
    logger.log('');

    try {
      const options = pushOptionsSchema.parse({
        ...opts,
        vaultPath
      });

      const cwd = path.resolve(options.cwd);

      if (!(await fsAccess(cwd))) {
        logger.error(`The path ${cwd} does not exist. Please try again.`);
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

      if (!(await doesSecretPathExist(vc, vaultPath))) {
        logger.error(`The path ${vaultPath} does not exist. Please try again.`);
        process.exitCode = 1;
        return;
      }

      const spinner = ora('Pulling secrets from Vault').start();
      logger.log('');

      const { data: secrets } = await vc.read({ path: vaultPath, list: false, engine: 'kv2' });
      if (!secrets) {
        logger.error(`No secrets found at ${vaultPath}. Please try again.`);
        process.exitCode = 1;
        return;
      }

      if (!secrets.data) {
        logger.error(`No secrets found at ${vaultPath}. Please try again.`);
        process.exitCode = 1;
        return;
      }

      const env = Object.entries(secrets.data).reduce(
        (acc, [key, value]) => {
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      const formattedEnv =
        options.format === 'json'
          ? JSON.stringify(env, null, 2)
          : options.format === 'dotenv'
            ? Object.entries(env)
                .map(([key, value]) => `${key}=${value}`)
                .join('\n')
            : '';

      logger.log('');
      spinner.succeed('Done.');

      if (!options.envPath) {
        logger.log('');
        console.log(
          chalk.bold('Environment variables:'),
          '\n',
          formattedEnv === '' ? env : formattedEnv
        );
        logger.log('');
        process.exitCode = 0;
        return;
      }

      const envAbsPath = path.resolve(cwd, options.envPath);

      if (!options.force && (await fsAccess(envAbsPath))) {
        const response = await prompts({
          type: 'confirm',
          name: 'value',
          message: `The file ${envAbsPath} already exists. Do you want to overwrite it?`,
          initial: false
        });

        if (!response.value) {
          logger.log('Aborting.');
          process.exitCode = 1;
          return;
        }
      }

      const writeProgress = ora('Writing secrets to specified file').start();
      logger.log('');

      await promises.writeFile(envAbsPath, formattedEnv, 'utf-8');

      logger.log('');
      writeProgress.succeed(`Done.`);

      logger.log('');
      logger.info(`${chalk.green('Success!')} Secrets written to ${envAbsPath}.`);
      logger.log('');
    } catch (e) {
      handleError(e);
    }
  });
