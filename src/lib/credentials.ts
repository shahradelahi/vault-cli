import path from 'node:path';
import { fsAccess } from '@/utils/fs-access.ts';
import { promises } from 'node:fs';
import { Profile } from '@/typeings.ts';
import toml from '@iarna/toml';
import { homedir } from 'node:os';

export const BASE_PATH = path.resolve(homedir(), '.vault');

export const CREDENTIALS_PATH = path.resolve(BASE_PATH, 'credentials');

export async function ensureCredentialsPaths(): Promise<void> {
  if (!(await fsAccess(BASE_PATH))) {
    await promises.mkdir(BASE_PATH, { mode: 0o700 });
  }

  if (!(await fsAccess(CREDENTIALS_PATH))) {
    await promises.writeFile(CREDENTIALS_PATH, '', { mode: 0o600 });
  }

  await checkPermissions();
}

// Checks for permissions and warn if creds directory or its file is too open
async function checkPermissions(): Promise<void> {
  const stats = await promises.stat(CREDENTIALS_PATH);

  if (stats.mode !== 0o600) {
    await promises.chmod(CREDENTIALS_PATH, 0o600).catch(() => {
      console.warn(
        `The file ${CREDENTIALS_PATH} is readable by other users on this system! This is not recommended!`
      );
    });
  }

  const parentStats = await promises.stat(BASE_PATH);

  if (parentStats.mode !== 0o700) {
    await promises.chmod(BASE_PATH, 0o700).catch(() => {
      console.warn(
        `The directory ${BASE_PATH} is readable by other users on this system! This is not recommended!`
      );
    });
  }
}

export async function getCredentials(): Promise<Record<string, Profile>> {
  await ensureCredentialsPaths();

  const profileFile = await promises.readFile(CREDENTIALS_PATH, 'utf-8');
  const profile = toml.parse(profileFile);

  return profile as unknown as Record<string, Profile>;
}
