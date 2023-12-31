# Vault CLI

A minimal CLI to access your HashiCorp's Vault secrets from the command line.

### Usage

```bash
npx @litehex/vault-cli --help
# Or
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
  -P, --profile <name>           Name of the profile to use.
  --endpoint-url <endpoint-url>  Vault endpoint URL
  --token <vault-token>          Vault token
  --cwd <cwd>                    Current working directory (default: ".")
  --force                        Write to Vault even if the secrets are in conflict (default: false)
  -h, --help                     display help for command
```

#### Examples

```bash
# Push a .env.local file to Vault
vault push --profile my-profile .env.local secret/my-app

# Use credentials instead of a profile
vault push --endpoint-url https://vault.example.com --token my-token .env.local secret/my-app
```

### pull

This command will pull a secret from your Vault.

#### Options

```txt
Usage: vault pull [options] <secrets-path>

Pull an environment from Vault

Options:
  -P, --profile <name>             Name of the profile to use.
  --endpoint-url <endpoint-url>    Vault endpoint URL
  --token <vault-token>            Vault token
  -O, --output-file <output-path>  Path to write the environment file to
  -F, --format <format>            Format of the environment file (default: "dotenv")
  --cwd <cwd>                      Current working directory (default: ".")
  --force                          Write environment file even if it exists (default: false)
  -h, --help                       display help for command
```

#### Examples

```bash
# Pull a secret from Vault
vault pull --profile my-profile secret/my-app

# Pull a secret from Vault and save it to a .env file
vault pull --profile my-profile secret/my-app --env-path .env

# Pull a secret from Vault and add them to shell environment
vault pull --profile my-profile secret/my-app --format shell | grep -e '^export' | source /dev/stdin
```

### pipe

This command will pull and pipe secrets from your Vault to another command.

#### Options

```txt
Usage: vault pipe [options] <secrets-path> [command...]

Pull an environment from Vault and pipe it to a command

Arguments:
  secrets-path
  command                        Command to pipe to (default: [])

Options:
  -P, --profile <name>           Name of the profile to use.
  --endpoint-url <endpoint-url>  Vault endpoint URL
  --token <vault-token>          Vault token
  --cwd <cwd>                    Current working directory (default: ".")
  -h, --help                     display help for command
```

#### Examples

```bash
# Pull a secret from Vault and pipe it to a command
vault pipe --profile my-profile secret/my-app env | grep -e '^MY_APP_'

# Pull a secret from Vault and pipe it to a node script
vault pipe --profile my-profile secret/my-app "node -e 'console.log(process.env.MY_APP_SECRET)'"
```

### rm

This command will remove a path or some versions of a secret.

#### Options

```txt
Usage: vault rm [options] <secrets-path> [versions...]

Remove a secret from Vault

Arguments:
  secrets-path
  versions                       Versions to remove. By default, path will be removed (default: [])

Options:
  -P, --profile <name>           Name of the profile to use
  --endpoint-url <endpoint-url>  Vault endpoint URL
  --token <vault-token>          Vault token
  --force                        Remove the secret without confirmation (default: false)
  -h, --help                     display help for command
```

#### Examples

```bash
# Remove a path secret from Vault
vault rm --profile my-profile secret/my-app

# Remove a secret version from Vault
vault rm --profile my-profile secret/my-app 3 4
```

### Reporting Issues

If you are having trouble getting something to work with this tool or run into any problems, you can create a
new issue [GitHub Issues](https://github.com/shahradelahi/vault-cli/issues).

### License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details
