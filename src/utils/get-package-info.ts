import { promises } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type PackageJson } from 'type-fest';

import { isJson } from '@/utils/is-json.ts';

export async function getPackageInfo() {
  const packageJsonPath = getPackageFilePath('../package.json');

  const content = await promises.readFile(packageJsonPath, 'utf-8');
  if (!content || !isJson(content)) {
    throw new Error('Invalid package.json file');
  }

  return JSON.parse(content) as PackageJson;
}

function getPackageFilePath(filePath: string) {
  const distPath = fileURLToPath(new URL(`.`, import.meta.url));

  return path.resolve(distPath, filePath);
}
