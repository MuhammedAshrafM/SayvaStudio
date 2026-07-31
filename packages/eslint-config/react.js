import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import baseConfig from './base.js';

/**
 * Base rules plus React/JSX linting for any package that ships components
 * (design-system, and later the studio app's own next.js preset).
 */
export default [
  ...baseConfig,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  {
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs['recommended-latest'].rules,
  },
  {
    plugins: { 'jsx-a11y': jsxA11y },
    rules: jsxA11y.configs.recommended.rules,
  },
  {
    settings: {
      react: { version: 'detect' },
    },
  },
];
