import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import prompts from 'prompts';
import { z } from 'zod';

import { getUnsealedClient } from '@/lib/helpers';
import { doesSecretPathExist } from '@/lib/vault';
import logger from '@/logger';
import { handleError } from '@/utils/handle-error';

import { EndpointUrlOption, TokenOption } from './options';

const removeOptionsSchema = z.object({
  profile: z.string().optional(),
  endpointUrl: z.string().optional(),
  token: z.string().optional(),
  vaultPath: z.string(),
  versions: z.array(z.string()).default([]),
  force: z.boolean().default(false),
});

export const remove = new Command()
  .command('rm <secrets-path>')
  .description('Remove a secret from Vault')
  .argument('[versions...]', 'Versions to remove. By default, path will be removed.', [])
  .option('-P, --profile <name>', 'Name of the profile to use')
  .addOption(EndpointUrlOption)
  .addOption(TokenOption)
  .option('--force', 'Remove the secret without confirmation', false)
  .action(async (vaultPath, versions, opts) => {
    logger.log('');

    try {
      const options = removeOptionsSchema.parse({
        ...opts,
        versions,
        vaultPath,
      });

      const vc = await getUnsealedClient(options);

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
          initial: false,
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
            return handleError(`Invalid version number: ${version}`);
          }
        }

        await vc.kv2.delete({
          mountPath: 'secret',
          path: vaultPath,
          versions: options.versions.filter((v) => !isNaN(parseInt(v))).map((v) => parseInt(v)),
        });
      } else {
        await vc.kv2.deleteMetadata({
          mountPath: 'secret',
          path: vaultPath,
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
