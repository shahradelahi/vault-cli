import { defineConfig } from '@shahrad/eslint-config';
import globals from 'globals';

export default defineConfig(
  {
    ignores: ['dist/**', 'examples-DONT_REMOVE/**'],
  },

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-console': 'error',
    },
  }
);
