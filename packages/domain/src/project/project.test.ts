import { describe, expect, it } from 'vitest';
import * as domain from '../index.js';
import { DomainError } from '../errors.js';
import type { Clock, IdGenerator } from '../ports/index.js';
import {
  assertProjectSchemaVersion,
  createProject,
  renameProject,
  restoreProject,
  CURRENT_PROJECT_SCHEMA_VERSION,
  PROJECT_STATES,
  PROJECT_TRANSITIONS_BLOCKED,
} from './project.js';
import { isProjectId, toProjectId } from './project-id.js';

/** Deterministic ports — the whole reason IdGenerator and Clock exist. */
function ids(...queue: string[]): IdGenerator {
  const remaining = [...queue];
  return { newId: () => remaining.shift() ?? '00000000-0000-0000-0000-00000000ffff' };
}
const clockAt = (iso: string): Clock => ({ now: () => new Date(iso) });

const UUID_A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const UUID_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const deps = { ids: ids(UUID_A), clock: clockAt('2026-09-01T10:00:00.000Z') };

describe('Project — the aggregate comes into existence only through its factory', () => {
  it('mints a ProjectId from the generator rather than reaching for crypto', () => {
    const project = createProject({ name: 'ArSL Curriculum', schemaVersion: 1 }, deps);
    expect(project.id).toBe(UUID_A);
    expect(isProjectId(project.id)).toBe(true);
  });

  it('records createdAt and updatedAt from the clock, at the same instant', () => {
    const project = createProject({ name: 'ArSL Curriculum', schemaVersion: 1 }, deps);
    expect(project.metadata.createdAt.toISOString()).toBe('2026-09-01T10:00:00.000Z');
    expect(project.metadata.updatedAt).toEqual(project.metadata.createdAt);
  });

  it('leaves createdBy unset — reserved, and there is no auth in v1', () => {
    const project = createProject({ name: 'ArSL Curriculum', schemaVersion: 1 }, deps);
    expect(project.metadata.createdBy).toBeUndefined();
  });
});

describe('Project — invariant: Name required, non-empty', () => {
  it.each(['', '   ', '\t\n'])('rejects %j', (name) => {
    expect(() => createProject({ name, schemaVersion: 1 }, deps)).toThrow(DomainError);
  });

  it('trims the name it keeps, so " x " and "x" are the same project name', () => {
    const project = createProject({ name: '  ArSL Curriculum  ', schemaVersion: 1 }, deps);
    expect(project.name).toBe('ArSL Curriculum');
  });

  it('enforces the same rule on rename, not only on creation', () => {
    const project = createProject({ name: 'ArSL Curriculum', schemaVersion: 1 }, deps);
    expect(() => renameProject(project, '  ', deps.clock)).toThrow(DomainError);
  });

  it('enforces it again on the way back from storage', () => {
    expect(() =>
      restoreProject({
        id: UUID_A,
        name: '',
        schemaVersion: 1,
        state: 'Created',
        createdAt: new Date('2026-09-01T10:00:00.000Z'),
        updatedAt: new Date('2026-09-01T10:00:00.000Z'),
      }),
    ).toThrow(DomainError);
  });
});

describe('Project — invariant: SchemaVersion compatible', () => {
  /**
   * Domain Model §3's "SchemaVersion must be readable by the current Studio
   * build", given its concrete rule by ADR-003 SR-07: compatible when
   * `schemaVersion <= CURRENT_PROJECT_SCHEMA_VERSION`.
   *
   * This block previously asserted the opposite — that a far-future version
   * was *accepted*, because deciding compatibility with no source behind it
   * would have been inventing the rule. The rule now exists, so the premise
   * that test recorded is the thing that changed.
   */
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects %p as not a version at all',
    (schemaVersion) => {
      expect(() => createProject({ name: 'X', schemaVersion }, deps)).toThrow(DomainError);
    },
  );

  it('accepts the current version and carries it verbatim', () => {
    const project = createProject(
      { name: 'X', schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION },
      deps,
    );
    expect(project.schemaVersion).toBe(CURRENT_PROJECT_SCHEMA_VERSION);
  });

  it('is 1 in this build', () => {
    expect(CURRENT_PROJECT_SCHEMA_VERSION).toBe(1);
  });

  it('rejects a version newer than this build can read, naming both', () => {
    expect(() => assertProjectSchemaVersion(CURRENT_PROJECT_SCHEMA_VERSION + 1)).toThrow(
      /schemaVersion 2 is newer than this Studio build can read \(supports up to 1\)/,
    );
  });

  it('rejects a far-future version too', () => {
    expect(() => createProject({ name: 'X', schemaVersion: 9999 }, deps)).toThrow(DomainError);
  });

  it('accepts every version at or below the current one', () => {
    // `<=`, not `===` — SR-07 promises an older file stays readable. At
    // version 1 the two rules coincide, so this is the assertion that will
    // actually catch a regression to strict equality when a 2 exists.
    for (let version = 1; version <= CURRENT_PROJECT_SCHEMA_VERSION; version += 1) {
      expect(assertProjectSchemaVersion(version)).toBe(version);
    }
  });

  it('is not the Pack schemaVersion and shares nothing with it', () => {
    // SR-08. @sayva/domain does not depend on @sayva/pack-schema at all
    // (ADR-001), so the separation is structural — this pins the intent so a
    // later "reuse the Pack constant" change has to argue with a test.
    expect(Object.keys(domain).filter((k) => /pack/i.test(k))).toEqual([]);
  });
});

describe('Project — the version gate is checked before anything else', () => {
  /**
   * ADR-003 SR-07: "can this build read the file at all" precedes "is what
   * it contains valid". A version-2 file may legitimately carry a state this
   * build has never heard of; reporting that as an unknown state would name
   * the wrong problem to whoever has to act on it.
   */
  const futureFile = {
    id: UUID_A,
    name: '',
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION + 1,
    state: 'Published' as never,
    createdAt: new Date('nonsense'),
    updatedAt: new Date('nonsense'),
  };

  it('reports the version, not the unknown state, and not the empty name', () => {
    // Every other invariant in this input is also violated. The version is
    // the one that gets reported.
    expect(() => restoreProject(futureFile)).toThrow(/newer than this Studio build can read/);
  });

  it('still reports the other problems once the version is readable', () => {
    expect(() =>
      restoreProject({ ...futureFile, schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION }),
    ).toThrow(/Unknown Project state/);
  });
});

describe('Project — lifecycle', () => {
  it('declares the four contracted states', () => {
    expect([...PROJECT_STATES]).toEqual(['Created', 'Active', 'Archived', 'Deleted']);
  });

  it('starts at Created, the tail of the lifecycle arrow', () => {
    expect(createProject({ name: 'X', schemaVersion: 1 }, deps).state).toBe('Created');
  });

  /**
   * The transitions no source gives a trigger for. §8 defers to §3 and §3
   * names none, so implementing one would be inventing behaviour. Recorded
   * as a value the test can assert rather than a comment anyone can
   * contradict — the same handling `SyDrawer`'s `resizing` got under D16.
   */
  it('names the transitions it deliberately does not implement', () => {
    expect([...PROJECT_TRANSITIONS_BLOCKED]).toEqual(['Created→Active', 'Active⇄Archived']);
  });

  it('exposes no way to reach Active or Archived', async () => {
    const project = await import('./project.js');
    const movers = Object.keys(project).filter((k) =>
      /activate|archive|unarchive|restoreTo/i.test(k),
    );
    expect(movers).toEqual([]);
  });

  it('rejects an unknown state coming back from storage', () => {
    expect(() =>
      restoreProject({
        id: UUID_A,
        name: 'X',
        schemaVersion: 1,
        state: 'Published' as never,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow(DomainError);
  });
});

describe('Project — rename', () => {
  it('moves updatedAt forward and leaves createdAt alone', () => {
    const project = createProject({ name: 'Old', schemaVersion: 1 }, deps);
    const renamed = renameProject(project, 'New', clockAt('2026-09-02T09:00:00.000Z'));

    expect(renamed.name).toBe('New');
    expect(renamed.metadata.createdAt).toEqual(project.metadata.createdAt);
    expect(renamed.metadata.updatedAt.toISOString()).toBe('2026-09-02T09:00:00.000Z');
  });

  it('does not mutate the project it was given', () => {
    const project = createProject({ name: 'Old', schemaVersion: 1 }, deps);
    renameProject(project, 'New', deps.clock);
    expect(project.name).toBe('Old');
  });

  it('keeps the same identity', () => {
    const project = createProject({ name: 'Old', schemaVersion: 1 }, deps);
    expect(renameProject(project, 'New', deps.clock).id).toBe(project.id);
  });
});

describe('ProjectId — identity is permanent and detectably broken when malformed', () => {
  it.each(['', 'not-a-uuid', '3f2504e0-4f89-41d3-9a0c', `${UUID_A}-extra`])(
    'rejects %j',
    (value) => {
      expect(() => toProjectId(value)).toThrow(DomainError);
      expect(isProjectId(value)).toBe(false);
    },
  );

  it('accepts the canonical form and normalises its case', () => {
    expect(toProjectId(UUID_B.toUpperCase())).toBe(UUID_B);
  });

  it('does not pin a UUID version, because the source does not', () => {
    // Nil UUID: valid 8-4-4-4-12, no version nibble. §5 says "UUID" and
    // stops there, so this must not be rejected.
    expect(isProjectId('00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  it('gives every project a distinct identity', () => {
    const two = { ids: ids(UUID_A, UUID_B), clock: deps.clock };
    const a = createProject({ name: 'A', schemaVersion: 1 }, two);
    const b = createProject({ name: 'B', schemaVersion: 1 }, two);
    expect(a.id).not.toBe(b.id);
  });
});

describe('Project — reconstitution round-trips', () => {
  it('rebuilds an equal Project from its own parts', () => {
    const project = createProject(
      { name: 'ArSL', schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION, tags: ['pilot'] },
      deps,
    );
    const restored = restoreProject({
      id: project.id,
      name: project.name,
      schemaVersion: project.schemaVersion,
      state: project.state,
      createdAt: project.metadata.createdAt,
      updatedAt: project.metadata.updatedAt,
      tags: project.metadata.tags,
    });
    expect(restored).toEqual(project);
  });

  it('rejects an invalid timestamp rather than carrying it', () => {
    expect(() =>
      restoreProject({
        id: UUID_A,
        name: 'X',
        schemaVersion: 1,
        state: 'Created',
        createdAt: new Date('nonsense'),
        updatedAt: new Date(),
      }),
    ).toThrow(DomainError);
  });
});
