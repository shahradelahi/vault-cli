import { getProfile } from '@/lib/profile.ts';
import { Profile } from '@/typeings.ts';
import { Client } from '@litehex/node-vault';

export async function getCredentialsFromOpts(options: any): Promise<Profile> {
  const { profile: profileName, endpointUrl, token } = options;

  if (profileName && typeof profileName === 'string') {
    // get profile from credentials
    const profile = await getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile "${profile}" not found.`);
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

  const status = await vc.status();
  if (status.sealed) {
    throw new Error('Vault is sealed. Please unseal Vault and try again.');
  }

  return vc;
}
