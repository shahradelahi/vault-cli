import prompts from 'prompts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeProfile } from '@/commands/make-profile';
import * as credentials from '@/lib/credentials';
import * as profile from '@/lib/profile';
import logger from '@/logger';

describe('make-profile command', () => {
  const loggerLogSpy = vi.spyOn(logger, 'log');

  beforeEach(() => {
    vi.resetAllMocks();
    process.exitCode = 0;
  });

  afterEach(() => {
    loggerLogSpy.mockClear();
  });

  it('should create a new profile', async () => {
    const ensureCredentialsPathsSpy = vi
      .spyOn(credentials, 'ensureCredentialsPaths')
      .mockResolvedValue(undefined);
    const getProfileSpy = vi.spyOn(profile, 'getProfile').mockResolvedValue(undefined);
    const setProfileSpy = vi.spyOn(profile, 'setProfile').mockResolvedValue(undefined);

    await makeProfile.parseAsync([
      'node',
      'kvault',
      'test-profile',
      '--endpoint-url',
      'http://localhost:8200',
      '--token',
      'root',
    ]);

    expect(ensureCredentialsPathsSpy).toHaveBeenCalledOnce();
    expect(getProfileSpy).toHaveBeenCalledWith('test-profile');
    expect(setProfileSpy).toHaveBeenCalledWith('test-profile', {
      endpointUrl: 'http://localhost:8200',
      token: 'root',
    });
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Profile created.'));
  });

  it('should overwrite an existing profile with --force', async () => {
    const ensureCredentialsPathsSpy = vi
      .spyOn(credentials, 'ensureCredentialsPaths')
      .mockResolvedValue(undefined);
    const getProfileSpy = vi
      .spyOn(profile, 'getProfile')
      .mockResolvedValue({ endpointUrl: 'old', token: 'old' });
    const setProfileSpy = vi.spyOn(profile, 'setProfile').mockResolvedValue(undefined);

    await makeProfile.parseAsync([
      'node',
      'kvault',
      'test-profile',
      '--endpoint-url',
      'http://localhost:8200',
      '--token',
      'root',
      '--force',
    ]);

    expect(ensureCredentialsPathsSpy).toHaveBeenCalledOnce();
    expect(getProfileSpy).toHaveBeenCalledWith('test-profile');
    expect(setProfileSpy).toHaveBeenCalledWith('test-profile', {
      endpointUrl: 'http://localhost:8200',
      token: 'root',
    });
    expect(prompts).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Profile created.'));
  });

  it('should prompt to overwrite an existing profile and overwrite if confirmed', async () => {
    const ensureCredentialsPathsSpy = vi
      .spyOn(credentials, 'ensureCredentialsPaths')
      .mockResolvedValue(undefined);
    const getProfileSpy = vi
      .spyOn(profile, 'getProfile')
      .mockResolvedValue({ endpointUrl: 'old', token: 'old' });
    const setProfileSpy = vi.spyOn(profile, 'setProfile').mockResolvedValue(undefined);
    (prompts as any).mockResolvedValue({ overwrite: true });

    await makeProfile.parseAsync([
      'node',
      'kvault',
      'test-profile',
      '--endpoint-url',
      'http://localhost:8200',
      '--token',
      'root',
    ]);

    expect(ensureCredentialsPathsSpy).toHaveBeenCalledOnce();
    expect(getProfileSpy).toHaveBeenCalledWith('test-profile');
    expect(prompts).toHaveBeenCalledOnce();
    expect(setProfileSpy).toHaveBeenCalledWith('test-profile', {
      endpointUrl: 'http://localhost:8200',
      token: 'root',
    });
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Profile created.'));
  });

  it('should prompt to overwrite an existing profile and abort if not confirmed', async () => {
    const ensureCredentialsPathsSpy = vi
      .spyOn(credentials, 'ensureCredentialsPaths')
      .mockResolvedValue(undefined);
    const getProfileSpy = vi
      .spyOn(profile, 'getProfile')
      .mockResolvedValue({ endpointUrl: 'old', token: 'old' });
    const setProfileSpy = vi.spyOn(profile, 'setProfile').mockResolvedValue(undefined);
    (prompts as any).mockResolvedValue({ overwrite: false });

    await makeProfile.parseAsync([
      'node',
      'kvault',
      'test-profile',
      '--endpoint-url',
      'http://localhost:8200',
      '--token',
      'root',
    ]);

    expect(ensureCredentialsPathsSpy).toHaveBeenCalledOnce();
    expect(getProfileSpy).toHaveBeenCalledWith('test-profile');
    expect(prompts).toHaveBeenCalledOnce();
    expect(setProfileSpy).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith('Aborting');
    expect(process.exitCode).toBe(0);
  });
});
