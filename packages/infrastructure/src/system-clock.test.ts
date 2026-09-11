import { describe, expect, it } from 'vitest';
import { createProject, restoreMetadata, CURRENT_PROJECT_SCHEMA_VERSION } from '@sayva/domain';
import { createCryptoIdGenerator } from './crypto-id-generator.js';
import { createSystemClock } from './system-clock.js';

/**
 * The `Clock` adapter — Architecture Blueprint §5.
 *
 * Small enough that the interesting assertions are the boundary ones: that
 * the `Date` is valid, that it is a fresh instance, and that a caller
 * mutating one cannot reach the next.
 */

describe('createSystemClock', () => {
  it('returns a Date', () => {
    expect(createSystemClock().now()).toBeInstanceOf(Date);
  });

  it('returns a valid Date, which is what Metadata requires', () => {
    // restoreMetadata rejects NaN timestamps outright. An invalid Date
    // from the clock would fail there rather than here, far from its cause.
    const now = createSystemClock().now();

    expect(Number.isNaN(now.getTime())).toBe(false);
    expect(() => restoreMetadata({ createdAt: now, updatedAt: now })).not.toThrow();
  });

  it('tracks the system clock', () => {
    const before = Date.now();
    const reading = createSystemClock().now().getTime();
    const after = Date.now();

    expect(reading).toBeGreaterThanOrEqual(before);
    expect(reading).toBeLessThanOrEqual(after);
  });

  it('never goes backwards between calls', () => {
    const clock = createSystemClock();
    let previous = clock.now().getTime();

    for (let i = 0; i < 1000; i += 1) {
      const next = clock.now().getTime();
      expect(next).toBeGreaterThanOrEqual(previous);
      previous = next;
    }
  });

  it('returns a fresh Date each call, not one shared instance', () => {
    const clock = createSystemClock();
    expect(clock.now()).not.toBe(clock.now());
  });

  it('cannot have one caller rewrite another caller reading', () => {
    // Date is mutable and Metadata holds the instance it was handed. A
    // cached Date would let setTime on one entity's createdAt silently
    // rewrite another's.
    const clock = createSystemClock();
    const first = clock.now();
    first.setTime(0);

    expect(clock.now().getTime()).not.toBe(0);
  });

  it('cannot have a mutated reading reach back into an entity already built', () => {
    const clock = createSystemClock();
    const project = createProject(
      { name: 'ArSL Curriculum', schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION },
      { ids: createCryptoIdGenerator(), clock },
    );
    const before = project.metadata.createdAt.getTime();

    clock.now().setTime(0);

    expect(project.metadata.createdAt.getTime()).toBe(before);
  });

  it('stamps createdAt and updatedAt at the same instant on creation', () => {
    // createMetadata reads the clock once and uses the reading twice. Two
    // readings would make a freshly created entity look already edited.
    const project = createProject(
      { name: 'ArSL Curriculum', schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION },
      { ids: createCryptoIdGenerator(), clock: createSystemClock() },
    );

    expect(project.metadata.updatedAt.getTime()).toBe(project.metadata.createdAt.getTime());
  });
});
