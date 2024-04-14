# Vault CLI

[![npm](https://img.shields.io/npm/v/kvault)](https://www.npmjs.com/package/kvault)
[![install size](https://packagephobia.com/badge?p=kvault)](https://packagephobia.com/result?p=kvault)

> A CLI to access your HashiCorp's Vault Key/Value V2 secrets from the command line.

### Usage

```bash
npx kvault --help
# Or
bunx kvault --help
```

#### Make it global

```bash
npm install --global kvault
```

### Table of Contents

- [Install](#make-it-global)
- [Usage](#usage)
- Commands
  - [Make Profile](#make-profile)
  - [Push](#push)
  - [Pull](#pull)
  - [Remove](#rm)
  - [Pipe](#pipe)
- [Reporting Issues](#reporting-issues)

### make-profile

This command will create a profile in your home directory. It will be used to store your Vault's address and token.

#### Options

```txt
Usage: kvault make-profile [options] <name>

Create a new vault profile

Options:
  --endpoint-url <endpoint-url>  Vault endpoint URL
  --token <vault-token>          Vault token
  --force                        Overwrite existing profile (default: false)
  -h, --help                     display help for command
```

###### Examples

```bash
# Create a new profile
kvault make-profile my-profile --endpoint-url https://vault.example.com --token my-token
```

### push

This command will push a secret to your Vault.

#### Options

```txt
Usage: kvault push [options] <env-file> <secrets-path>

Push an environment to Vault

Options:
  -P, --profile <name>           Name of the profile to use.
  --endpoint-url <endpoint-url>  Vault endpoint URL
  --token <vault-token>          Vault token
  --cwd <cwd>                    Current working directory (default: ".")
  --force                        Write to Vault even if the secrets are in conflict (default: false)
  -h, --help                     display help for command
```

###### Examples

```bash
# Push a .env.local file to Vault
kvault push --profile my-profile .env.local secret/my-app

# Use credentials instead of a profile
kvault push --endpoint-url https://vault.example.com --token my-token .env.local secret/my-app
```

### pull

This command will pull a secret from your Vault.

#### Options

```txt
Usage: kvault pull [options] <secrets-path>

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

###### Examples

```bash
# Pull a secret from Vault
kvault pull --profile my-profile secret/my-app

# Pull a secret from Vault and save it to a .env file
kvault pull --profile my-profile secret/my-app --env-path .env

# Pull a secret from Vault and add them to shell environment
kvault pull --profile my-profile secret/my-app --format shell | grep -e '^export' | source /dev/stdin
```

### pipe

This command will pull and pipe secrets from your Vault to another command.

#### Options

```txt
Usage: kvault pipe [options] <secrets-path> [command...]

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

###### Examples

```bash
# Pull a secret from Vault and pipe it to a command
kvault pipe --profile my-profile secret/my-app env | grep -e '^MY_APP_'

# Pull a secret from Vault and pipe it to a node script
kvault pipe --profile my-profile secret/my-app "node -e 'console.log(process.env.MY_APP_SECRET)'"
```

### rm

This command will remove a path or some versions of a secret.

#### Options

```txt
Usage: kvault rm [options] <secrets-path> [versions...]

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

###### Examples

```bash
# Remove a path secret from Vault
kvault rm --profile my-profile secret/my-app

# Remove a secret version from Vault
kvault rm --profile my-profile secret/my-app 3 4
```

### Reporting Issues

For reporting bugs and feature requests please open an issue
on [GitHub](https://github.com/shahradelahi/vault-cli/issues).

### License

[GPL-3.0](LICENSE) © [Shahrad Elahi](https://github.com/shahradelahi)
