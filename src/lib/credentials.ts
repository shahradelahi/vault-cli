import path from 'node:path';
import { fsAccess } from '@/utils/fs-access.ts';
import { promises } from 'fs';
import { Profile } from '@/typeings.ts';
import toml from '@iarna/toml';

export const BASE_PATH = path.resolve(
  path.join(path.resolve(process.env.HOME || process.env.USERPROFILE || '.'), '.vault')
);

export const CREDENTIALS_PATH = path.resolve(path.join(BASE_PATH, 'credentials'));

export async function ensureCredentialsPaths(): Promise<void> {
  if (!(await fsAccess(BASE_PATH))) {
    await promises.mkdir(BASE_PATH);
  }

  if (!(await fsAccess(CREDENTIALS_PATH))) {
    await promises.writeFile(CREDENTIALS_PATH, '');
  }
}

export async function getCredentials(): Promise<Record<string, Profile>> {
  await ensureCredentialsPaths();

  const profileFile = await promises.readFile(CREDENTIALS_PATH, 'utf-8');
  const profile = toml.parse(profileFile);

  return profile as unknown as Record<string, Profile>;
}
