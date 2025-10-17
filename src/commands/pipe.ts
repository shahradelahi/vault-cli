import { execaCommand } from 'execa';
import ora from 'ora';
import { z } from 'zod';

import { BaseCommand } from '@/lib/command';
import { resolveAccessiblePath } from '@/lib/helpers';
import { doesSecretPathExist, readKV2Path } from '@/lib/vault';
import logger from '@/logger';

import { CwdOption, EndpointUrlOption, ProfileOption, TokenOption } from './common-options';

const pipeOptionsSchema = z.object({
  secretsPath: z.string(),
  command: z.array(z.string()).default([]),
  profile: z.string().optional(),
  endpointUrl: z.string().optional(),
  token: z.string().optional(),
  cwd: z.string().default(process.cwd()),
});

export const pipe = new BaseCommand({
  name: 'pipe <secrets-path> [command...]',
  description: 'Pull an environment from Vault and pipe it to a command',
  schema: pipeOptionsSchema,
  options: [ProfileOption(), EndpointUrlOption(), TokenOption(), CwdOption()],
  action: async (options, vc) => {
    const { secretsPath, cwd, command } = options;

    const resolvedCwd = await resolveAccessiblePath(cwd);

    if (!(await doesSecretPathExist(vc, secretsPath))) {
      logger.error(`The path ${secretsPath} does not exist. Please try again.`);
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
      spinner.fail();
      throw error;
    }

    const { data: secrets } = data.data;
    if (!secrets) {
      spinner.fail();
      logger.error(`No secrets found at ${secretsPath}. Please try again.`);
      process.exitCode = 1;
      return;
    }

    spinner.succeed('Successfully pulled secrets from Vault');

    logger.log('');

    execaCommand(command.join(' '), {
      shell: true,
      cwd: resolvedCwd,
      env: secrets,
      stdio: 'inherit',
      cleanup: true,
    });
  },
});
