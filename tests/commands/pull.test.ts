import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setupCommandTest } from '@tests/helpers/command-test-setup';
import { createVaultContainer, type VaultContainer } from '@tests/helpers/vault-container';
import prompts from 'prompts';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { pull } from '@/commands/pull';
import logger from '@/logger';

describe.sequential('pull command', () => {
  let container: VaultContainer;
  let tempDir: string;

  beforeAll(async () => {
    container = await createVaultContainer();
    await container.client.kv2.write({
      mountPath: 'secret',
      path: 'test-app',
      data: {
        foo: 'bar',
        baz: 'qux',
      },
    });
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  }, 60_000);

  beforeEach(async () => {
    setupCommandTest();
    const tempDirPrefix = path.join(os.tmpdir(), 'vault-cli-test-');
    tempDir = await fs.mkdtemp(tempDirPrefix);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (prompts as any).mockReset();
  });

  it('should pull secrets and print to stdout in dotenv format', async () => {
    const loggerLogSpy = vi.spyOn(logger, 'log');

    await pull.parseAsync([
      'node',
      'kvault',
      'secret/test-app',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.error).not.toHaveBeenCalled();
    const output = loggerLogSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('foo=bar');
    expect(output).toContain('baz=qux');
  });

  it('should pull secrets and write to a file in dotenv format', async () => {
    const outputFile = path.join(tempDir, '.env');

    await pull.parseAsync([
      'node',
      'kvault',
      'secret/test-app',
      '--output-file',
      outputFile,
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Secrets written to'));

    const content = await fs.readFile(outputFile, 'utf-8');
    expect(content).toContain('foo=bar');
    expect(content).toContain('baz=qux');
  });

  it('should pull secrets as json and write to a file', async () => {
    const outputFile = path.join(tempDir, 'secrets.json');

    await pull.parseAsync([
      'node',
      'kvault',
      'secret/test-app',
      '--format',
      'json',
      '--output-file',
      outputFile,
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.error).not.toHaveBeenCalled();
    const content = await fs.readFile(outputFile, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual({ foo: 'bar', baz: 'qux' });
  });

  it('should pull secrets as shell exports and print to stdout', async () => {
    const loggerLogSpy = vi.spyOn(logger, 'log');

    await pull.parseAsync([
      'node',
      'kvault',
      'secret/test-app',
      '--format',
      'shell',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.error).not.toHaveBeenCalled();
    expect(loggerLogSpy).toHaveBeenCalledWith('export foo="bar"');
    expect(loggerLogSpy).toHaveBeenCalledWith('export baz="qux"');
  });

  it('should fail if secret path does not exist', async () => {
    await pull.parseAsync([
      'node',
      'kvault',
      'secret/non-existent',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
    expect(process.exitCode).toBe(1);
  });

  it('should overwrite an existing file with --force', async () => {
    const outputFile = path.join(tempDir, '.env');
    await fs.writeFile(outputFile, 'old content');

    await pull.parseAsync([
      'node',
      'kvault',
      'secret/test-app',
      '--output-file',
      outputFile,
      '--force',
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(prompts).not.toHaveBeenCalled();
    const content = await fs.readFile(outputFile, 'utf-8');
    expect(content).toContain('foo=bar');
  });

  it('should prompt to overwrite an existing file and overwrite if confirmed', async () => {
    const outputFile = path.join(tempDir, '.env');
    await fs.writeFile(outputFile, 'old content');
    (prompts as any).mockResolvedValue({ value: true });

    await pull.parseAsync([
      'node',
      'kvault',
      'secret/test-app',
      '--output-file',
      outputFile,
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(prompts).toHaveBeenCalledOnce();
    const content = await fs.readFile(outputFile, 'utf-8');
    expect(content).toContain('foo=bar');
  });

  it('should prompt to overwrite an existing file and abort if not confirmed', async () => {
    const outputFile = path.join(tempDir, '.env');
    await fs.writeFile(outputFile, 'old content');
    (prompts as any).mockResolvedValue({ value: false });

    await pull.parseAsync([
      'node',
      'kvault',
      'secret/test-app',
      '--output-file',
      outputFile,
      '--endpoint-url',
      container.endpointURL,
      '--token',
      container.token,
    ]);

    expect(prompts).toHaveBeenCalledOnce();
    const content = await fs.readFile(outputFile, 'utf-8');
    expect(content).toBe('old content');
    expect(process.exitCode).toBe(1);
  });
});
