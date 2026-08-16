import { describe, expect, it } from 'vitest';
import design from '../design-tokens.json';
import decisions from '../design-open-decisions.json';

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
 * These are DOCUMENTED DESIGN GAPS, not implementation defects and not
 * regressions. Each is a property of a token value the design froze, is
 * recorded against decision D11 in design-open-decisions.json, and may only
 * be closed by the design owner — changing a value here to make the matrix
 * pass is a design change, which AC13 fails.
 *
 * Pinned in both directions: a pairing that starts failing is a regression,
 * and a pairing that stops failing means a value moved. Either fails the
 * build, because either means something changed that nobody recorded.
 */
const DOCUMENTED_GAPS: Readonly<Record<string, { ratio: number; concern: string }>> = {
  // WCAG 1.4.11 covers input borders and focusable edges at 3:1, which is
  // what §10.1 names border.strong for. §16 only ever claims 3:1 via
  // icon.subtle, so this may be deliberate — but it is said out loud here
  // rather than discovered during an audit later.
  'light|border.strong|surface.canvas': { ratio: 1.42, concern: 'border.strong' },
  'light|border.strong|surface.default': { ratio: 1.56, concern: 'border.strong' },
  'light|border.strong|surface.subtle': { ratio: 1.49, concern: 'border.strong' },
  'light|border.strong|surface.selected': { ratio: 1.39, concern: 'border.strong' },
  'dark|border.strong|surface.canvas': { ratio: 2.12, concern: 'border.strong' },
  'dark|border.strong|surface.default': { ratio: 1.93, concern: 'border.strong' },
  'dark|border.strong|surface.subtle': { ratio: 1.76, concern: 'border.strong' },
  'dark|border.strong|surface.selected': { ratio: 1.61, concern: 'border.strong' },

  // §10.1 states 4.6:1 here and §16 insists a disabled control must still be
  // readable. The values give 4.47, just under AA.
  'light|control.disabled.fg|control.disabled.bg': { ratio: 4.47, concern: 'control.disabled.fg' },
  'dark|control.disabled.fg|control.disabled.bg': { ratio: 4.36, concern: 'control.disabled.fg' },

  // §10.1 claims text.tertiary "passes AA on every ground in the system".
  // True in light (worst case 4.75); false on the dark selected surface.
  // Consistent with audit F10 — dark has never been drawn or exercised.
  'dark|text.tertiary|surface.selected': { ratio: 4.31, concern: 'text.tertiary' },
};

describe('AC3 — contrast across every semantic pairing, both themes', () => {
  it('checks a pairing for every foreground on every surface', () => {
    // 6 foregrounds x 4 surfaces x 2 themes, plus 6 tinted pairs x 2 themes.
    expect(everyPairing()).toHaveLength(60);
  });

  it('clears the floor on every pairing that is not a documented gap', () => {
    const regressions = everyPairing()
      .filter((row) => row.ratio < row.floor && !(row.key in DOCUMENTED_GAPS))
      .map((row) => `${row.key} = ${round(row.ratio)}:1, floor ${row.floor}:1`);

    // A failure here is a REGRESSION: a pairing nobody has accepted has
    // dropped below its floor. It is not covered by D11 and must not be
    // added to DOCUMENTED_GAPS without a design ruling.
    expect(regressions, 'contrast regression — pairings below floor with no design ruling').toEqual(
      [],
    );
  });

  it('still fails exactly the documented gaps, and no others', () => {
    // The other direction: a gap that quietly stops failing means a token
    // value moved. That is just as much a change nobody recorded.
    const failing = everyPairing()
      .filter((row) => row.ratio < row.floor)
      .map((row) => row.key)
      .sort();
    expect(failing).toEqual(Object.keys(DOCUMENTED_GAPS).sort());
  });

  it('holds each documented gap at its recorded ratio', () => {
    const measured = Object.fromEntries(everyPairing().map((row) => [row.key, round(row.ratio)]));
    for (const [key, gap] of Object.entries(DOCUMENTED_GAPS)) {
      expect(measured[key], `${key} (D11, ${gap.concern})`).toBeCloseTo(gap.ratio, 2);
    }
  });

  it('ties every documented gap to a concern recorded under D11', () => {
    const d11 = decisions.decisions.find((entry) => entry.id === 'D11');
    expect(d11?.status, 'D11 must still be open while these gaps stand').toBe('open');

    const registered = new Set(d11!.pairings!.flatMap((pairing) => pairing.tokens));
    const unregistered = [
      ...new Set(Object.values(DOCUMENTED_GAPS).map((gap) => gap.concern)),
    ].filter((concern) => !registered.has(concern));

    expect(unregistered, 'a gap is pinned here but not recorded in D11').toEqual([]);
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
