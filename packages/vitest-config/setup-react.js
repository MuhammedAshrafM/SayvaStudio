import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';

/**
 * Runs before every component test file, via `@sayva/vitest-config/react`.
 *
 * Two conventions that are worth sharing rather than repeating per package:
 *
 * 1. `toHaveNoViolations`, so an accessibility assertion reads the same
 *    everywhere. AC3 and §16 make accessibility a build gate rather than a
 *    review note, and a gate is only as good as its ergonomics.
 * 2. `cleanup` after each test. Testing Library only auto-cleans when Vitest
 *    runs with `globals: true`; base.js deliberately sets `globals: false`,
 *    so without this every test would inherit the previous test's DOM and
 *    `getByRole` would start matching the wrong element.
 */
expect.extend(matchers);

afterEach(() => {
  cleanup();
});
