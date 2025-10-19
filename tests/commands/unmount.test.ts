import { Client } from '@litehex/node-vault';
import { createVaultContainer, type VaultContainer } from '@tests/helpers/vault-container';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { unmount } from '@/commands/unmount';
import logger from '@/logger';

describe.sequential('unmount command', () => {
  let vaultContainer: VaultContainer;
  let client: Client;
  let loggerSuccessSpy: any;
  let loggerErrorSpy: any;

  beforeAll(async () => {
    vaultContainer = await createVaultContainer();
    client = vaultContainer.client;
  }, 60_000);

  afterAll(async () => {
    await vaultContainer.stop();
  }, 60_000);

  beforeEach(() => {
    loggerSuccessSpy = vi.spyOn(logger, 'success').mockImplementation(() => {});
    loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    process.exitCode = 0;
  });

  it('should unmount a secret engine', async () => {
    const mountPath = 'test-unmount-success';
    await client.mount({
      mountPath,
      type: 'kv-v2',
    });

    await unmount.parseAsync([
      'node',
      'kvault',
      mountPath,
      '--endpoint-url',
      vaultContainer.endpointURL,
      '--token',
      vaultContainer.token,
    ]);

    expect(loggerErrorSpy).not.toHaveBeenCalled();
    expect(loggerSuccessSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Successfully unmounted`)
    );

    const info = await client.kv2.info({ mountPath });
    expect(info).toHaveProperty('error');
  });
});
