import { Client } from '@litehex/node-vault';
import { Command, Option } from 'commander';
import { type z, type ZodSchema } from 'zod';

import { getCredentialsFromOpts, getUnsealedClient } from '@/lib/helpers';
import logger from '@/logger';
import { handleError } from '@/utils/handle-error';

type Action<O> = (options: O, vc: Client) => Promise<void>;
type ActionWithoutClient<O> = (options: O) => Promise<void>;

interface CommandConstructor<S extends ZodSchema> {
  name: string;
  description: string;
  schema: S;
  action: Action<z.infer<S>> | ActionWithoutClient<z.infer<S>>;
  options?: Option[];
  needsClient?: 'unsealed' | 'any' | false;
}

export class BaseCommand<S extends ZodSchema> extends Command {
  constructor(opts: CommandConstructor<S>) {
    const name = opts.name.split(' ')[0];
    const args = opts.name.substring(name?.length || 0).trim();
    super(name);

    if (args) {
      this.arguments(args);
    }

    this.description(opts.description);

    opts.options?.forEach((o) => this.addOption(o));

    this.action(async (...actionArgs: any[]) => {
      logger.log('');

      const command = actionArgs.pop() as Command;
      const receivedOpts = actionArgs.pop();
      const receivedArgs = actionArgs;

      const parsedArgs: Record<string, any> = {};
      command.registeredArguments.forEach((arg, i) => {
        const argName = arg.name().replace(/-(\w)/g, (_, c) => c.toUpperCase());
        parsedArgs[argName] = receivedArgs[i];
      });

      try {
        const options = opts.schema.parse({ ...command.opts(), ...receivedOpts, ...parsedArgs });

        const needsClient = opts.needsClient === undefined ? 'unsealed' : opts.needsClient;

        const action = async () => {
          if (needsClient === false) {
            await (opts.action as ActionWithoutClient<z.infer<S>>)(options);
            return;
          }

          if (needsClient === 'any') {
            const credentials = await getCredentialsFromOpts(options);
            const vc = new Client({
              endpoint: credentials.endpointUrl,
              token: credentials.token,
            });
            await (opts.action as Action<z.infer<S>>)(options, vc);
            return;
          }

          // 'unsealed'
          const vc = await getUnsealedClient(options);
          await (opts.action as Action<z.infer<S>>)(options, vc);
        };

        await action();
      } catch (e) {
        handleError(e);
      }
    });
  }
}
