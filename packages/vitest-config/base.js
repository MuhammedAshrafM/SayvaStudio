/**
 * Shared Vitest settings for every Sayva Studio package that has tests.
 * Consumers spread this into their own `defineConfig` call, same pattern
 * as @sayva/eslint-config and @sayva/typescript-config — one canonical
 * place for conventions that would otherwise drift between packages.
 *
 * Not part of the ADR-002 package graph (tooling/dependency-graph.mjs):
 * exempt for the same reason those two are — this is shared root-level
 * config, not a Clean Architecture layer.
 */
export const base = {
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // A package that wires up testing but has zero test files should
    // fail loudly, not report a silent, meaningless pass.
    passWithNoTests: false,
    globals: false,
  },
};
