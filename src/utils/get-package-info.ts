import { type PackageJson } from 'type-fest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function getPackageInfo() {
  const packageJsonPath = getPackageFilePath('../package.json');

  return (await Bun.file(packageJsonPath).json()) as PackageJson;
}

function getPackageFilePath(filePath: string) {
  let distPath = fileURLToPath(new URL(`.`, import.meta.url));

  return path.resolve(distPath, filePath);
}
