# Vault CLI for

A minimal CLI to access your HashiCorp's Vault secrets from the command line.

### Usage

```bash
npx @litehex/vault-cli --help

# Or use `bunx`:

bunx @litehex/vault-cli --help
```

#### Make it global

```bash
npm i -g @litehex/vault-cli
```


### make-profile

This command will create a profile in your home directory. It will be used to store your Vault's address and token.

#### Options

```txt
Usage: vault make-profile [options] <name>

Create a new vault profile

Options:
  --endpoint-url <endpoint-url>  Vault endpoint URL
  --token <vault-token>          Vault token
  --force                        Overwrite existing profile (default: false)
  -h, --help                     display help for command
```

#### Examples

```bash
# Create a new profile
vault make-profile my-profile --endpoint-url https://vault.example.com --token my-token
```

### push

This command will push a secret to your Vault.

#### Options

```txt
Usage: vault push [options] <env-file> <secrets-path>

Push an environment to Vault

Options:
  -P, --profile <name>           name of the profile to use.
  --endpoint-url <endpoint-url>  Vault endpoint URL
  --token <vault-token>          Vault token
  --cwd <cwd>                    Current working directory (default: "/home/jesus/Projects/WebstormProjects/Github/Litehex/vault-cli")
  --force                        Write to Vault even if the secrets are in conflict (default: false)
  -h, --help                     display help for command
```

#### Examples

```bash
# Push a .env.local file to Vault
vault push --profile my-profile .env.local secret/data/my-app

# Use credentials instead of a profile
vault push --endpoint-url https://vault.example.com --token my-token .env.local secret/data/my-app
```

### pull

This command will pull a secret from your Vault.

#### Options

```txt
Usage: vault pull [options] <secrets-path>

Pull an environment from Vault

Options:
  -P, --profile <name>           name of the profile to use.
  --endpoint-url <endpoint-url>  Vault endpoint URL
  --token <vault-token>          Vault token
  -E, --env-path <env-path>      Path to the environment file
  -F, --format <format>          Format of the environment file (default: "dotenv")
  --cwd <cwd>                    Current working directory (default: "/home/jesus/Projects/WebstormProjects/Github/Litehex/vault-cli")
  --force                        Write environment file even if it exists (default: false)
  -h, --help                     display help for command
```

#### Examples

```bash
# Pull a secret from Vault
vault pull --profile my-profile secret/data/my-app

# Pull a secret from Vault and save it to a .env file
vault pull --profile my-profile secret/data/my-app --env-path .env
```

### License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details

