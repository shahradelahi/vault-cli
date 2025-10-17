import { promises } from 'node:fs';
import toml from '@iarna/toml';

import { CREDENTIALS_PATH, getCredentials } from '@/lib/credentials';
import { Profile } from '@/typeings';

export async function getProfile(name: string): Promise<Profile | undefined> {
  const profile = await getCredentials();

  return profile[name];
}

export async function setProfile(name: string, profile: Profile): Promise<void> {
  const credentials = await getCredentials();

  credentials[name] = profile;

  await promises.writeFile(CREDENTIALS_PATH, toml.stringify(credentials));
}

export async function deleteProfile(name: string): Promise<void> {
  const credentials = await getCredentials();

  delete credentials[name];

  await promises.writeFile(CREDENTIALS_PATH, toml.stringify(credentials));
}

export async function getAllProfiles(): Promise<Record<string, Profile>> {
  const credentials = await getCredentials();

  return credentials;
}
