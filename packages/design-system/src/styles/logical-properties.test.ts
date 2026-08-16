import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Foundations §15.10 — "All spacing uses logical properties (inline-start,
 * not left) so RTL is a document attribute, not a stylesheet fork."
 *
 * `sayva/logical-properties` already enforces this on Tailwind class strings
 * in .ts/.tsx. It cannot see .css, because ESLint does not lint CSS — which
 * left every hand-authored stylesheet unchecked.
 *
 * Rather than adding Stylelint for one rule over three files, this closes
 * the gap with the test runner the package already has. It scans every
 * stylesheet the package ships, so a future hand-authored file is covered
 * the moment it appears rather than when someone remembers to add it.
 */

const STYLES_DIR = path.resolve(import.meta.dirname);

/** Physical-direction declarations, each with the logical form that replaces it. */
const PHYSICAL: ReadonlyArray<readonly [RegExp, string]> = [
  [
    /(?:^|[\s;{])(?:margin|padding)-(?:left|right)\s*:/gm,
    'margin/padding-inline-start | -inline-end',
  ],
  [/(?:^|[\s;{])(?:left|right)\s*:/gm, 'inset-inline-start | inset-inline-end'],
  [/(?:^|[\s;{])border-(?:left|right)(?:-[\w-]+)?\s*:/gm, 'border-inline-start | -inline-end'],
  [
    /(?:^|[\s;{])border-(?:top|bottom)-(?:left|right)-radius\s*:/gm,
    'border-start-start-radius etc.',
  ],
  [/text-align\s*:\s*(?:left|right)\b/gm, 'text-align: start | end'],
  [/float\s*:\s*(?:left|right)\b/gm, 'float: inline-start | inline-end'],
  [
    /(?:^|[\s;{])(?:scroll-margin|scroll-padding)-(?:left|right)\s*:/gm,
    'scroll-*-inline-start | -inline-end',
  ],
];

/** Comments are prose; "the pane on the left" is not a declaration. */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const stylesheets = readdirSync(STYLES_DIR)
  .filter((file) => file.endsWith('.css'))
  .map((file) => ({ file, css: stripComments(readFileSync(path.join(STYLES_DIR, file), 'utf8')) }));

describe('§15.10 — stylesheets use logical properties only', () => {
  it('finds the stylesheets it is meant to be checking', () => {
    // A silent zero-file scan would pass forever. Name what must be present.
    expect(stylesheets.map((s) => s.file).sort()).toEqual(['base.css', 'index.css', 'tokens.css']);
  });

  it.each(stylesheets.map((s) => s.file))('%s declares no physical direction', (file) => {
    const { css } = stylesheets.find((s) => s.file === file)!;
    const violations = PHYSICAL.flatMap(([pattern, replacement]) =>
      [...css.matchAll(pattern)].map((match) => `${match[0].trim()} — use ${replacement}`),
    );
    expect(violations).toEqual([]);
  });
});
