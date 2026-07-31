import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

/**
 * Shared base rules for every Sayva Studio package.
 * Consumers spread this array and append their own overrides.
 */
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/.next/**', '**/.turbo/**', '**/node_modules/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
);
