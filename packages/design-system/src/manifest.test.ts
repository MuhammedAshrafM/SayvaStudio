import { describe, expect, it } from 'vitest';
import manifest from '../design-manifest.json';
import design from '../design-tokens.json';
import openDecisions from '../design-open-decisions.json';
import { NOT_EMITTED } from '../tooling/generate-tokens.mjs';
import { CONFIDENCE_STATES } from './primitives/confidence/index.js';
import { ENTITY_REF_STATES } from './primitives/entity-ref/index.js';
import { DRAWER_STATES } from './primitives/drawer/index.js';
import { FIELD_STATES } from './primitives/field/index.js';
import { MENU_STATES } from './primitives/menu/index.js';
import { METRIC_SIZES, METRIC_STATES } from './primitives/metric/index.js';
import { STATE_BLOCK_SIZES, STATE_BLOCK_STATES } from './primitives/state-block/index.js';
import { CSS_VARIABLES, PENDING_DESIGN_SIGNOFF } from './tokens.js';

/**
 * The design→code map is only worth having if it cannot drift from the code.
 * These assertions are what make "every token is implemented, or explicitly
 * deferred with a reason" a build failure rather than an intention.
 */

const STATUSES = new Set(Object.keys(manifest.$meta.statusVocabulary));
const declaredVariables = new Set<string>(CSS_VARIABLES);

describe('manifest tracks the design source exactly', () => {
  it('lists every design token, in source order', () => {
    expect(manifest.tokens.map((t) => t.design)).toEqual(design.tokens.map((t) => t.name));
  });

  it('uses only statuses the vocabulary defines', () => {
    for (const token of manifest.tokens) {
      expect(STATUSES.has(token.status), `${token.design}: ${token.status}`).toBe(true);
    }
  });

  it('reports counts that match its own arrays', () => {
    const counts = manifest.$meta.counts;
    const withStatus = (status: string) =>
      manifest.tokens.filter((t) => t.status === status).length;
    expect(counts.tokens).toBe(manifest.tokens.length);
    expect(counts.tokensBlocked).toBe(withStatus('blocked'));
    expect(counts.tokensPendingSignOff).toBe(withStatus('implemented-pending-signoff'));
    expect(counts.tokensImplemented).toBe(
      withStatus('implemented') + withStatus('implemented-pending-signoff'),
    );
    expect(counts.cssCustomProperties).toBe(
      manifest.tokens.reduce((total, token) => total + token.code.length, 0),
    );
  });
});

describe('every entry is accounted for', () => {
  it('maps implemented tokens onto custom properties that actually exist', () => {
    for (const token of manifest.tokens) {
      if (!token.status.startsWith('implemented')) continue;
      for (const property of token.code) {
        expect(declaredVariables.has(property), `${token.design} -> ${property}`).toBe(true);
      }
    }
  });

  it('accounts for every custom property the generator emits', () => {
    const mapped = new Set(manifest.tokens.flatMap((token) => token.code));
    const unmapped = [...declaredVariables].filter((name) => !mapped.has(name));
    expect(unmapped).toEqual([]);
  });

  it('explains any implemented token that produced no custom property', () => {
    // bp.sm is the real case: §10.9 defines it as the base range below
    // --breakpoint-md, so it has no threshold of its own to emit.
    for (const token of manifest.tokens) {
      if (token.status !== 'implemented' || token.code.length > 0) continue;
      expect(token.expansion, `${token.design} produced nothing and must say why`).toBeTruthy();
    }
  });

  it('gives every blocked token a reason naming its open decision', () => {
    const blocked = manifest.tokens.filter((t) => t.status === 'blocked');
    expect(blocked.map((t) => t.design).sort()).toEqual([
      'ease.exit',
      'ease.standard',
      'focus.ring',
      'row.compact',
    ]);
    for (const token of blocked) {
      expect(token.code, `${token.design} is blocked and must emit nothing`).toEqual([]);
      expect(token.reason, `${token.design} must cite a decision`).toMatch(/\bD\d+\b/);
    }
  });

  it('carries no provisional tokens, and stays wired to catch one', () => {
    // D5 is open and pending, so nothing reaches the CSS on a recorded
    // decision alone. The parity holds if a provisional token appears later.
    const provisional = manifest.tokens.filter((t) => t.status === 'implemented-pending-signoff');
    expect(provisional).toEqual([]);
    expect(PENDING_DESIGN_SIGNOFF).toHaveLength(0);
  });
});

describe('every decision cited is a decision on the register', () => {
  const registered = new Set(openDecisions.decisions.map((entry) => entry.id));

  it('records every decision id the manifest cites', () => {
    const cited = new Set(
      manifest.tokens
        .flatMap((token) => [
          ...String(token.reason ?? '').matchAll(/\bD\d+\b/g),
          ...String(token.decision ?? '').matchAll(/\bD\d+\b/g),
        ])
        .map((match) => match[0]),
    );
    expect(cited.size, 'the manifest should be citing decisions').toBeGreaterThan(0);
    expect([...cited].filter((id) => !registered.has(id))).toEqual([]);
  });

  it('records every decision id the generator cites', () => {
    const cited = new Set(
      Object.values(NOT_EMITTED)
        .flatMap((reason) => [...String(reason).matchAll(/\bD\d+\b/g)])
        .map((match) => match[0]),
    );
    expect([...cited].filter((id) => !registered.has(id))).toEqual([]);
  });

  it('lets no decision close without a recorded ruling', () => {
    /**
     * A decision silently flipping to closed is how a blocked token gets
     * unblocked without anyone ruling on it. The guard is no longer "nothing
     * may close" — D14 and D15 have been ruled — but "closing requires the
     * ruling, its author and its date on the record".
     */
    const vocabulary = new Set(Object.keys(openDecisions.$meta.statusVocabulary));

    for (const entry of openDecisions.decisions) {
      expect(vocabulary.has(entry.status), `${entry.id} status: ${entry.status}`).toBe(true);
      expect(entry.owner, `${entry.id} owner`).toBeTruthy();
      expect(entry.mustNotDo, `${entry.id} must say what not to do`).toBeTruthy();

      if (entry.status !== 'ruled') continue;
      expect(entry.ruling, `${entry.id} is ruled and must record the ruling`).toBeTruthy();
      expect(entry.ruledBy, `${entry.id} must record who ruled`).toBeTruthy();
      expect(entry.ruledOn, `${entry.id} must record when`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    const withStatus = (status: string) =>
      openDecisions.decisions.filter((entry) => entry.status === status).length;
    expect(openDecisions.$meta.counts.open).toBe(withStatus('open'));
    expect(openDecisions.$meta.counts.ruled).toBe(withStatus('ruled'));
  });

  it('keeps a decision that still blocks something open, whatever was agreed meanwhile', () => {
    /**
     * D16's handling is settled — declare `resizing`, build no affordance —
     * but the design question behind it is not. A blocked entry must always
     * cite a decision the design has yet to answer, so an agreed interim
     * handling goes in `interimRuling` and the status stays open.
     */
    const d16 = openDecisions.decisions.find((entry) => entry.id === 'D16');
    expect(d16?.status).toBe('open');
    expect(d16?.interimRuling, 'the agreed handling must be recorded').toBeTruthy();
    expect(d16?.question, 'the unanswered design question must survive').toBeTruthy();
  });

  it('keeps D5 pending rather than resolved in either direction', () => {
    const d5 = openDecisions.decisions.find((entry) => entry.id === 'D5');
    expect(d5?.status).toBe('open');
    // Blocked, but not rejected — the distinction the design owner asked for.
    expect(manifest.tokens.find((t) => t.design === 'focus.ring')?.status).toBe('blocked');
    expect(d5?.statement).toMatch(/neither adopted nor rejected/i);
  });
});

describe('implemented components cover the contract the manifest records', () => {
  /**
   * Each implemented component that enumerates its contract exports the
   * lists, so the manifest and the code cannot drift apart. A component
   * dropping a variant fails here rather than in a story nobody wrote.
   */
  /**
   * The inventory folds an explanatory gloss into some recorded names —
   * "stale (computed by an older model version)", "inline (rows)". The name
   * is the part before the gloss. Normalised here rather than trimmed in the
   * manifest, which stays verbatim as ingested.
   */
  const recordedName = (value: string) => value.replace(/\s*\(.*\)\s*$/, '').trim();

  type Coverage = { states?: readonly string[]; sizes?: readonly string[] };

  const COVERAGE: Record<string, Coverage> = {
    SyStateBlock: { states: STATE_BLOCK_STATES, sizes: STATE_BLOCK_SIZES },
    SyMetric: { states: METRIC_STATES, sizes: METRIC_SIZES },
    // Sizes are UNSPECIFIED BY DESIGN, so there are none to cover.
    SyEntityRef: { states: ENTITY_REF_STATES },
    SyField: { states: FIELD_STATES },
    // SyConfidence records no sizes — UNSPECIFIED BY DESIGN, so none exist
    // to cover.
    SyConfidence: { states: CONFIDENCE_STATES },
    // Sizes are UNSPECIFIED BY DESIGN, so there are none to cover.
    SyMenu: { states: MENU_STATES },
    // SyDrawer records an elevation in its `sizes` field rather than a size,
    // so there is likewise nothing to cover there.
    SyDrawer: { states: DRAWER_STATES },
    // SyStatusBadge deliberately has no `states` entry here. Its contracted
    // states are the six editorial lifecycle values, which decision D3 keeps
    // out of this package; apps/studio owns that mapping. Covering them here
    // would be asserting the coupling D3 exists to prevent.
  };

  it.each(Object.keys(COVERAGE))('%s implements every recorded variant and size', (name) => {
    const entry = manifest.components.find((component) => component.design === name);
    expect(entry, `${name} must be in the manifest`).toBeTruthy();
    expect(entry!.status).toBe('implemented');

    const implemented = COVERAGE[name]!;

    if (implemented.states) {
      expect([...implemented.states].sort(), `${name} variant coverage`).toEqual(
        (entry!.states as string[]).map(recordedName).sort(),
      );
    }
    if (implemented.sizes) {
      expect([...implemented.sizes].sort(), `${name} size coverage`).toEqual(
        ((entry!.sizes ?? []) as string[]).map(recordedName).sort(),
      );
    }
  });

  it('records why SyStatusBadge is exempt, rather than leaving it silently uncovered', () => {
    const entry = manifest.components.find((component) => component.design === 'SyStatusBadge')!;
    expect(entry.status).toBe('implemented');
    expect(entry.note, 'the D3 exemption must be stated in the manifest').toMatch(/\bD3\b/);
  });
});

describe('component scope is untouched by the token slice', () => {
  it('still carries the ten contracted primitives', () => {
    expect(manifest.components).toHaveLength(10);
    expect(manifest.$meta.counts.componentsImplemented).toBe(
      manifest.components.filter((c) => c.status === 'implemented').length,
    );
    expect(manifest.$meta.counts.componentsDeferred).toBe(
      manifest.components.filter((c) => c.status === 'deferred').length,
    );
  });

  it('gives an implemented component a module and exports, and a deferred one neither', () => {
    for (const component of manifest.components) {
      if (component.status === 'implemented') {
        expect(component.code, `${component.design} must name its exports`).not.toEqual([]);
        expect(component.module, `${component.design} must name its module`).toBeTruthy();
      } else {
        expect(component.status).toBe('deferred');
        expect(component.code).toBeNull();
        expect(component.plannedSlice).toBeTypeOf('number');
      }
    }
  });

  it('exports every implemented component from the public surface', async () => {
    const surface = await import('./index.js');
    for (const component of manifest.components) {
      if (component.status !== 'implemented') continue;
      for (const symbol of component.code as string[]) {
        expect(symbol in surface, `${symbol} must be exported from src/index.ts`).toBe(true);
      }
    }
  });

  it('still accounts for all 22 contracted components', () => {
    expect(manifest.components.length + manifest.outOfScope.patterns.length).toBe(22);
  });
});
