import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  NOT_EMITTED,
  OUTPUTS,
  PACKAGE_ROOT,
  expand,
  generate,
} from '../tooling/generate-tokens.mjs';
import design from '../design-tokens.json';
import decisions from '../design-decisions.json';
import { CSS_VARIABLES, PENDING_DESIGN_SIGNOFF, TOKENS_WITHOUT_DARK } from './tokens.js';

const read = (relative: string) => readFileSync(path.join(PACKAGE_ROOT, relative), 'utf8');
const tokensCss = read(OUTPUTS.css);
const baseCss = read('src/styles/base.css');

/** Every `--foo: bar;` declaration, in source order, with its block. */
function declarations(css: string) {
  const darkStart = css.indexOf("[data-theme='dark']");
  return [...css.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map((m) => ({
    name: m[1]!,
    value: m[2]!.trim(),
    dark: m.index! > darkStart,
  }));
}

const declared = declarations(tokensCss);

describe('generated output is reproducible', () => {
  // The mechanism that makes the JSON canonical. Without this, a hand-edit
  // to the generated CSS survives, and the "one source" claim is fiction.
  it('tokens.css on disk matches a fresh generator run', () => {
    expect(read(OUTPUTS.css)).toBe(generate(design, decisions).css);
  });

  it('tokens.ts on disk matches a fresh generator run', () => {
    expect(read(OUTPUTS.ts)).toBe(generate(design, decisions).ts);
  });
});

describe('the generator refuses to invent', () => {
  it('throws on a value shape it does not recognise rather than guessing', () => {
    expect(() => expand({ name: 'space.999', group: 'spacing', light: 'medium-ish' })).toThrow(
      /Cannot emit token "space\.999"/,
    );
  });

  it('names the escape hatch, so the fix is recorded rather than improvised', () => {
    expect(() => expand({ name: 'radius.huge', group: 'radius', light: 'quite round' })).toThrow(
      /NOT_EMITTED with a decision id/,
    );
  });

  it('refuses an unknown group outright', () => {
    expect(() => expand({ name: 'sound.click', group: 'audio', light: '440hz' })).toThrow(
      /unknown token group/,
    );
  });
});

describe('CSS and TypeScript describe the same set', () => {
  it('every declared custom property is exported from tokens.ts', () => {
    const light = declared.filter((d) => !d.dark).map((d) => d.name);
    expect([...CSS_VARIABLES].sort()).toEqual([...light].sort());
  });

  it('the dark block only ever overrides properties the light block declares', () => {
    const light = new Set(declared.filter((d) => !d.dark).map((d) => d.name));
    const orphans = declared.filter((d) => d.dark && !light.has(d.name)).map((d) => d.name);
    expect(orphans).toEqual([]);
  });
});

describe('what the design left undecided stays undecided', () => {
  it('emits every design token except the ones blocked by an open decision', () => {
    const missing = design.tokens
      .filter((token) => expand(token).length === 0)
      .map((token) => token.name);

    expect(missing.sort()).toEqual(Object.keys(NOT_EMITTED).sort());
  });

  it('every blocked token names the decision that blocks it', () => {
    for (const [name, reason] of Object.entries(NOT_EMITTED)) {
      expect(reason, `${name} must cite a decision`).toMatch(/\b(C1|D4|D5|D9|F9|§)\b|§/);
    }
  });

  it('leaves exactly the ten tokens the design gives no dark value', () => {
    expect(TOKENS_WITHOUT_DARK).toHaveLength(10);
    const darkNames = new Set(declared.filter((d) => d.dark).map((d) => d.name));
    for (const token of TOKENS_WITHOUT_DARK) {
      expect(darkNames.has(`--color-${token.replace(/\./g, '-')}`)).toBe(false);
    }
  });

  it('keeps provisional values visible until the design owner signs them off', () => {
    // D5's focus ring is emitted from a recorded decision, not from the
    // design. If this ever silently empties, a provisional value has been
    // promoted to canonical without anyone deciding to.
    expect(PENDING_DESIGN_SIGNOFF).not.toHaveLength(0);
    expect([...PENDING_DESIGN_SIGNOFF]).toEqual(
      decisions.tokens
        .filter((entry) => entry.signOff === 'required')
        .map((entry) => `${entry.name} (${entry.decision})`),
    );
  });
});

describe('reduced motion (§9.2, §10.7)', () => {
  const reduceBlock = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*)\n\}/.exec(
    baseCss,
  )?.[1];

  it('has a prefers-reduced-motion block at all', () => {
    expect(reduceBlock).toBeDefined();
  });

  it('collapses every duration token except the documented opacity cap', () => {
    // dur.instant is the exception on purpose: its stated value is 80ms,
    // which is exactly the cap §10.7 puts on opacity.
    const OPACITY_CAP = '--dur-instant';
    const durations = declared.filter((d) => !d.dark && d.name.startsWith('--dur-'));
    expect(durations.length).toBeGreaterThan(0);

    for (const duration of durations) {
      if (duration.name === OPACITY_CAP) {
        expect(reduceBlock).not.toContain(`${duration.name}:`);
        expect(duration.value).toBe('80ms');
        continue;
      }
      expect(reduceBlock, `${duration.name} must collapse`).toContain(`${duration.name}: 0ms;`);
    }
  });

  it('stops transforms and loops, not just durations', () => {
    expect(reduceBlock).toContain('transition-property: opacity !important;');
    expect(reduceBlock).toContain('animation-iteration-count: 1 !important;');
  });

  it('uses the token for the opacity cap rather than repeating 80ms', () => {
    expect(reduceBlock).toContain('transition-duration: var(--dur-instant) !important;');
  });
});
