import { createVaultContainer, type VaultContainer } from '@tests/helpers/vault-container';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { mount } from '@/commands/mount';
import logger from '@/logger';

describe.sequential('mount command', () => {
  let container: VaultContainer;
  let processExitSpy: any;
  let loggerSuccessSpy: any;
  let loggerErrorSpy: any;

  beforeAll(async () => {
    container = await createVaultContainer();
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  }, 60_000);

  beforeEach(() => {
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    loggerSuccessSpy = vi.spyOn(logger, 'success').mockImplementation(() => {});
    loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    process.exitCode = 0;
  });

  afterEach(() => {
    processExitSpy.mockRestore();
    loggerSuccessSpy.mockRestore();
    loggerErrorSpy.mockRestore();
  });

  it('should mount a new KV2 secret engine', async () => {
    const mountPath = 'test-mount-success';
    await mount.parseAsync([
      'node',
      'kvault',
      mountPath,
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining(`Successfully mounted`));

    const info = await container.client.kv2.info({ mountPath });
    expect(info).not.toHaveProperty('error');
  });

  it('should fail if a secret engine already exists at the path', async () => {
    const mountPath = 'test-mount-fail';

    // Pre-mount an engine to test against
    await container.client.mount({
      mountPath,
      type: 'kv-v2',
    });

    await mount.parseAsync([
      'node',
      'kvault',
      mountPath,
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining(`A secret engine already exists at`)
    );
    expect(process.exitCode).toBe(1);
  });
});
