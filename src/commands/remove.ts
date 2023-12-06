import { z } from 'zod';
import { Command } from 'commander';
import logger from '@/logger.ts';
import path from 'node:path';
import { fsAccess } from '@/utils/fs-access.ts';
import { getCredentialsFromOpts } from '@/lib/helpers.ts';
import { Client } from '@litehex/node-vault';
import { doesSecretPathExist } from '@/lib/vault.ts';
import prompts from 'prompts';
import dotenv from 'dotenv';
import ora from 'ora';
import chalk from 'chalk';
import { handleError } from '@/utils/handle-error.ts';

const removeOptionsSchema = z.object({
  profile: z.string().optional(),
  endpointUrl: z.string().optional(),
  token: z.string().optional(),
  vaultPath: z.string(),
  versions: z.array(z.string()).default([]),
  force: z.boolean().default(false)
});

export const remove = new Command()
  .command('rm <secrets-path>')
  .description('Remove a secret from Vault')
  .argument('[versions...]', 'Versions to remove. By default, all versions will be removed.', [])
  .option('-P, --profile <name>', 'name of the profile to use.')
  .option('--endpoint-url <endpoint-url>', 'Vault endpoint URL')
  .option('--token <vault-token>', 'Vault token')
  .option('--force', 'Remove the secret without confirmation', false)
  .action(async (vaultPath, versions, opts) => {
    logger.log('');

    try {
      const options = removeOptionsSchema.parse({
        ...opts,
        versions,
        vaultPath
      });

      const credentials = await getCredentialsFromOpts(options);

      const vc = new Client({
        endpoint: credentials.endpointUrl,
        token: credentials.token
      });
      const kv2 = vc.kv2();

      const status = await vc.status();
      if (status.sealed) {
        logger.error('Vault is sealed. Please unseal Vault and try again.');
        process.exitCode = 1;
        return;
      }

      if (!(await doesSecretPathExist(vc, vaultPath))) {
        logger.warn(`The path ${vaultPath} not exist. Nothing to remove.`);
        process.exitCode = 0;
        return;
      }

      if (!options.force) {
        const confirm = await prompts({
          type: 'confirm',
          name: 'value',
          message:
            options.versions.length > 0
              ? `Are you sure you want to remove the following versions of ${chalk.cyan(
                  vaultPath
                )}? (${options.versions.join(', ')})`
              : `Are you sure you want to remove everything at ${chalk.cyan(vaultPath)}?`,
          initial: false
        });

        if (!confirm.value) {
          logger.log('Aborted.');
          process.exitCode = 0;
          return;
        }
      }

      const spinner = ora(`Removing ${chalk.cyan(vaultPath)}`).start();

      if (options.versions.length > 0) {
        for (const version of options.versions) {
          if (isNaN(parseInt(version))) {
            spinner.fail();
            logger.error(`Invalid version number: ${version}`);
            process.exitCode = 1;
            return;
          }
        }

        await kv2.delete({
          mountPath: 'secret',
          path: vaultPath,
          versions: options.versions.filter((v) => !isNaN(parseInt(v))).map((v) => parseInt(v))
        });
      } else {
        await kv2.deleteMetadata({
          mountPath: 'secret',
          path: vaultPath
        });
      }

      spinner.stop();
      logger.log('');

      logger.success(`Successfully removed ${chalk.cyan(vaultPath)}`);
      logger.log('');
    } catch (e) {
      handleError(e);
    }
  });
