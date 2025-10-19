import { vi } from 'vitest';

import * as helpers from '@/lib/helpers';
import logger from '@/logger';

import type { VaultContainer } from './vault-container';

export function mockLogger() {
  vi.spyOn(logger, 'log').mockImplementation(() => {});
  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'success').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
}

export function mockGetCredentialsFromOpts(container: VaultContainer) {
  (helpers.getCredentialsFromOpts as any).mockResolvedValue({
    endpointUrl: container.endpointURL,
    token: container.token,
  });
}

export function setupCommandTest(container?: VaultContainer) {
  if (container) {
    mockGetCredentialsFromOpts(container);
  }
  mockLogger();
  process.exitCode = 0;
}
