import path from 'node:path';
import { Command } from 'commander';
import logger from '@/logger.ts';
import { handleError } from '@/utils/handle-error.ts';
import { z } from 'zod';
import prompts from 'prompts';
import ora from 'ora';
import chalk from 'chalk';
import { doesSecretPathExist, readKV2Path } from '@/lib/vault.ts';
import { getUnsealedClient, resolveAccessiblePath } from '@/lib/helpers.ts';
import { fsAccess } from '@/utils/fs-access.ts';
import { promises } from 'node:fs';
import { VaultError } from '@litehex/node-vault';
import { EnvType } from '@/lib/env.ts';

export const pull = new Command()
  .command('pull <secrets-path>')
  .description('Pull an environment from Vault')
  .option('-P, --profile <name>', 'Name of the profile to use.')
  .option('--endpoint-url <endpoint-url>', 'Vault endpoint URL')
  .option('--token <vault-token>', 'Vault token')
  .option('-O, --output-file <output-path>', 'Path to write the environment file to')
  .option('-F, --format <format>', 'Format of the environment file', 'dotenv')
  .option('--cwd <cwd>', 'Current working directory', process.cwd())
  .option('--force', 'Write environment file even if it exists', false)
  .action(async (vaultPath, opts) => {
    logger.log('');

    try {
      const options = z
        .object({
          profile: z.string().optional(),
          endpointUrl: z.string().optional(),
          token: z.string().optional(),
          cwd: z.string(),
          vaultPath: z.string(),
          outputFile: z.string().optional(),
          format: z.enum(['dotenv', 'json', 'shell']).default('dotenv'),
          force: z.boolean().default(false)
        })
        .parse({
          ...opts,
          vaultPath
        });

      const cwd = await resolveAccessiblePath(options.cwd);

      const vc = await getUnsealedClient(options);

      if (!(await doesSecretPathExist(vc, vaultPath))) {
        logger.error(`The path ${vaultPath} does not exist.`);
        process.exitCode = 1;
        return;
      }

      const spinner = ora('Pulling secrets from Vault').start();

      const { mountPath, path: secretPath } = readKV2Path(vaultPath);
      const read = await vc.kv2.read({
        mountPath,
        path: secretPath
      });
      if ('errors' in read) {
        return handleError(new VaultError(read.errors));
      }

      const { data: secrets } = read.data;
      if (!secrets) {
        logger.error(`No secrets found at ${vaultPath}.`);
        process.exitCode = 1;
        return;
      }

      spinner.succeed(`Pulled secrets from Vault. (${Object.keys(secrets).length} secrets)`);

      if (options.format === 'shell') {
        logger.log('');
        for (const [key, value] of Object.entries(secrets)) {
          logger.log(`export ${key}="${value}"`);
        }

        logger.log('');
        process.exitCode = 0;
        return;
      }

      const formattedEnv = formatEnv(options.format, secrets);

      if (!options.outputFile) {
        logger.log('');
        console.log(
          `${chalk.bold('Environment variables:')}\n${
            formattedEnv === '' ? secrets : formattedEnv.trim()
          }`
        );
        logger.log('');
        process.exitCode = 0;
        return;
      }

      const envAbsPath = path.resolve(cwd, options.outputFile);

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

function formatEnv(type: EnvType, env: Record<string, string>) {
  if (type === 'json') {
    return JSON.stringify(env, null, 2);
  }
  if (type === 'dotenv') {
    return Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  }
  if (type === 'shell') {
    return Object.entries(env)
      .map(([key, value]) => `export ${key}="${value}"`)
      .join('\n');
  }
  throw new Error(`Invalid format ${type}`);
}
