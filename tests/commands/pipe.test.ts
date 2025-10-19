import { setupCommandTest } from '@tests/helpers/command-test-setup';
import { createVaultContainer, type VaultContainer } from '@tests/helpers/vault-container';
import { execaCommand } from 'execa';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { pipe } from '@/commands/pipe';
import logger from '@/logger';

describe.sequential('pipe command', () => {
  let container: VaultContainer;

  beforeAll(async () => {
    container = await createVaultContainer();
    await container.client.kv2.write({
      mountPath: 'secret',
      path: 'test-pipe',
      data: {
        FOO: 'bar',
        BAZ: 'qux',
      },
    });
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  }, 60_000);

  beforeEach(() => {
    setupCommandTest();
  });

  afterEach(() => {
    (execaCommand as any).mockClear();
  });

  it('should pull secrets and pipe them to a command', async () => {
    const commandToRun = 'node -e "console.log(process.env.FOO)"';
    await pipe.parseAsync([
      'node',
      'kvault',
      'secret/test-pipe',
      commandToRun,
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.error).not.toHaveBeenCalled();
    expect(execaCommand).toHaveBeenCalledWith(
      commandToRun,
      expect.objectContaining({
        env: {
          FOO: 'bar',
          BAZ: 'qux',
        },
        shell: true,
        stdio: 'inherit',
        cleanup: true,
      })
    );
  });

  it('should fail if secret path does not exist', async () => {
    await pipe.parseAsync([
      'node',
      'kvault',
      'secret/non-existent',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.error).toHaveBeenCalledWith(
      'The path secret/non-existent does not exist. Please try again.'
    );
    expect(process.exitCode).toBe(1);
  });
});
