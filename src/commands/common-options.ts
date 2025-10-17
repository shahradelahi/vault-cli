import { Option } from 'commander';

export const EndpointUrlOption = () =>
  new Option('--endpoint-url <endpoint-url>', 'Vault endpoint URL').env('VAULT_ENDPOINT_URL');

export const TokenOption = () =>
  new Option('--token <vault-token>', 'Vault token').env('VAULT_TOKEN');

export const ProfileOption = () =>
  new Option('-P, --profile <name>', 'Name of the profile to use.');

export const CwdOption = () =>
  new Option('--cwd <cwd>', 'Current working directory').default(process.cwd());

export const ForceOption = (description: string) =>
  new Option('--force', description).default(false);
