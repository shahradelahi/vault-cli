import { Client } from '@litehex/node-vault';

export async function doesSecretPathExist(vc: Client, path: string): Promise<boolean> {
  try {
    await vc.read({ path });
    return true;
  } catch (e) {
    return false;
  }
}
