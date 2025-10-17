import { describe, expect, it } from 'vitest';

import { readKV2Path } from '@/lib/vault';

describe('readKV2Path', () => {
  it('should parse a valid KV2 path', () => {
    const path = 'secret/my-app/production';
    const result = readKV2Path(path);
    expect(result).toEqual({
      mountPath: 'secret',
      path: 'my-app/production',
    });
  });

  it('should throw an error for a path without a slash', () => {
    const path = 'secret';
    expect(() => readKV2Path(path)).toThrow('Path is not a valid KV2 path. Got: secret');
  });

  it('should throw an error for a path with no mount path', () => {
    const path = '/';
    expect(() => readKV2Path(path)).toThrow('Path is not a valid KV2 path. Got: /');
  });

  it('should handle paths with leading and trailing slashes', () => {
    const path = '/secret/my-app/production/';
    const result = readKV2Path(path);
    expect(result).toEqual({
      mountPath: 'secret',
      path: 'my-app/production',
    });
  });
});
