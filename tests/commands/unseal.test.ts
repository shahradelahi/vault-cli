import { Readable } from 'node:stream';
import { setupCommandTest } from '@tests/helpers/command-test-setup';
import { createVaultContainer, type VaultContainer } from '@tests/helpers/vault-container';
import ora from 'ora';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { unseal } from '@/commands/unseal';
import logger from '@/logger';

describe.sequential('unseal command', () => {
  let container: VaultContainer;

  beforeAll(async () => {
    container = await createVaultContainer();
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  }, 60_000);

  beforeEach(async () => {
    const { data: status } = await container.client.sealStatus();
    if (!status?.sealed) {
      await container.client.seal();
    }

    setupCommandTest(container);
  });

  afterEach(() => {
    // In some tests, mocks are restored, in others not.
    // To be safe and consistent with seal.test.ts, I'll leave it commented.
    // vi.restoreAllMocks();
  });

  it('should unseal a sealed vault with a key from arguments', async () => {
    let status = await container.client.sealStatus();
    expect(status?.data?.sealed).toBe(true);

    await unseal.parseAsync(['node', 'kvault', container.unsealKey]);

    expect(logger.error).not.toHaveBeenCalled();
    const oraInstance = (ora as any).mock.results[0].value;
    expect(oraInstance.succeed).toHaveBeenCalledWith('Vault unsealed.');

    status = await container.client.sealStatus();
    expect(status?.data?.sealed).toBe(false);
  });

  it('should unseal a sealed vault with keys from stdin', async () => {
    let status = await container.client.sealStatus();
    expect(status?.data?.sealed).toBe(true);

    // Mock stdin
    const stdin = new Readable();
    stdin.push(container.unsealKey);
    stdin.push(null); // End the stream
    const originalStdin = process.stdin;
    Object.defineProperty(process, 'stdin', { value: stdin, configurable: true });

    await unseal.parseAsync(['node', 'kvault', '--stdin']);

    expect(logger.error).not.toHaveBeenCalled();
    const oraInstance = (ora as any).mock.results[0].value;
    expect(oraInstance.succeed).toHaveBeenCalledWith('Vault unsealed.');

    status = await container.client.sealStatus();
    expect(status?.data?.sealed).toBe(false);

    // Restore stdin
    Object.defineProperty(process, 'stdin', { value: originalStdin });
  });

  it('should inform the user if the vault is already unsealed', async () => {
    // First unseal it
    await container.client.unseal({ key: container.unsealKey });
    const status = await container.client.sealStatus();
    expect(status?.data?.sealed).toBe(false);

    await unseal.parseAsync(['node', 'kvault', container.unsealKey]);

    expect(logger.info).toHaveBeenCalledWith('Vault is already unsealed.');
  });

  it('should fail if not enough keys are provided', async () => {
    const sealStatusSpy = vi.spyOn(container.client, 'sealStatus').mockResolvedValue({
      // @ts-expect-error - mocking seal status
      data: {
        sealed: true,
        t: 2, // threshold
      },
    });

    await unseal.parseAsync(['node', 'kvault']);

    expect(logger.error).toHaveBeenCalledWith('The provided keys were not enough to unseal Vault.');
    expect(process.exitCode).toBe(1);
    sealStatusSpy.mockRestore();
  });
});
