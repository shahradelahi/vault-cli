import { promises } from 'fs';

export async function fsAccess(path: string): Promise<boolean> {
  try {
    await promises.access(path);
    return true;
  } catch (error) {
    return false;
  }
}
