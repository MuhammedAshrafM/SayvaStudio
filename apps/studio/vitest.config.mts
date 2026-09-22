import { defineConfig } from 'vitest/config';
import { react } from '@sayva/vitest-config/react';

/**
 * Component tests for `apps/studio` — PP-03.
 *
 * The same shared config `@sayva/design-system` spreads, and deliberately so:
 * the Phase 0 topology said "Vitest for domain/application; Playwright
 * scaffolded for app e2e", and this extends that rather than replacing it.
 * A second testing architecture in the app would mean two ways to write the
 * same accessibility assertion, which is what `@sayva/vitest-config` exists
 * to prevent. `react` already brings jsdom, the `.tsx` include glob,
 * `toHaveNoViolations` and DOM cleanup between tests.
 *
 * Two things differ from design-system, both because this is a Next app
 * rather than a library, and both worth stating so the next person does not
 * rediscover them:
 *
 * `.mts`, not `.ts`. `apps/studio` has no `"type": "module"` — Next owns
 * that choice — so a `.ts` config is loaded as CommonJS and the ESM `import`
 * lines above make the loader warn. The extension settles it without
 * touching the app's module type.
 */
export default defineConfig({
  ...react,
  /**
   * `@sayva/typescript-config/react-library` sets `jsx: "react-jsx"`, so the
   * test runner transforms JSX for design-system without being asked.
   * `nextjs.json` sets `jsx: "preserve"` instead — correct, because Next owns
   * that transform in a real build — which leaves the test runner's parser
   * staring at raw JSX and failing on the first `<`.
   *
   * So the automatic runtime is requested here, for tests only, and through
   * `oxc` rather than `esbuild`: this Vitest runs on rolldown-vite, which
   * says plainly that "esbuild options will be ignored" when both are set.
   * The Next config is untouched — `preserve` is right for what it configures.
   */
  oxc: { jsx: { runtime: 'automatic' } },
});
