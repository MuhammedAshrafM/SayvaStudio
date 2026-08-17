import { configureAxe } from 'vitest-axe';

/**
 * axe, configured for jsdom. Import this rather than vitest-axe's own `axe`.
 *
 * jsdom implements the DOM but not layout or paint, so axe's colour-contrast
 * rule cannot run: it needs computed pixel colours and reaches for
 * `HTMLCanvasElement.getContext()`, which jsdom does not implement. Left
 * enabled it prints "Not implemented: HTMLCanvasElement's getContext()" on
 * every run and then reports nothing — the worst combination, noise plus a
 * check that looks like it happened.
 *
 * Contrast is not going unchecked. It is covered far more thoroughly by the
 * AC3 token matrix in design-system's contrast.test.ts, which computes every
 * semantic pairing across all four surfaces in both themes directly from the
 * token values — something a rendered jsdom tree could never do, because
 * dark theme has never been rendered at all.
 *
 * So the division of labour is deliberate and stated here rather than
 * discovered later: this axe run checks structure, roles, names and ARIA;
 * contrast.test.ts checks colour.
 */
export const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
  },
});
