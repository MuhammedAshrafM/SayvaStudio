/**
 * Generates the token layer (DR-15).
 *
 *   design-tokens.json      93 tokens, a faithful projection of the design
 *   design-decisions.json   values the design states in prose but never
 *                           tokenised, each carrying its decision id
 *        |
 *        +--> src/styles/tokens.css   Tailwind v4 @theme + dark overrides
 *        +--> src/tokens.ts           names and types, never values
 *
 * Two rules govern everything below.
 *
 * 1. It never invents. A value shape this file does not recognise is a
 *    throw, not a guess — AC13 fails any element with no design source, and
 *    a generator that quietly copes is how one gets past review.
 * 2. It never emits a value the design has not decided. Tokens the design
 *    left unspecified or conflicted are listed in NOT_EMITTED with the open
 *    decision that blocks them, and the parity test asserts that list is
 *    exactly what is missing from the CSS.
 *
 * `generate()` is pure so the regenerate-and-diff test can call it and
 * compare against what is on disk. The CLI at the bottom writes the files.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const BANNER = (source) => `/*
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by tooling/generate-tokens.mjs from ${source}.
 * Hand-edits are reverted by the regenerate-and-diff test, which is
 * authoritative for this file's contents. To change a value: change the
 * design, re-ingest, re-run \`pnpm --filter @sayva/design-system tokens:generate\`.
 */`;

/** Groups whose members are colours and map onto Tailwind's --color-* namespace. */
const COLOUR_GROUPS = new Set([
  'surface',
  'border',
  'color',
  'control-state',
  'icon',
  'semantic-state',
  'visualisation',
]);

/** Placeholders the inventory uses where a value does not exist. */
const ABSENT = new Set(['n/a', 'UNSPECIFIED BY DESIGN', '', null, undefined]);

/**
 * Tokens that deliberately produce no custom property, each naming the open
 * decision that blocks it. Nothing may be added here without a decision id.
 */
export const NOT_EMITTED = {
  'row.compact':
    'C1 / D4 — Foundations §15 states 28px, the Design System density prop states 26px. Both canonical; the design owner must pick.',
  'focus.ring':
    'F9 / D5 — UNSPECIFIED BY DESIGN as a token. §16 states the rule in prose ("a 2px accent ring with a 2px offset, never removed") but the design carries no focus.ring.{color,width,offset} trio, and tokenising one was reverted. base.css implements the rule from --color-accent-default; the two 2px figures stay literals there until the design owner tokenises them.',
  'ease.standard':
    'D9 — the stated value `cubic(.2,0,0,1)` is not a CSS function. Expanding it to cubic-bezier() preserves all four control points but is an interpretation of a malformed value, so it awaits confirmation.',
  'ease.exit': 'D9 — as ease.standard, for `cubic(.4,0,1,1)`.',
  'bp.sm':
    'Not a min-width. §10.9 defines bp.sm as "< 900px", the base range below --breakpoint-md; it has no threshold of its own to emit.',
};

const dashed = (name) => name.replace(/\./g, '-');
const lastSegment = (name) => name.slice(name.lastIndexOf('.') + 1);

/** `28/1.15 700` — the notation §10.3's own column header defines. */
const TYPE_SPEC = /^([\d.]+)\/([\d.]+)\s+(\d+)$/;
/** `208–360px`, en dash per the source. */
const PX_RANGE = /^([\d.]+)[–-]([\d.]+)px$/;
/** `1280–1727px` or `≥ 1728px` — both state the range's lower bound. */
const BP_LOWER = /^(?:≥\s*)?([\d.]+)(?:[–-][\d.]+)?px$/;
const PX = /^[\d.]+px$/;
const MS = /^[\d.]+ms$/;

/**
 * Expands one design token into the custom properties that carry it.
 * Returns [] for tokens listed in NOT_EMITTED. Throws on anything else it
 * cannot parse, rather than emitting a guess.
 */
export function expand(token) {
  const { name, group, light, dark } = token;
  if (name in NOT_EMITTED) return [];

  const fail = (why) => {
    throw new Error(
      `Cannot emit token "${name}" (group ${group}): ${why}. Value: ${JSON.stringify(light)}. Add it to NOT_EMITTED with a decision id, or fix the source.`,
    );
  };

  if (COLOUR_GROUPS.has(group)) {
    if (typeof light !== 'string' || !light.startsWith('#')) fail('expected a hex colour');
    return [
      {
        cssVar: `--color-${dashed(name)}`,
        light,
        dark: ABSENT.has(dark) ? null : dark,
      },
    ];
  }

  if (group === 'typography') {
    const match = TYPE_SPEC.exec(light);
    if (!match) fail('expected `size/line-height weight`');
    const [, size, lineHeight, weight] = match;
    const base = `--text-${dashed(name)}`;
    return [
      { cssVar: base, light: `${size}px`, dark: null },
      { cssVar: `${base}--line-height`, light: lineHeight, dark: null },
      { cssVar: `${base}--font-weight`, light: weight, dark: null },
    ];
  }

  if (group === 'spacing') {
    if (!PX.test(light)) fail('expected a px length');
    return [{ cssVar: `--spacing-${lastSegment(name)}`, light, dark: null }];
  }

  if (group === 'radius') {
    if (!PX.test(light)) fail('expected a px length');
    return [{ cssVar: `--radius-${lastSegment(name)}`, light, dark: null }];
  }

  if (group === 'elevation') {
    // `none` and `0 1px 2px rgba(...)` are both valid box-shadow values.
    return [{ cssVar: `--shadow-${dashed(name)}`, light, dark: null }];
  }

  if (group === 'motion') {
    if (!MS.test(light)) fail('expected a ms duration');
    return [{ cssVar: `--dur-${lastSegment(name)}`, light, dark: null }];
  }

  if (group === 'breakpoint') {
    const match = BP_LOWER.exec(light);
    if (!match) fail('expected a px range or a `≥ Npx` lower bound');
    return [{ cssVar: `--breakpoint-${lastSegment(name)}`, light: `${match[1]}px`, dark: null }];
  }

  if (group === 'sizing') {
    const range = PX_RANGE.exec(light);
    if (range) {
      // A resizable pane states both ends. Collapsing them to one number
      // would mean choosing a default the design never gave.
      return [
        { cssVar: `--${dashed(name)}-min`, light: `${range[1]}px`, dark: null },
        { cssVar: `--${dashed(name)}-max`, light: `${range[2]}px`, dark: null },
      ];
    }
    if (!PX.test(light)) fail('expected a px length or a px range');
    return [{ cssVar: `--${dashed(name)}`, light, dark: null }];
  }

  return fail('unknown token group');
}

/** Expands a design-decisions.json entry. These carry a decision id, not a design source. */
export function expandDecision(entry) {
  const value = entry.reference ? `var(--color-${dashed(entry.reference)})` : entry.value;
  if (!value) {
    throw new Error(`Decision token "${entry.name}" has neither a value nor a reference.`);
  }
  return [{ cssVar: `--${dashed(entry.name)}`, light: value, dark: null }];
}

function block(lines, indent = '  ') {
  // Blank separators stay blank: .editorconfig trims trailing whitespace,
  // and an indented empty line would be a diff the generator never matches.
  return lines.map((line) => (line ? `${indent}${line}` : '')).join('\n');
}

/**
 * @param {{ tokens: object[] }} design
 * @param {{ tokens: object[] }} decisions
 * @returns {{ css: string, ts: string }}
 */
export function generate(design, decisions) {
  const emitted = [];
  for (const token of design.tokens) {
    for (const property of expand(token)) {
      emitted.push({ ...property, token: token.name, group: token.group, origin: 'design' });
    }
  }
  for (const entry of decisions.tokens) {
    for (const property of expandDecision(entry)) {
      emitted.push({
        ...property,
        token: entry.name,
        group: entry.group,
        origin: 'decision',
        decision: entry.decision,
      });
    }
  }

  // ---- CSS ----------------------------------------------------------------
  const groupsInOrder = [...new Set(emitted.map((e) => e.group))];
  const themeLines = [];
  for (const group of groupsInOrder) {
    const members = emitted.filter((e) => e.group === group);
    themeLines.push(
      `/* ${group} — ${members.length} custom ${members.length === 1 ? 'property' : 'properties'} */`,
    );
    for (const member of members) themeLines.push(`${member.cssVar}: ${member.light};`);
    themeLines.push('');
  }
  while (themeLines.at(-1) === '') themeLines.pop();

  const darkMembers = emitted.filter((e) => e.dark);
  const withoutDark = design.tokens
    .filter((t) => COLOUR_GROUPS.has(t.group) && ABSENT.has(t.dark))
    .map((t) => t.name);

  const pendingSignOff = decisions.tokens
    .filter((d) => d.signOff === 'required')
    .map((d) => `${d.name} (${d.decision})`);

  const css = `${BANNER('design-tokens.json and design-decisions.json')}

@theme {
${block(themeLines)}
}

/*
 * Dark theme. Not an inversion — §10.2: elevation is expressed by surface
 * lightness rather than shadow, and pure black is never a canvas.
 *
 * ${withoutDark.length} light tokens have no dark counterpart and are absent here on
 * purpose (§16.2). They must not be invented:
${withoutDark.map((n) => ` *   ${n}`).join('\n')}
 *
 * No component or screen has ever been drawn in dark (audit F10), so these
 * values are unexercised. Dark *rendering* is deliberately out of Phase 1.
 */
[data-theme='dark'] {
${block(darkMembers.map((m) => `${m.cssVar}: ${m.dark};`))}
}
`;

  // ---- TypeScript ---------------------------------------------------------
  const designTokenNames = [
    ...new Set(emitted.filter((e) => e.origin === 'design').map((e) => e.token)),
  ];
  const decisionTokenNames = [
    ...new Set(emitted.filter((e) => e.origin === 'decision').map((e) => e.token)),
  ];
  const list = (values) => values.map((v) => `  '${v}',`).join('\n');

  const ts = `${BANNER('design-tokens.json and design-decisions.json')}

/**
 * Token *names*, never token *values*.
 *
 * A component applies a token as a utility class, which resolves to the
 * custom property. A value reachable from TypeScript would be a second way
 * to apply a colour, and that is precisely what AC2 fails a build for — so
 * values live in JSON, read only by the generator and the token tests.
 * \`no-restricted-imports\` enforces the other half of that rule.
 */

/** Design token names, as the design writes them. */
export const DESIGN_TOKENS = [
${list(designTokenNames)}
] as const;
export type DesignToken = (typeof DESIGN_TOKENS)[number];

/** Names supplied by a recorded decision rather than by the design. */
export const DECISION_TOKENS = [
${list(decisionTokenNames)}
] as const;
export type DecisionToken = (typeof DECISION_TOKENS)[number];

/** Every custom property tokens.css declares. */
export const CSS_VARIABLES = [
${list(emitted.map((e) => e.cssVar))}
] as const;
export type CssVariable = (typeof CSS_VARIABLES)[number];

/** Light tokens the design deliberately leaves without a dark value (§16.2). */
export const TOKENS_WITHOUT_DARK = [
${list(withoutDark)}
] as const;

/** Emitted on a recorded decision, still awaiting design-owner sign-off. */
export const PENDING_DESIGN_SIGNOFF = [
${list(pendingSignOff)}
] as const;

/** Design tokens that deliberately produce no custom property, and why. */
export const NOT_EMITTED = {
${Object.entries(NOT_EMITTED)
  .map(([name, why]) => `  '${name}': ${JSON.stringify(why)},`)
  .join('\n')}
} as const;
`;

  return { css, ts };
}

export async function readSources(root = PACKAGE_ROOT) {
  const read = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
  return {
    design: await read('design-tokens.json'),
    decisions: await read('design-decisions.json'),
  };
}

export const OUTPUTS = {
  css: 'src/styles/tokens.css',
  ts: 'src/tokens.ts',
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { design, decisions } = await readSources();
  const { css, ts } = generate(design, decisions);
  await writeFile(path.join(PACKAGE_ROOT, OUTPUTS.css), css, 'utf8');
  await writeFile(path.join(PACKAGE_ROOT, OUTPUTS.ts), ts, 'utf8');
  console.log(`Wrote ${OUTPUTS.css} and ${OUTPUTS.ts}`);
}
