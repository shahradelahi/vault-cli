import { access } from 'node:fs/promises';

export async function fsAccess(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    return false;
  }
}
