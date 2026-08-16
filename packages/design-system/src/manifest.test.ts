import { describe, expect, it } from 'vitest';
import manifest from '../design-manifest.json';
import design from '../design-tokens.json';
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
      'row.compact',
    ]);
    for (const token of blocked) {
      expect(token.code, `${token.design} is blocked and must emit nothing`).toEqual([]);
      expect(token.reason, `${token.design} must cite a decision`).toMatch(/\bD\d+\b/);
    }
  });

  it('keeps provisional tokens flagged in both the manifest and the generated output', () => {
    const provisional = manifest.tokens.filter((t) => t.status === 'implemented-pending-signoff');
    expect(provisional.map((t) => t.design)).toEqual(['focus.ring']);
    for (const token of provisional) {
      expect(token.decision).toMatch(/\bD\d+\b/);
      for (const property of token.code) {
        const name = property.replace(/^--/, '').replace(/-/g, '.');
        expect(PENDING_DESIGN_SIGNOFF.some((entry) => entry.startsWith(name))).toBe(true);
      }
    }
  });
});

describe('component scope is untouched by the token slice', () => {
  it('still carries the ten contracted primitives, all deferred', () => {
    expect(manifest.components).toHaveLength(10);
    for (const component of manifest.components) {
      expect(component.status).toBe('deferred');
      expect(component.code).toBeNull();
    }
  });

  it('still accounts for all 22 contracted components', () => {
    expect(manifest.components.length + manifest.outOfScope.patterns.length).toBe(22);
  });
});
