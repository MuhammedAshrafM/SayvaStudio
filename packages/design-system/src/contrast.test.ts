import { describe, expect, it } from 'vitest';
import design from '../design-tokens.json';

/**
 * AC3 — "CI asserts every semantic pairing on canvas, default, subtle and
 * selected surfaces in both themes, at AA minimum and 3:1 for non-text."
 * Foundations §16 makes AA the floor and AAA the target for body text.
 *
 * Ratios are computed from design-tokens.json, which is why token values
 * live in JSON rather than in TypeScript: this file needs the numbers, and
 * components must never be able to reach them.
 */

type Theme = 'light' | 'dark';

const byName = new Map(design.tokens.map((token) => [token.name, token]));

function value(name: string, theme: Theme): string {
  const token = byName.get(name);
  if (!token) throw new Error(`Unknown token: ${name}`);
  const hex = theme === 'light' ? token.light : token.dark;
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    throw new Error(`Token ${name} has no ${theme} colour (${JSON.stringify(hex)})`);
  }
  return hex;
}

/** WCAG 2.2 relative luminance. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

const round = (n: number) => Math.round(n * 100) / 100;

const SURFACES = [
  'surface.canvas',
  'surface.default',
  'surface.subtle',
  'surface.selected',
] as const;

const AA_TEXT = 4.5;
const NON_TEXT = 3.0;

/** Every pairing the design puts on a surface, with the floor it must clear. */
const ON_SURFACE: ReadonlyArray<readonly [string, number]> = [
  ['text.primary', AA_TEXT],
  ['text.secondary', AA_TEXT],
  ['text.tertiary', AA_TEXT],
  ['icon.subtle', NON_TEXT],
  ['border.strong', NON_TEXT],
  // base.css paints the focus ring with accent.default (§16), so it must
  // stay distinguishable on every ground it can land on. Also the primary
  // action fill and the selection accent.
  ['accent.default', NON_TEXT],
];

/** Tinted grounds, where the triplet supplies its own background. */
const PAIRED: ReadonlyArray<readonly [string, string, number]> = [
  ...(['neutral', 'success', 'warning', 'danger', 'info'] as const).map(
    (family) => [`status.${family}.fg`, `status.${family}.bg`, AA_TEXT] as const,
  ),
  ['control.disabled.fg', 'control.disabled.bg', AA_TEXT],
];

function everyPairing() {
  const rows: { key: string; ratio: number; floor: number }[] = [];
  for (const theme of ['light', 'dark'] as const) {
    for (const [fg, floor] of ON_SURFACE) {
      for (const bg of SURFACES) {
        rows.push({
          key: `${theme}|${fg}|${bg}`,
          ratio: contrast(value(fg, theme), value(bg, theme)),
          floor,
        });
      }
    }
    for (const [fg, bg, floor] of PAIRED) {
      rows.push({
        key: `${theme}|${fg}|${bg}`,
        ratio: contrast(value(fg, theme), value(bg, theme)),
        floor,
      });
    }
  }
  return rows;
}

/**
 * Pairings in the frozen design that do not clear their floor.
 *
 * Pinned rather than excused: the set below must match the measured set
 * exactly, so a new failure fails the build AND a fix fails the build until
 * this list is updated. Decision D11 — none of these may be resolved by
 * changing a token value here; that is a design change (AC13).
 */
const KNOWN_GAPS: Readonly<Record<string, number>> = {
  // border.strong is an input border and a focusable edge, which WCAG 1.4.11
  // covers at 3:1. §16 only ever claims 3:1 via icon.subtle, so this may be
  // deliberate — but it needs to be said out loud, not discovered later.
  'light|border.strong|surface.canvas': 1.42,
  'light|border.strong|surface.default': 1.56,
  'light|border.strong|surface.subtle': 1.49,
  'light|border.strong|surface.selected': 1.39,
  'dark|border.strong|surface.canvas': 2.12,
  'dark|border.strong|surface.default': 1.93,
  'dark|border.strong|surface.subtle': 1.76,
  'dark|border.strong|surface.selected': 1.61,

  // §10.1 states 4.6:1 here and §16 insists "a disabled control must still
  // be readable". The values give 4.47, just under AA.
  'light|control.disabled.fg|control.disabled.bg': 4.47,
  'dark|control.disabled.fg|control.disabled.bg': 4.36,

  // §10.1 claims text.tertiary "passes AA on every ground in the system".
  // True in light (worst case 4.75); false on the dark selected surface.
  // Consistent with audit F10 — dark has never been drawn or exercised.
  'dark|text.tertiary|surface.selected': 4.31,
};

describe('AC3 — contrast across every semantic pairing, both themes', () => {
  it('checks a pairing for every foreground on every surface', () => {
    // 6 foregrounds x 4 surfaces x 2 themes, plus 6 tinted pairs x 2 themes.
    expect(everyPairing()).toHaveLength(60);
  });

  it('flags exactly the pairings recorded as known gaps — no more, no fewer', () => {
    const failing = everyPairing()
      .filter((row) => row.ratio < row.floor)
      .map((row) => row.key)
      .sort();
    expect(failing).toEqual(Object.keys(KNOWN_GAPS).sort());
  });

  it('holds each known gap at its recorded ratio, so a value change is caught', () => {
    const measured = Object.fromEntries(everyPairing().map((row) => [row.key, round(row.ratio)]));
    for (const [key, ratio] of Object.entries(KNOWN_GAPS)) {
      expect(measured[key], key).toBeCloseTo(ratio, 2);
    }
  });

  it('clears the floor everywhere else', () => {
    for (const row of everyPairing()) {
      if (row.key in KNOWN_GAPS) continue;
      expect(row.ratio, `${row.key} must clear ${row.floor}:1`).toBeGreaterThanOrEqual(row.floor);
    }
  });
});

describe("the design's own stated contrast figures", () => {
  /** Figures §10.1 states in prose, against what the values actually give. */
  const STATED: ReadonlyArray<readonly [string, string, number, number]> = [
    ['text.primary', 'surface.default', 15.3, 17.4],
    ['text.secondary', 'surface.default', 8.9, 8.86],
    ['text.tertiary', 'surface.default', 5.4, 5.33],
    ['control.disabled.fg', 'control.disabled.bg', 4.6, 4.47],
  ];

  it('computes the ratio the tokens actually produce', () => {
    for (const [fg, bg, , computed] of STATED) {
      expect(round(contrast(value(fg, 'light'), value(bg, 'light'))), `${fg} on ${bg}`).toBeCloseTo(
        computed,
        2,
      );
    }
  });

  it('records where the stated figure and the computed one disagree', () => {
    // Documentation accuracy, not an implementation defect — but a stated
    // figure nobody has checked is how a token gets trusted for the wrong
    // reason. text.primary is comfortably above AA either way;
    // control.disabled.fg is not, which is why it also appears in D11.
    const disagreements = STATED.filter(
      ([, , stated, computed]) => Math.abs(stated - computed) > 0.1,
    )
      .map(([fg]) => fg)
      .sort();
    expect(disagreements).toEqual(['control.disabled.fg', 'text.primary']);
  });
});
