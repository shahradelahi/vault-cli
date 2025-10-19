import { vi } from 'vitest';

import * as helpers from '@/lib/helpers';

vi.mock('execa');
vi.mock('prompts');
vi.mock('ora', () => {
  const mOra = {
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    text: '',
    color: '',
  };
  return {
    __esModule: true,
    default: vi.fn(() => mOra),
  };
});

vi.mock('@/lib/profile');
vi.mock('@/lib/credentials');
vi.mock('@/logger');

vi.mock('@/lib/helpers', async (importOriginal) => {
  const original = await importOriginal<typeof helpers>();
  return {
    ...original,
    getCredentialsFromOpts: vi.fn(),
  };
});
