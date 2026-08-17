import type { Preview } from '@storybook/react-vite';
import '../src/styles/index.css';

/**
 * Project-level annotations. Applied to the Storybook UI, and also to the
 * composed stories the Vitest suite renders — vitest.setup.ts feeds this
 * same object to `setProjectAnnotations`, so a story behaves identically in
 * both places rather than only looking right in the browser.
 *
 * A note on where accessibility gets checked, because the two halves cover
 * different ground:
 *
 *   Storybook (real browser)  addon-a11y runs the full axe rule set,
 *                             INCLUDING colour-contrast, because a browser
 *                             has layout and paint.
 *   Vitest (jsdom)            the same rules minus colour-contrast, which
 *                             jsdom cannot evaluate at all — see
 *                             @sayva/vitest-config/axe. Colour is covered
 *                             instead by the AC3 token matrix, which reaches
 *                             pairings no rendered tree could, dark theme
 *                             among them.
 */
const preview: Preview = {
  parameters: {
    a11y: {
      // `manual: true` is load-bearing, not a preference. Left at its
      // default, addon-a11y defers the scan to a test provider — the one
      // @storybook/addon-vitest installs — and this project deliberately
      // does not use that addon, gating on composed stories in Vitest
      // instead. The panel then sits on "Preparing accessibility scan"
      // indefinitely: verified, 25s+ with no result and no error. With
      // `manual` the addon runs in the browser itself and reports on load.
      manual: true,
      // Applies only once a test provider exists. Harmless now, and correct
      // the day @storybook/addon-vitest is adopted.
      test: 'error',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
