import path from 'node:path';
import { fsAccess } from '@/utils/fs-access.ts';
import { mkdir } from 'node:fs/promises';
import { Profile } from '@/typeings.ts';
import toml from '@iarna/toml';

export const BASE_PATH = path.resolve(
  path.join(path.resolve(process.env.HOME || process.env.USERPROFILE || '.'), '.vault')
);

export const CREDENTIALS_PATH = path.resolve(path.join(BASE_PATH, 'credentials'));

export async function ensureCredentialsPaths(): Promise<void> {
  if (!(await fsAccess(BASE_PATH))) {
    await mkdir(BASE_PATH);
  }

  if (!(await fsAccess(CREDENTIALS_PATH))) {
    await Bun.write(CREDENTIALS_PATH, '');
  }
}

export async function getCredentials(): Promise<Record<string, Profile>> {
  await ensureCredentialsPaths();

  const profileFile = Bun.file(CREDENTIALS_PATH);
  const profile = toml.parse(await profileFile.text());

  return profile as unknown as Record<string, Profile>;
}
