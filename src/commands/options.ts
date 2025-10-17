import { Option } from 'commander';

export const EndpointUrlOption = new Option(
  '--endpoint-url <endpoint-url>',
  'Vault endpoint URL'
).env('VAULT_ENDPOINT_URL');

export const TokenOption = new Option('--token <vault-token>', 'Vault token').env('VAULT_TOKEN');
