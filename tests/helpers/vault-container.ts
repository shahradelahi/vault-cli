import { Client } from '@litehex/node-vault';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

export interface VaultContainer {
  container: StartedTestContainer;
  client: Client;
  endpointURL: string;
  token: string;
  unsealKey: string;
  stop: () => Promise<void>;
}

export async function createVaultContainer(): Promise<VaultContainer> {
  const rootToken = 'root';
  const container = await new GenericContainer('hashicorp/vault:latest')
    .withExposedPorts(8200)
    .withEnvironment({
      VAULT_DEV_ROOT_TOKEN_ID: rootToken,
    })
    .withWaitStrategy(Wait.forLogMessage(/Vault server started!/))
    .start();

  const stream = await container.logs();
  const unsealKey = await new Promise<string>((resolve) => {
    stream.on('data', (line) => {
      const match = line.toString().match(/Unseal Key: (.*)/);
      if (match) {
        resolve(match[1]);
      }
    });
  });

  const endpoint = `http://${container.getHost()}:${container.getMappedPort(8200)}`;
  const client = new Client({
    endpoint,
    token: rootToken,
  });

  const stop = async () => {
    await container.stop();
  };

  return { container, client, endpointURL: endpoint, token: rootToken, unsealKey, stop };
}
