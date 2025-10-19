import path from 'node:path';
import chalk from 'chalk';
import dotenv from 'dotenv';
import ora from 'ora';
import prompts from 'prompts';
import { z } from 'zod';

import { BaseCommand } from '@/lib/command';
import { resolveAccessiblePath } from '@/lib/helpers';
import { doesSecretPathExist, readKV2Path } from '@/lib/vault';
import logger from '@/logger';

import {
  CwdOption,
  EndpointUrlOption,
  ForceOption,
  ProfileOption,
  TokenOption,
} from './common-options';

const pushOptionsSchema = z.object({
  envFile: z.string(),
  secretsPath: z.string(),
  profile: z.string().optional(),
  endpointUrl: z.string().optional(),
  token: z.string().optional(),
  cwd: z.string(),
  force: z.boolean(),
});

export const push = new BaseCommand({
  name: 'push <env-file> <secrets-path>',
  description: 'Push an environment to Vault',
  schema: pushOptionsSchema,
  options: [
    ProfileOption(),
    EndpointUrlOption(),
    TokenOption(),
    CwdOption(),
    ForceOption('Write to Vault even if the secrets are in conflict'),
  ],
  action: async (options, vc) => {
    const { cwd, envFile, secretsPath, force } = options;

    const resolvedCwd = await resolveAccessiblePath(cwd);
    const envFilePath = path.resolve(resolvedCwd, envFile);

    if (!force && (await doesSecretPathExist(vc, secretsPath))) {
      const { overwrite } = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: `Secrets path "${secretsPath}" already exists. Do you wish to overwrite?`,
        initial: false,
      });

      if (!overwrite) {
        logger.log('Aborting');
        process.exitCode = 0;
        return;
      }
    }

    const env = dotenv.config({ path: envFilePath, quiet: true });
    const secrets = env.parsed as Record<string, string>;

    if (!secrets || Object.keys(secrets).length === 0) {
      logger.warn(`No secrets found in ${envFilePath}. Nothing to push.`);
      process.exitCode = 0;
      return;
    }

    logger.log('');
    const writeProgress = ora(`Writing secrets to Vault...`).start();

    const { mountPath, path: secretPath } = readKV2Path(secretsPath);
    await vc.kv2.write({
      mountPath,
      path: secretPath,
      data: secrets,
    });

    logger.log('');
    writeProgress.succeed(`Done.`);
    logger.log('');

    logger.log('');
    logger.info(`${chalk.green('Success!')} Secrets written to Vault.`);
    logger.log('');
  },
});
