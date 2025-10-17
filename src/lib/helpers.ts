import path from 'node:path';
import { Client } from '@litehex/node-vault';
import chalk from 'chalk';

import { getProfile } from '@/lib/profile';
import { Profile } from '@/typeings';
import { fsAccess } from '@/utils/fs-access';

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
      token,
    };
  }

  // throw error
  throw new Error('Please provide a profile or endpoint url and token.');
}

export async function getUnsealedClient(options: any) {
  const credentials = await getCredentialsFromOpts(options);

  const vc = new Client({
    endpoint: credentials.endpointUrl,
    token: credentials.token,
  });

  const { data: status, error } = await vc.sealStatus();
  if (error) {
    throw error;
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
    throw new Error(`The path ${chalk.bold(p)} does not exist.`);
  }

  return moiPath;
}
