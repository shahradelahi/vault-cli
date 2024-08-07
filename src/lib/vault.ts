import { Client } from '@litehex/node-vault';

export async function doesSecretPathExist(vc: Client, path: string): Promise<boolean> {
  try {
    const { mountPath, path: secretPath } = readKV2Path(path);
    const res = await vc.kv2.read({
      mountPath,
      path: secretPath,
    });
    return !('errors' in res);
  } catch (e) {
    return false;
  }
}

export function readKV2Path(path: string): {
  mountPath: string;
  path: string;
} {
  if (!path.includes('/')) {
    throw new Error('Path is not a valid KV2 path. Got: ' + path);
  }

  const [mountPath, ...rest] = path.split('/').filter((p) => p.length > 0);

  if (!mountPath || mountPath.length === 0) {
    throw new Error('Path is not a valid KV2 path. Got: ' + path);
  }

  return {
    mountPath,
    path: rest.join('/'),
  };
}

export async function hasEngine(vc: Client, mountPath: string): Promise<boolean> {
  const res = await vc.engineInfo({ mountPath });
  return !('errors' in res);
}
