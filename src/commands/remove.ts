import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { z } from 'zod';

import { BaseCommand } from '@/lib/command';
import { doesSecretPathExist, readKV2Path } from '@/lib/vault';
import logger from '@/logger';

import { EndpointUrlOption, ForceOption, ProfileOption, TokenOption } from './common-options';

const removeOptionsSchema = z.object({
  secretsPath: z.string(),
  versions: z.array(z.string()).default([]),
  profile: z.string().optional(),
  endpointUrl: z.string().optional(),
  token: z.string().optional(),
  force: z.boolean(),
});

export const remove = new BaseCommand({
  name: 'rm <secrets-path> [versions...]',
  description: 'Remove a secret from Vault',
  schema: removeOptionsSchema,
  options: [
    ProfileOption(),
    EndpointUrlOption(),
    TokenOption(),
    ForceOption('Remove the secret without confirmation'),
  ],
  action: async (options, vc) => {
    const { secretsPath, force, versions } = options;

    if (!(await doesSecretPathExist(vc, secretsPath))) {
      logger.warn(`The path ${secretsPath} not exist. Nothing to remove.`);
      process.exitCode = 0;
      return;
    }

    if (!force) {
      const confirm = await prompts({
        type: 'confirm',
        name: 'value',
        message:
          versions.length > 0
            ? `Are you sure you want to remove the following versions of ${chalk.cyan(
                secretsPath
              )}? (${versions.join(', ')})`
            : `Are you sure you want to remove everything at ${chalk.cyan(secretsPath)}?`,
        initial: false,
      });

      if (!confirm.value) {
        logger.log('Aborted.');
        process.exitCode = 0;
        return;
      }
    }

    const spinner = ora(`Removing ${chalk.cyan(secretsPath)}`).start();

    const { mountPath, path: secretPath } = readKV2Path(secretsPath);

    if (versions.length > 0) {
      for (const version of versions) {
        if (isNaN(parseInt(version))) {
          spinner.fail();
          throw new Error(`Invalid version number: ${version}`);
        }
      }

      // console.log(versions.filter((v) => !isNaN(parseInt(v))).map((v) => parseInt(v)));
      await vc.kv2.delete({
        mountPath,
        path: secretPath,
        versions: versions.filter((v) => !isNaN(parseInt(v))).map((v) => parseInt(v)),
      });
    } else {
      await vc.kv2.deleteMetadata({
        mountPath,
        path: secretPath,
      });
    }

    spinner.stop();
    logger.log('');

    logger.success(`Successfully removed ${chalk.cyan(secretsPath)}`);
    logger.log('');
  },
});
