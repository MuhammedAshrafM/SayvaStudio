import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The stylesheet's public surface — ADR-002 DR-16.
 *
 * `src/styles/index.css` calls itself "the single file a consumer imports
 * to get Sayva Studio's visual language", and for a while no consumer could
 * import it: DR-05 resolves only the declared public surface, and the
 * `exports` map declared `"."` alone. The `./styles` entry is what closed
 * that, and these tests exist so it cannot be closed again by accident.
 *
 * Resolution here goes through Node's own `exports` handling by
 * self-reference, not by reading `package.json` and trusting it. That is
 * the point: a consumer resolves the same way, so a test that resolves
 * proves the surface works rather than that it is spelled correctly.
 */

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '..', '..');
const manifest = JSON.parse(readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as {
  exports: Record<string, unknown>;
  scripts: Record<string, string>;
};

describe('the `./styles` export', () => {
  it('resolves the way a consumer resolves it', () => {
    const resolved = fileURLToPath(import.meta.resolve('@sayva/design-system/styles'));

    expect(resolved).toBe(path.join(PACKAGE_ROOT, 'src', 'styles', 'index.css'));
    expect(existsSync(resolved)).toBe(true);
  });

  it('points at source, never at dist — the DR-16 exception', () => {
    // DR-14 gives `exports["."]` a `types` → source / `default` → dist
    // split. CSS cannot honour that: there is no compiled artifact, and
    // Tailwind v4 is source-consumed because the consumer's build has to
    // scan the consumer's own files. A `./styles` entry pointing into
    // `dist` would mean someone had built a stylesheet that can only
    // contain the utilities this package itself uses.
    expect(manifest.exports['./styles']).toBe('./src/styles/index.css');
    expect(String(manifest.exports['./styles'])).not.toContain('dist');
  });

  it('is a single target, not a conditions object', () => {
    expect(typeof manifest.exports['./styles']).toBe('string');
  });

  it('builds no CSS — the artifact stays source', () => {
    // `tsc -b` emits JavaScript and declarations. If the build script ever
    // grows a CSS step, DR-16's reasoning has been reversed without the
    // amendment being revisited.
    expect(manifest.scripts.build).toBe('tsc -b');
  });
});

describe('the surface stays exactly as wide as it was declared', () => {
  it('exposes the barrel and the stylesheet, and nothing else', () => {
    expect(Object.keys(manifest.exports).sort()).toEqual(['.', './styles']);
  });

  it.each([
    'src/styles/tokens.css',
    'src/styles/base.css',
    'src/index.ts',
    'src/primitives/button/button.tsx',
    'dist/index.js',
  ])('refuses the deep path %s', (deep) => {
    // DR-05 after the widening: still only the declared surface resolves.
    // Widening to two entries did not open the package up.
    expect(() => import.meta.resolve(`@sayva/design-system/${deep}`)).toThrow();
  });
});

describe('what the stylesheet actually delivers', () => {
  const css = readFileSync(path.join(PACKAGE_ROOT, 'src', 'styles', 'index.css'), 'utf8');

  it.each([
    ['tailwindcss', "@import 'tailwindcss';"],
    ['the generated token layer', "@import './tokens.css';"],
    ['the hand-authored base rules', "@import './base.css';"],
  ])('pulls in %s', (_label, directive) => {
    // A consumer importing `./styles` and getting a file that no longer
    // reaches the token layer still builds and still links a stylesheet —
    // it just has nothing in it. Measured while wiring Studio up: the app's
    // CSS went from 24,089 bytes to 5,539 when the sources went unscanned,
    // because `@theme` emits a custom property only when some generated
    // utility uses it. Silence, not an error.
    expect(css).toContain(directive);
  });
});
