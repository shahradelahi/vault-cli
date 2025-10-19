import { promises } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { Option } from 'commander';
import ora from 'ora';
import prompts from 'prompts';
import { z } from 'zod';

import { BaseCommand } from '@/lib/command';
import { EnvType } from '@/lib/env';
import { resolveAccessiblePath } from '@/lib/helpers';
import { doesSecretPathExist, readKV2Path } from '@/lib/vault';
import logger from '@/logger';
import { fsAccess } from '@/utils/fs-access';

import {
  CwdOption,
  EndpointUrlOption,
  ForceOption,
  ProfileOption,
  TokenOption,
} from './common-options';

const pullOptionsSchema = z.object({
  secretsPath: z.string(),
  profile: z.string().optional(),
  endpointUrl: z.string().optional(),
  token: z.string().optional(),
  outputFile: z.string().optional(),
  format: z.enum(['dotenv', 'json', 'shell']).default('dotenv'),
  cwd: z.string(),
  force: z.boolean(),
});

export const pull = new BaseCommand({
  name: 'pull <secrets-path>',
  description: 'Pull an environment from Vault',
  schema: pullOptionsSchema,
  options: [
    ProfileOption(),
    EndpointUrlOption(),
    TokenOption(),
    new Option('-O, --output-file <output-path>', 'Path to write the environment file to'),
    new Option('-F, --format <format>', 'Format of the environment file').default('dotenv'),
    CwdOption(),
    ForceOption('Write environment file even if it exists'),
  ],
  action: async (options, vc) => {
    const { secretsPath, cwd, outputFile, format, force } = options;

    const resolvedCwd = await resolveAccessiblePath(cwd);

    if (!(await doesSecretPathExist(vc, secretsPath))) {
      logger.error(`The path ${secretsPath} does not exist.`);
      process.exitCode = 1;
      return;
    }

    const spinner = ora('Pulling secrets from Vault').start();

    const { mountPath, path: secretPath } = readKV2Path(secretsPath);
    const { data, error } = await vc.kv2.read({
      mountPath,
      path: secretPath,
    });
    if (error) {
      spinner?.fail();
      throw error;
    }

    const { data: secrets } = data.data;
    if (!secrets) {
      spinner?.fail();
      logger.error(`No secrets found at ${secretsPath}.`);
      process.exitCode = 1;
      return;
    }

    spinner?.succeed(`Pulled secrets from Vault. (${Object.keys(secrets).length} secrets)`);

    if (format === 'shell') {
      logger.log('');
      for (const [key, value] of Object.entries(secrets)) {
        logger.log(`export ${key}="${value}"`);
      }

      logger.log('');
      process.exitCode = 0;
      return;
    }

    const formattedEnv = formatEnv(format, secrets);

    if (!outputFile) {
      logger.log('');
      logger.log(
        `${chalk.bold('Environment variables:')}\n${
          formattedEnv === '' ? secrets : formattedEnv.trim()
        }`
      );
      logger.log('');
      process.exitCode = 0;
      return;
    }

    const envAbsPath = path.resolve(resolvedCwd, outputFile);

    if (!force && (await fsAccess(envAbsPath))) {
      const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: `The file ${envAbsPath} already exists. Do you want to overwrite it?`,
        initial: false,
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
    writeProgress?.succeed(`Done.`);

    logger.log('');
    logger.info(`${chalk.green('Success!')} Secrets written to ${envAbsPath}.`);
    logger.log('');
  },
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
