import { base } from './base.js';

/**
 * Shared Vitest settings for packages that render React components.
 *
 * Everything from `base`, plus the three things a component test needs and a
 * node test does not: a DOM, `.tsx` files in the include glob, and a setup
 * file that registers the accessibility matcher and cleans the DOM between
 * tests. Consumers spread this into their own `defineConfig` call, the same
 * way they spread `base`.
 *
 * `setupFiles` is a package specifier rather than a path so it resolves
 * through the consumer's node_modules on every platform — a relative path
 * from this file would be wrong for the consumer, and an absolute one built
 * from import.meta.url breaks on Windows drive letters.
 */
export const react = {
  test: {
    ...base.test,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['@sayva/vitest-config/setup-react'],
  },
};
