import { z } from 'zod';
import dotenv from 'dotenv';
import { isJson } from '@/utils/is-json.ts';
import { promises } from 'fs';

export const EnvTypeSchema = z.enum(['dotenv', 'json']);
export type EnvType = z.infer<typeof EnvTypeSchema>;

export async function getEnvFileType(envFile: string): Promise<EnvType> {
  const data = await promises.readFile(envFile, 'utf-8');
  if (isJson(data)) return 'json';
  if (isDotenv(data)) return 'dotenv';
  throw new Error(`Unable to determine the type of environment file ${envFile}`);
}

export function isDotenv(data: any): boolean {
  if (typeof data !== 'string') return false;
  try {
    dotenv.parse(data);
    return true;
  } catch (e) {
    return false;
  }
}
