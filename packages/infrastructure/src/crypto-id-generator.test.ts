import { describe, expect, it } from 'vitest';
import {
  createProject,
  isProjectId,
  toProjectId,
  CURRENT_PROJECT_SCHEMA_VERSION,
} from '@sayva/domain';
import { createCryptoIdGenerator } from './crypto-id-generator.js';
import { createSystemClock } from './system-clock.js';

/**
 * The `IdGenerator` adapter — Architecture Blueprint §5.
 *
 * The assertions deliberately lean on Domain's own identity check rather
 * than a regex written here. `isProjectId` and `toProjectId` are what
 * actually decides whether an id is usable, so testing against them proves
 * the adapter satisfies the contract that matters instead of a restatement
 * of it that could drift.
 */

describe('createCryptoIdGenerator', () => {
  it('produces an id Domain accepts as a ProjectId', () => {
    const id = createCryptoIdGenerator().newId();

    expect(isProjectId(id)).toBe(true);
    expect(() => toProjectId(id)).not.toThrow();
  });

  it('produces the canonical 8-4-4-4-12 form', () => {
    expect(createCryptoIdGenerator().newId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('is already lowercase, so `toProjectId` has nothing to normalise', () => {
    // toProjectId lowercases what it is given. An id that round-trips
    // unchanged is one that was canonical to begin with.
    const id = createCryptoIdGenerator().newId();
    expect(toProjectId(id)).toBe(id);
  });

  it('never repeats an id', () => {
    // Domain Model §5: ids are "never reused, never recycled after a
    // delete, so a stale reference is always detectably broken". A
    // collision here would make that guarantee false at the source.
    const ids = new Set<string>();
    const generator = createCryptoIdGenerator();
    for (let i = 0; i < 10_000; i += 1) {
      ids.add(generator.newId());
    }
    expect(ids.size).toBe(10_000);
  });

  it('does not collide across separate generator instances', () => {
    // Nothing coordinates between instances — §5's "uniqueness without
    // coordination" has to hold per call, not per generator.
    const a = createCryptoIdGenerator();
    const b = createCryptoIdGenerator();
    const ids = new Set([
      ...Array.from({ length: 500 }, () => a.newId()),
      ...Array.from({ length: 500 }, () => b.newId()),
    ]);

    expect(ids.size).toBe(1000);
  });

  it('drives the Domain factory it exists for', () => {
    // The whole reason the port exists: entity construction stays pure
    // because the host call happens here instead (Blueprint §5).
    const project = createProject(
      { name: 'ArSL Curriculum', schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION },
      { ids: createCryptoIdGenerator(), clock: createSystemClock() },
    );

    expect(isProjectId(project.id)).toBe(true);
  });

  it('gives two projects made by one generator distinct identities', () => {
    const deps = { ids: createCryptoIdGenerator(), clock: createSystemClock() };
    const a = createProject({ name: 'A', schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION }, deps);
    const b = createProject({ name: 'B', schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION }, deps);

    expect(a.id).not.toBe(b.id);
  });
});
