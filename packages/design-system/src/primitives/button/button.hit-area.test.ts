import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from 'tailwindcss';
import { HIT_AREA_TOKENS, SIZE_HEIGHT_TOKENS, buttonVariants } from './button.variants.js';

/**
 * §16 requires a 32px hit area and 44px on touch. button.sm is 28px tall, so
 * the smallest size cannot meet the floor with its own height — the target
 * is carried by a centred ::after instead.
 *
 * This compiles the button's real classes through Tailwind rather than
 * asserting on class strings, because a class string can look right and
 * still resolve to the wrong length. Everything below is read out of the
 * generated CSS, including the token values themselves, so nothing here
 * needs to import design-tokens.json — which components and their tests are
 * forbidden from doing (DR-15).
 */

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '../../..');
const ENTRY = path.join(PACKAGE_ROOT, 'src/styles/index.css');
const NODE_MODULES = path.join(PACKAGE_ROOT, 'node_modules');

async function compileClasses(classes: string): Promise<string> {
  const compiler = await compile(readFileSync(ENTRY, 'utf8'), {
    base: path.dirname(ENTRY),
    loadStylesheet: async (id, base) => {
      const file = id.startsWith('.')
        ? path.resolve(base, id)
        : path.join(NODE_MODULES, id, 'index.css');
      return { path: file, base: path.dirname(file), content: readFileSync(file, 'utf8') };
    },
  });
  return compiler.build(classes.split(/\s+/).filter(Boolean));
}

/**
 * The generated token layer, read as source rather than from the compiled
 * output. Tailwind only emits a custom property that some utility actually
 * references, so resolving against the build would turn "this length is too
 * small" into "this variable is missing" the moment a class stopped using
 * it — a true failure with a misleading message.
 */
const TOKENS_CSS = readFileSync(path.join(PACKAGE_ROOT, 'src/styles/tokens.css'), 'utf8');

/** Resolves `var(--x)` or a literal to a px number. */
function resolvePx(value: string): number {
  const variable = /var\((--[\w-]+)\)/.exec(value);
  if (variable) {
    const declared = new RegExp(`${variable[1]!}:\\s*([\\d.]+)px`).exec(TOKENS_CSS)?.[1];
    if (!declared) throw new Error(`Token ${variable[1]} declares no px length`);
    return Number(declared);
  }
  const literal = /([\d.]+)px/.exec(value)?.[1];
  if (!literal) throw new Error(`Could not resolve "${value}" to a px length`);
  return Number(literal);
}

/** The declaration a rule sets, whichever spelling Tailwind emitted. */
function declaration(css: string, selectorFragment: string, properties: string[]): string {
  const escaped = selectorFragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = new RegExp(`${escaped}[^{]*\\{([^}]*)\\}`).exec(css);
  if (!rule) throw new Error(`No rule matched "${selectorFragment}"`);
  for (const property of properties) {
    const found = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`).exec(rule[1]!);
    if (found) return found[1]!.trim();
  }
  throw new Error(`Rule "${selectorFragment}" sets none of ${properties.join(', ')}`);
}

/**
 * The smallest length any ::after rule floors the target to, whatever token
 * it happens to reference. Deliberately not keyed on a specific variable
 * name: the question is how big the target actually is, so pointing the
 * class at a smaller token has to surface as a number, not as a missing
 * selector.
 */
function smallestAfterFloor(css: string, properties: string[]): number {
  const floors: number[] = [];
  for (const rule of css.matchAll(/([^{}]*::after[^{]*)\{([^}]*)\}/g)) {
    for (const property of properties) {
      const found = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`).exec(rule[2]!);
      if (found) floors.push(resolvePx(found[1]!.trim()));
    }
  }
  if (floors.length === 0) {
    throw new Error(`No ::after rule sets any of ${properties.join(', ')} — the hit area is gone`);
  }
  return Math.min(...floors);
}

const SIZES = ['sm', 'md', 'lg'] as const;

describe('SyButton hit area (§16: 32px, 44px on touch)', () => {
  it.each(SIZES)('%s clears the pointer floor', async (size) => {
    const css = await compileClasses(buttonVariants({ size }));
    const floor = resolvePx(`var(--${HIT_AREA_TOKENS.pointer.replace('.', '-')})`);

    const vertical = smallestAfterFloor(css, ['min-height', 'min-block-size']);
    const horizontal = smallestAfterFloor(css, ['min-width', 'min-inline-size']);

    expect(floor, 'hit.min must be the 32px §16 states').toBe(32);
    expect(vertical, `${size} vertical hit area (px)`).toBeGreaterThanOrEqual(floor);
    expect(horizontal, `${size} horizontal hit area (px)`).toBeGreaterThanOrEqual(floor);
  });

  it('raises the target on touch pointers', async () => {
    const css = await compileClasses(buttonVariants({ size: 'md' }));
    const pointerFloor = resolvePx('var(--hit-min)');
    const touchFloor = resolvePx('var(--hit-touch)');

    expect(touchFloor).toBe(44);
    expect(touchFloor).toBeGreaterThan(pointerFloor);
    expect(css).toMatch(/pointer:\s*coarse/);
  });

  it.each(SIZES)('%s draws its visual height from its design token', async (size) => {
    const css = await compileClasses(buttonVariants({ size }));
    const token = `--${SIZE_HEIGHT_TOKENS[size].replace('.', '-')}`;
    const height = declaration(css, `h-\\[var\\(${token}\\)\\]`, ['height', 'block-size']);
    expect(resolvePx(height)).toBe(resolvePx(`var(${token})`));
  });

  it('keeps the smallest size visually below its own hit area, on purpose', () => {
    // button.sm is 28px while the target is 32px — the reason the ::after
    // expansion exists at all. If these ever coincide, either a token moved
    // or the expansion was dropped, and both are worth knowing about.
    expect(resolvePx('var(--button-sm)')).toBeLessThan(resolvePx('var(--hit-min)'));
  });
});
