import { Client } from '@litehex/node-vault';

export async function doesSecretPathExist(vc: Client, path: string): Promise<boolean> {
  try {
    const { mountPath, path: secretPath } = readKV2Path(path);
    await vc.kv2.read({
      mountPath,
      path: secretPath
    });
    return true;
  } catch (e) {
    return false;
  }
}

export function readKV2Path(path: string): {
  mountPath: string;
  path: string;
} {
  if (!path.includes('/')) {
    throw new Error('Given path is not a valid KV2 path');
  }

  const [mountPath, ...rest] = path.split('/');
  const _path = rest.join('/');

  return {
    mountPath,
    path: _path
  };
}
