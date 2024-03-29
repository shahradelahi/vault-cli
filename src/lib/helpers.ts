import { getProfile } from '@/lib/profile.ts';
import { Profile } from '@/typeings.ts';
import { Client, VaultError } from '@litehex/node-vault';
import chalk from 'chalk';
import path from 'node:path';
import { fsAccess } from '@/utils/fs-access.ts';

export async function getCredentialsFromOpts(options: any): Promise<Profile> {
  const { profile: profileName, endpointUrl, token } = options;

  if (profileName && typeof profileName === 'string') {
    // Get profile from credentials
    const profile = await getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile ${chalk.bold(profileName)} not found.`);
    }

    return profile;
  }

  if (endpointUrl && token) {
    // return endpointUrl and token
    return {
      endpointUrl,
      token
    };
  }

  // throw error
  throw new Error('Please provide a profile or endpoint url and token.');
}

export async function getUnsealedClient(options: any) {
  const credentials = await getCredentialsFromOpts(options);

  const vc = new Client({
    endpoint: credentials.endpointUrl,
    token: credentials.token
  });

  const status = await vc.sealStatus();
  if ('errors' in status) {
    throw new VaultError(status.errors);
  }

  if (status.sealed) {
    throw new Error('Vault is sealed. Please unseal Vault and try again.');
  }

  return vc;
}

export async function resolveAccessiblePath(p: string): Promise<string> {
  const moiPath = path.resolve(p);

  const accessible = await fsAccess(moiPath);
  if (!accessible) {
    throw new Error(`The path ${p} does not exist. Please try again.`);
  }

  return moiPath;
}
