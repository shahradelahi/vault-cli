import { getProfile } from '@/lib/profile.ts';
import { Profile } from '@/typeings.ts';

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
