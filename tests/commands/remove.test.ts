import { setupCommandTest } from '@tests/helpers/command-test-setup';
import { createVaultContainer, type VaultContainer } from '@tests/helpers/vault-container';
import prompts from 'prompts';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { remove } from '@/commands/remove';
import logger from '@/logger';

describe.sequential('remove command', () => {
  let container: VaultContainer;

  beforeAll(async () => {
    container = await createVaultContainer();
    // Setup some data
    await container.client.kv2.write({
      mountPath: 'secret',
      path: 'test-remove',
      data: { foo: 'bar' },
    });
    await container.client.kv2.write({
      mountPath: 'secret',
      path: 'test-remove',
      data: { foo: 'baz' },
    });
    await container.client.kv2.write({
      mountPath: 'secret',
      path: 'test-remove-versions',
      data: { version: '1' },
    });
    await container.client.kv2.write({
      mountPath: 'secret',
      path: 'test-remove-versions',
      data: { version: '2' },
    });
    await container.client.kv2.write({
      mountPath: 'secret',
      path: 'test-remove-versions',
      data: { version: '3' },
    });
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  }, 60_000);

  beforeEach(async () => {
    setupCommandTest();
  });

  afterEach(() => {
    (prompts as any).mockReset();
    // vi.restoreAllMocks();
  });

  it('should remove a secret path with --force', async () => {
    await remove.parseAsync([
      'node',
      'kvault',
      'secret/test-remove',
      '--force',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('Successfully removed'));

    const { error } = await container.client.kv2.read({
      mountPath: 'secret',
      path: 'test-remove',
    });
    expect(error).toBeDefined();
  });

  it('should remove specific versions of a secret with --force', async () => {
    await remove.parseAsync([
      'node',
      'kvault',
      'secret/test-remove-versions',
      '1',
      '2',
      '--force',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('Successfully removed'));

    const { data } = await container.client.kv2.readMetadata({
      mountPath: 'secret',
      path: 'test-remove-versions',
    });
    expect(data).toBeDefined();
    expect(data?.data.versions['1']?.deletion_time).not.empty;
    expect(data?.data.versions['2']?.deletion_time).not.empty;
    expect(data?.data.versions['3']?.deletion_time).eq('');
  });

  it('should prompt to remove a secret and remove if confirmed', async () => {
    (prompts as any).mockResolvedValue({ value: true });
    await container.client.kv2.write({
      mountPath: 'secret',
      path: 'test-prompt-remove',
      data: { foo: 'bar' },
    });

    await remove.parseAsync([
      'node',
      'kvault',
      'secret/test-prompt-remove',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(prompts).toHaveBeenCalledOnce();
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('Successfully removed'));
    const { error } = await container.client.kv2.read({
      mountPath: 'secret',
      path: 'test-prompt-remove',
    });
    expect(error).toBeDefined();
  });

  it('should prompt to remove a secret and abort if not confirmed', async () => {
    (prompts as any).mockResolvedValue({ value: false });
    await container.client.kv2.write({
      mountPath: 'secret',
      path: 'test-prompt-abort',
      data: { foo: 'bar' },
    });

    await remove.parseAsync([
      'node',
      'kvault',
      'secret/test-prompt-abort',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(prompts).toHaveBeenCalledOnce();
    expect(logger.log).toHaveBeenCalledWith('Aborted.');
    expect(process.exitCode).toBe(0);

    const { error } = await container.client.kv2.read({
      mountPath: 'secret',
      path: 'test-prompt-abort',
    });
    expect(error).toBeUndefined();
  });

  it('should warn if secret path does not exist', async () => {
    await remove.parseAsync([
      'node',
      'kvault',
      'secret/non-existent',
      '--force',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('not exist. Nothing to remove.')
    );
    expect(process.exitCode).toBe(0);
  });
});
