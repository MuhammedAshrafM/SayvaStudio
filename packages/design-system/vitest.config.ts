import { defineConfig } from 'vitest/config';
import { react } from '@sayva/vitest-config/react';

export default defineConfig({
  ...react,
  test: {
    ...react.test,
    // The shared React setup first, then this package's Storybook wiring —
    // order matters, since setProjectAnnotations expects the test globals
    // the shared setup installs.
    setupFiles: [...react.test.setupFiles, './vitest.setup.ts'],
  },
});
