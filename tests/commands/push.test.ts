import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setupCommandTest } from '@tests/helpers/command-test-setup';
import { createVaultContainer, type VaultContainer } from '@tests/helpers/vault-container';
import prompts from 'prompts';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { push } from '@/commands/push';
import logger from '@/logger';

vi.mock('prompts');

describe.sequential('push command', () => {
  let container: VaultContainer;
  let tempDir: string;

  beforeAll(async () => {
    container = await createVaultContainer();
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  }, 60_000);

  beforeEach(async () => {
    setupCommandTest();
    const tempDirPrefix = path.join(os.tmpdir(), 'vault-cli-test-');
    tempDir = await fs.mkdtemp(tempDirPrefix);
  });

  afterEach(() => {
    (prompts as any).mockReset();
  });

  it('should push secrets from an env file to Vault', async () => {
    const envFile = path.join(tempDir, '.env');
    await fs.writeFile(envFile, 'FOO=bar\nBAZ=qux');

    await push.parseAsync([
      'node',
      'kvault',
      envFile,
      'secret/test-push',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Secrets written to Vault.'));

    const { data } = await container.client.kv2.read({
      mountPath: 'secret',
      path: 'test-push',
    });

    expect(data?.data.data).toEqual({
      FOO: 'bar',
      BAZ: 'qux',
    });
  });

  it('should overwrite existing secrets with --force', async () => {
    await container.client.kv2.write({
      mountPath: 'secret',
      path: 'test-overwrite',
      data: {
        OLD: 'secret',
      },
    });

    const envFile = path.join(tempDir, '.env');
    await fs.writeFile(envFile, 'NEW=secret');

    await push.parseAsync([
      'node',
      'kvault',
      envFile,
      'secret/test-overwrite',
      '--force',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(prompts).not.toHaveBeenCalled();
    const { data } = await container.client.kv2.read({
      mountPath: 'secret',
      path: 'test-overwrite',
    });
    expect(data?.data.data).toEqual({ NEW: 'secret' });
  });

  it('should prompt to overwrite existing secrets and overwrite if confirmed', async () => {
    await container.client.kv2.write({
      mountPath: 'secret',
      path: 'test-prompt-overwrite',
      data: {
        OLD: 'secret',
      },
    });
    (prompts as any).mockResolvedValue({ overwrite: true });

    const envFile = path.join(tempDir, '.env');
    await fs.writeFile(envFile, 'NEW=secret');

    await push.parseAsync([
      'node',
      'kvault',
      envFile,
      'secret/test-prompt-overwrite',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(prompts).toHaveBeenCalledOnce();
    const { data } = await container.client.kv2.read({
      mountPath: 'secret',
      path: 'test-prompt-overwrite',
    });
    expect(data?.data.data).toEqual({ NEW: 'secret' });
  });

  it('should prompt to overwrite existing secrets and abort if not confirmed', async () => {
    await container.client.kv2.write({
      mountPath: 'secret',
      path: 'test-prompt-abort',
      data: {
        OLD: 'secret',
      },
    });
    (prompts as any).mockResolvedValue({ overwrite: false });

    const envFile = path.join(tempDir, '.env');
    await fs.writeFile(envFile, 'NEW=secret');

    await push.parseAsync([
      'node',
      'kvault',
      envFile,
      'secret/test-prompt-abort',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(prompts).toHaveBeenCalledOnce();
    const { data } = await container.client.kv2.read({
      mountPath: 'secret',
      path: 'test-prompt-abort',
    });
    expect(data?.data.data).toEqual({ OLD: 'secret' });
    expect(process.exitCode).toBe(0);
    expect(logger.log).toHaveBeenCalledWith('Aborting');
  });

  it('should warn if env file does not exist', async () => {
    const envFile = path.join(tempDir, 'non-existent.env');

    await push.parseAsync([
      'node',
      'kvault',
      envFile,
      'secret/test-fail',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`No secrets found in ${envFile}. Nothing to push.`)
    );
    expect(process.exitCode).toBe(0);
  });
});
