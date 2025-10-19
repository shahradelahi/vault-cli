import { setupCommandTest } from '@tests/helpers/command-test-setup';
import { createVaultContainer, type VaultContainer } from '@tests/helpers/vault-container';
import ora from 'ora';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seal } from '@/commands/seal';
import logger from '@/logger';

describe.sequential('seal command', () => {
  let container: VaultContainer;

  beforeAll(async () => {
    container = await createVaultContainer();
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  }, 60_000);

  beforeEach(async () => {
    const { data: status } = await container.client.sealStatus();
    if (status?.sealed) {
      // Can't unseal without keys, so we have to restart the container
      await container.stop();
      container = await createVaultContainer();
    }

    setupCommandTest(container);
  });

  it('should seal an unsealed vault', async () => {
    let status = await container.client.sealStatus();
    expect(status?.data?.sealed).toBe(false);

    await seal.parseAsync(['node', 'kvault']);

    expect(logger.error).not.toHaveBeenCalled();
    const oraInstance = (ora as any).mock.results[0].value;
    expect(oraInstance.succeed).toHaveBeenCalledWith('Vault sealed.');

    status = await container.client.sealStatus();
    expect(status?.data?.sealed).toBe(true);
  });

  it('should inform the user if the vault is already sealed', async () => {
    await container.client.seal();
    const status = await container.client.sealStatus();
    expect(status?.data?.sealed).toBe(true);

    await seal.parseAsync(['node', 'kvault']);

    expect(logger.info).toHaveBeenCalledWith('Vault is already sealed.');
    expect(process.exitCode).toBe(0);
  });
});
