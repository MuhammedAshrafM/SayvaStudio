import { describe, expect, it } from 'vitest';
import {
  createProject,
  restoreProject,
  CURRENT_PROJECT_SCHEMA_VERSION,
  type Clock,
  type IdGenerator,
  type Project,
  type ProjectId,
  type ProjectRepository,
} from '@sayva/domain';
import { ProjectNotFoundError } from './project-models.js';
import {
  createProjectUseCase,
  deleteProjectUseCase,
  duplicateProjectUseCase,
  listProjectsUseCase,
  openProjectUseCase,
  saveProjectUseCase,
  viewProjectListUseCase,
  type ProjectUseCaseDeps,
} from './project-use-cases.js';

const UUID_A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const UUID_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

/**
 * An in-memory `ProjectRepository`.
 *
 * A fake, not a mock: it honours the port's contract so the use cases are
 * exercised against real behaviour. The filesystem adapter is blocked on
 * three unresolved prerequisites, and none of these tests needs it — which
 * is the point of the port.
 */
function inMemoryRepository(seed: Project[] = []) {
  const store = new Map<string, Project>(seed.map((p) => [p.id, p]));
  const calls = { save: 0, delete: 0 };
  const repository: ProjectRepository = {
    findById: (id: ProjectId) => Promise.resolve(store.get(id) ?? null),
    findAll: () => Promise.resolve([...store.values()]),
    save: (project: Project) => {
      calls.save += 1;
      store.set(project.id, project);
      return Promise.resolve();
    },
    delete: (id: ProjectId) => {
      calls.delete += 1;
      store.delete(id);
      return Promise.resolve();
    },
  };
  return { repository, store, calls };
}

function ids(...queue: string[]): IdGenerator {
  const remaining = [...queue];
  return { newId: () => remaining.shift() ?? UUID_B };
}
const clockAt = (iso: string): Clock => ({ now: () => new Date(iso) });

function deps(overrides: Partial<ProjectUseCaseDeps> = {}): ProjectUseCaseDeps {
  const { repository } = inMemoryRepository();
  return {
    projects: repository,
    ids: ids(UUID_A),
    clock: clockAt('2026-09-01T10:00:00.000Z'),
    ...overrides,
  };
}

const seeded = () => {
  const project = createProject(
    { name: 'ArSL Curriculum', schemaVersion: 1 },
    { ids: ids(UUID_A), clock: clockAt('2026-09-01T10:00:00.000Z') },
  );
  const memory = inMemoryRepository([project]);
  return { project, ...memory };
};

describe('CreateProject', () => {
  it('persists the project it creates', async () => {
    const memory = inMemoryRepository();
    const view = await createProjectUseCase(deps({ projects: memory.repository }), {
      name: 'ArSL Curriculum',
      schemaVersion: 1,
    });

    expect(view.id).toBe(UUID_A);
    expect(memory.store.get(UUID_A)?.name).toBe('ArSL Curriculum');
    expect(memory.calls.save).toBe(1);
  });

  it('returns a Response Model, never the Domain entity (AD-02)', async () => {
    const view = await createProjectUseCase(deps(), { name: 'X', schemaVersion: 1 });

    // Serializable: dates as ISO strings, nothing with methods or Date objects.
    expect(view.createdAt).toBe('2026-09-01T10:00:00.000Z');
    expect(JSON.parse(JSON.stringify(view))).toEqual(view);
    expect(view).not.toHaveProperty('metadata');
  });

  it('refuses an empty name, because Domain does', async () => {
    await expect(createProjectUseCase(deps(), { name: '  ', schemaVersion: 1 })).rejects.toThrow(
      /name is required/i,
    );
  });

  it('does not persist anything when the invariant fails', async () => {
    const memory = inMemoryRepository();
    await expect(
      createProjectUseCase(deps({ projects: memory.repository }), { name: '', schemaVersion: 1 }),
    ).rejects.toThrow();
    expect(memory.calls.save).toBe(0);
  });
});

describe('OpenProject', () => {
  it('reads a project back by id', async () => {
    const { repository, project } = seeded();
    const view = await openProjectUseCase(deps({ projects: repository }), { id: project.id });
    expect(view.name).toBe('ArSL Curriculum');
  });

  it('fails loudly on an id nothing answers to', async () => {
    await expect(openProjectUseCase(deps(), { id: UUID_B })).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });

  it('rejects a malformed id rather than searching for it', async () => {
    await expect(openProjectUseCase(deps(), { id: 'not-a-uuid' })).rejects.toThrow(
      /canonical UUID/i,
    );
  });

  it('changes nothing it reads', async () => {
    const { repository, calls, project } = seeded();
    await openProjectUseCase(deps({ projects: repository }), { id: project.id });
    expect(calls.save).toBe(0);
    expect(calls.delete).toBe(0);
  });
});

describe('ListProjects', () => {
  it('returns every project as a Response Model', async () => {
    const { repository, project } = seeded();
    const views = await listProjectsUseCase(deps({ projects: repository }));
    expect(views).toHaveLength(1);
    expect(views[0]?.id).toBe(project.id);
  });

  it('returns an empty list rather than failing when there are none', async () => {
    await expect(listProjectsUseCase(deps())).resolves.toEqual([]);
  });
});

describe('ListProjects — ordering (PP-04)', () => {
  /**
   * `updatedAt` descending, decided in the Query's View Model assembly
   * (AD-07). The fake repository returns Projects in the order they were
   * seeded, so every test below seeds them *out* of the expected order —
   * otherwise a use case that sorted nothing would pass.
   */
  const ID_1 = '11111111-1111-4111-8111-111111111111';
  const ID_2 = '22222222-2222-4222-8222-222222222222';
  const ID_3 = '33333333-3333-4333-8333-333333333333';
  const ID_4 = '44444444-4444-4444-8444-444444444444';

  /** A Project with exact, independent timestamps — restoreProject takes both. */
  const projectAt = (
    id: string,
    name: string,
    updatedAt: string,
    createdAt = '2026-01-01T00:00:00.000Z',
  ): Project =>
    restoreProject({
      id,
      name,
      schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
      state: 'Created',
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
    });

  const listNames = async (seed: Project[]) =>
    (await listProjectsUseCase(deps({ projects: inMemoryRepository(seed).repository }))).map(
      (view) => view.name,
    );

  const older = projectAt(ID_1, 'Older', '2026-09-01T09:00:00.000Z');
  const middle = projectAt(ID_2, 'Middle', '2026-09-10T09:00:00.000Z');
  const newest = projectAt(ID_3, 'Newest', '2026-09-20T09:00:00.000Z');

  it('lists the most recently updated Project first', async () => {
    expect(await listNames([middle, older, newest])).toEqual(['Newest', 'Middle', 'Older']);
  });

  it('produces the same order whatever order the repository returns', async () => {
    // Every permutation of three. If the use case passed the repository's
    // order through, at most one of these could match.
    const permutations = [
      [older, middle, newest],
      [older, newest, middle],
      [middle, older, newest],
      [middle, newest, older],
      [newest, older, middle],
      [newest, middle, older],
    ];
    for (const seed of permutations) {
      expect(await listNames(seed)).toEqual(['Newest', 'Middle', 'Older']);
    }
  });

  it('orders by updatedAt, not by createdAt', async () => {
    // Created first, edited last. A list ordered by creation would put it
    // at the bottom; "most recently edited first" puts it at the top.
    const oldButJustEdited = projectAt(
      ID_4,
      'Old but just edited',
      '2026-09-23T09:00:00.000Z',
      '2025-01-01T00:00:00.000Z',
    );
    const recentButUntouched = projectAt(
      ID_1,
      'Recent but untouched',
      '2026-09-05T09:00:00.000Z',
      '2026-09-05T09:00:00.000Z',
    );

    expect(await listNames([recentButUntouched, oldButJustEdited])).toEqual([
      'Old but just edited',
      'Recent but untouched',
    ]);
  });

  it('distinguishes updates a millisecond apart', async () => {
    const earlier = projectAt(ID_1, 'Earlier', '2026-09-20T09:00:00.000Z');
    const later = projectAt(ID_2, 'Later', '2026-09-20T09:00:00.001Z');

    expect(await listNames([earlier, later])).toEqual(['Later', 'Earlier']);
  });

  it('keeps Projects edited at the same instant between the newer and the older ones', async () => {
    // Deliberately asserts nothing about which tied Project comes first —
    // no source ranks one equally-recent Project above another. Only that
    // both are present, adjacent, and correctly placed around the rest.
    const tiedAlpha = projectAt(ID_1, 'Alpha', '2026-09-15T09:00:00.000Z');
    const tiedZulu = projectAt(ID_2, 'Zulu', '2026-09-15T09:00:00.000Z');
    const before = projectAt(ID_3, 'Before', '2026-09-20T09:00:00.000Z');
    const after = projectAt(ID_4, 'After', '2026-09-10T09:00:00.000Z');

    const names = await listNames([tiedZulu, after, tiedAlpha, before]);

    expect(names).toHaveLength(4);
    expect(names[0]).toBe('Before');
    expect(names[3]).toBe('After');
    expect(new Set(names.slice(1, 3))).toEqual(new Set(['Alpha', 'Zulu']));
  });

  it('applies no tie-breaker of its own', async () => {
    // The check that no secondary key was invented. A tie-breaker — by name,
    // by id, by createdAt — would force the tied pair into the same order
    // however the repository supplied them. With none, the use case leaves
    // ties exactly as it received them, so reversing the input reverses the
    // output. This fixes no particular order between the two; it shows the
    // order is not the use case's to choose.
    //
    // Chosen so any plausible invented key disagrees with one of the two
    // runs: Zulu sorts after Alpha by name, ID_2 after ID_1 by id, and
    // Zulu was created before Alpha.
    const alpha = projectAt(ID_1, 'Alpha', '2026-09-15T09:00:00.000Z', '2026-02-01T00:00:00.000Z');
    const zulu = projectAt(ID_2, 'Zulu', '2026-09-15T09:00:00.000Z', '2026-01-01T00:00:00.000Z');

    expect(await listNames([alpha, zulu])).toEqual(['Alpha', 'Zulu']);
    expect(await listNames([zulu, alpha])).toEqual(['Zulu', 'Alpha']);
  });

  it("does not reorder the repository's own result", async () => {
    // findAll() returns `readonly Project[]`. Sorting it in place would
    // reorder an array the use case does not own; a frozen array makes that
    // throw instead of passing quietly.
    const returned = Object.freeze([older, newest, middle]);
    const repository: ProjectRepository = {
      ...inMemoryRepository().repository,
      findAll: () => Promise.resolve(returned),
    };

    const views = await listProjectsUseCase(deps({ projects: repository }));

    expect(views.map((view) => view.name)).toEqual(['Newest', 'Middle', 'Older']);
    expect(returned.map((project) => project.name)).toEqual(['Older', 'Newest', 'Middle']);
  });

  it('still returns Response Models with the unchanged ProjectView shape', async () => {
    const [first] = await listProjectsUseCase(
      deps({ projects: inMemoryRepository([older, newest]).repository }),
    );

    expect(Object.keys(first ?? {}).sort()).toEqual([
      'createdAt',
      'id',
      'name',
      'schemaVersion',
      'state',
      'tags',
      'updatedAt',
    ]);
    expect(first?.updatedAt).toBe('2026-09-20T09:00:00.000Z');
  });
});

describe('SaveProject', () => {
  it('applies the rename and persists it', async () => {
    const { repository, store, project } = seeded();
    const view = await saveProjectUseCase(
      deps({ projects: repository, clock: clockAt('2026-09-02T09:00:00.000Z') }),
      { id: project.id, name: 'ArSL Curriculum v2' },
    );

    expect(view.name).toBe('ArSL Curriculum v2');
    expect(store.get(project.id)?.name).toBe('ArSL Curriculum v2');
  });

  it('moves updatedAt forward and leaves createdAt alone', async () => {
    const { repository, project } = seeded();
    const view = await saveProjectUseCase(
      deps({ projects: repository, clock: clockAt('2026-09-02T09:00:00.000Z') }),
      { id: project.id, name: 'Renamed' },
    );

    expect(view.updatedAt).toBe('2026-09-02T09:00:00.000Z');
    expect(view.createdAt).toBe('2026-09-01T10:00:00.000Z');
  });

  it('keeps the same identity', async () => {
    const { repository, project } = seeded();
    const view = await saveProjectUseCase(deps({ projects: repository }), {
      id: project.id,
      name: 'Renamed',
    });
    expect(view.id).toBe(project.id);
  });

  it('refuses an empty name and persists nothing', async () => {
    const { repository, calls, project } = seeded();
    await expect(
      saveProjectUseCase(deps({ projects: repository }), { id: project.id, name: '' }),
    ).rejects.toThrow(/name is required/i);
    expect(calls.save).toBe(0);
  });

  it('fails on an unknown project', async () => {
    await expect(saveProjectUseCase(deps(), { id: UUID_B, name: 'X' })).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });
});

describe('DuplicateProject', () => {
  it('gives the copy a new identity, never reusing the source id', async () => {
    const { repository, project } = seeded();
    const view = await duplicateProjectUseCase(deps({ projects: repository, ids: ids(UUID_B) }), {
      id: project.id,
      name: 'ArSL Curriculum (copy)',
    });

    expect(view.id).toBe(UUID_B);
    expect(view.id).not.toBe(project.id);
  });

  it('leaves the source untouched', async () => {
    const { repository, store, project } = seeded();
    await duplicateProjectUseCase(deps({ projects: repository, ids: ids(UUID_B) }), {
      id: project.id,
      name: 'Copy',
    });

    expect(store.get(project.id)?.name).toBe('ArSL Curriculum');
    expect(store.size).toBe(2);
  });

  it('gives the copy its own timestamps rather than the source’s history', async () => {
    const { repository, project } = seeded();
    const view = await duplicateProjectUseCase(
      deps({
        projects: repository,
        ids: ids(UUID_B),
        clock: clockAt('2026-09-05T12:00:00.000Z'),
      }),
      { id: project.id, name: 'Copy' },
    );

    expect(view.createdAt).toBe('2026-09-05T12:00:00.000Z');
    expect(view.createdAt).not.toBe('2026-09-01T10:00:00.000Z');
  });

  it('carries the source schemaVersion, since the copy is the same format', async () => {
    // Was `4` before ADR-003 SR-07 gave `schemaVersion` a compatibility rule;
    // a version above CURRENT is now unconstructible, which is the point of
    // the gate. At version 1 "carried from the source" and "defaulted to the
    // current build" are indistinguishable, so which one a duplicate should
    // get is a question a version 2 will have to answer — no source rules on
    // it today, and this test does not decide it.
    const source = createProject(
      { name: 'X', schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION },
      { ids: ids(UUID_A), clock: clockAt('2026-09-01T10:00:00.000Z') },
    );
    const memory = inMemoryRepository([source]);
    const view = await duplicateProjectUseCase(
      deps({ projects: memory.repository, ids: ids(UUID_B) }),
      { id: source.id, name: 'Copy' },
    );
    expect(view.schemaVersion).toBe(source.schemaVersion);
  });

  it('requires a name for the copy', async () => {
    const { repository, project } = seeded();
    await expect(
      duplicateProjectUseCase(deps({ projects: repository, ids: ids(UUID_B) }), {
        id: project.id,
        name: '',
      }),
    ).rejects.toThrow(/name is required/i);
  });

  it('fails on an unknown source', async () => {
    await expect(
      duplicateProjectUseCase(deps(), { id: UUID_B, name: 'Copy' }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});

describe('DeleteProject', () => {
  it('removes the record, rather than setting a flag', async () => {
    const { repository, store, calls, project } = seeded();
    await deleteProjectUseCase(deps({ projects: repository }), { id: project.id });

    expect(store.has(project.id)).toBe(false);
    expect(calls.delete).toBe(1);
    // Destructive: nothing was written back with a Deleted state.
    expect(calls.save).toBe(0);
  });

  it('fails on an unknown project rather than succeeding silently', async () => {
    const memory = inMemoryRepository();
    await expect(
      deleteProjectUseCase(deps({ projects: memory.repository }), { id: UUID_B }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(memory.calls.delete).toBe(0);
  });
});

describe('the use cases hold ports, not adapters', () => {
  /**
   * The architectural point of this slice: every one of the five runs to
   * completion against an in-memory fake, so the filesystem adapter being
   * blocked on three unresolved prerequisites blocks nothing here.
   */
  it('runs the whole set without any storage implementation', async () => {
    const memory = inMemoryRepository();
    const d = deps({ projects: memory.repository, ids: ids(UUID_A, UUID_B) });

    const created = await createProjectUseCase(d, { name: 'One', schemaVersion: 1 });
    await openProjectUseCase(d, { id: created.id });
    await saveProjectUseCase(d, { id: created.id, name: 'One renamed' });
    const copy = await duplicateProjectUseCase(d, { id: created.id, name: 'Two' });
    expect(await listProjectsUseCase(d)).toHaveLength(2);

    await deleteProjectUseCase(d, { id: copy.id });
    expect(await listProjectsUseCase(d)).toHaveLength(1);
  });
});

describe('ViewProjectList — the traced read failure (RB-2, ADR-003 SR-11)', () => {
  /**
   * A fake tracer, not the real one: DR-02 keeps Infrastructure out of this
   * package, tests included. It records every failure it is handed and mints
   * a visibly distinct value per call, so a use case that cached, reused or
   * substituted a trace ID would show up here.
   */
  function recordingTracer() {
    const traced: unknown[] = [];
    const tracer = {
      trace: (failure: unknown) => {
        traced.push(failure);
        return `trace-${traced.length}`;
      },
    };
    return { tracer, traced };
  }

  /** A repository whose read fails, and which counts any attempt to write. */
  function failingRepository(failure: unknown) {
    const memory = inMemoryRepository();
    const repository: ProjectRepository = {
      ...memory.repository,
      findAll: () => Promise.reject(failure),
    };
    return { repository, calls: memory.calls, store: memory.store };
  }

  const WHERE = 'C:/authoring/projects/3f2504e0-4f89-41d3-9a0c-0305e82c3301.sayva';
  const fileFailure = () =>
    Object.assign(new Error(`Project file "${WHERE}" is not valid JSON.`), {
      path: WHERE,
      digest: '2102856004',
    });

  it('lists the Projects, in PP-04 order, when the read succeeds', async () => {
    const { tracer, traced } = recordingTracer();
    const older = createProject(
      { name: 'Older', schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION },
      { ids: ids(UUID_A), clock: clockAt('2026-09-01T10:00:00.000Z') },
    );
    const newer = createProject(
      { name: 'Newer', schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION },
      { ids: ids(UUID_B), clock: clockAt('2026-09-20T10:00:00.000Z') },
    );

    const view = await viewProjectListUseCase({
      ...deps({ projects: inMemoryRepository([older, newer]).repository }),
      tracer,
    });

    expect(view).toEqual({
      status: 'listed',
      projects: [
        expect.objectContaining({ name: 'Newer' }),
        expect.objectContaining({ name: 'Older' }),
      ],
    });
    // Nothing failed, so nothing is traced.
    expect(traced).toEqual([]);
  });

  it('returns the error state carrying the trace ID the tracer minted', async () => {
    const { tracer } = recordingTracer();
    const { repository } = failingRepository(fileFailure());

    const view = await viewProjectListUseCase({ ...deps({ projects: repository }), tracer });

    expect(view).toEqual({ status: 'error', traceId: 'trace-1' });
  });

  it('keeps that state serializable, so it survives the Server→Client boundary', async () => {
    const { tracer } = recordingTracer();
    const { repository } = failingRepository(fileFailure());

    const view = await viewProjectListUseCase({ ...deps({ projects: repository }), tracer });

    expect(JSON.parse(JSON.stringify(view))).toEqual(view);
  });

  it('asks for a new trace ID for every occurrence', async () => {
    const { tracer } = recordingTracer();
    const { repository } = failingRepository(fileFailure());
    const d = { ...deps({ projects: repository }), tracer };

    const first = await viewProjectListUseCase(d);
    const second = await viewProjectListUseCase(d);

    expect(first).toEqual({ status: 'error', traceId: 'trace-1' });
    expect(second).toEqual({ status: 'error', traceId: 'trace-2' });
  });

  it('hands the tracer the failure itself, once, so the record has the detail', async () => {
    const { tracer, traced } = recordingTracer();
    const failure = fileFailure();
    const { repository } = failingRepository(failure);

    await viewProjectListUseCase({ ...deps({ projects: repository }), tracer });

    expect(traced).toEqual([failure]);
  });

  it('never uses the file path as the trace ID', async () => {
    const { tracer } = recordingTracer();
    const { repository } = failingRepository(fileFailure());

    const view = await viewProjectListUseCase({ ...deps({ projects: repository }), tracer });

    expect(view.status).toBe('error');
    if (view.status !== 'error') return;
    expect(view.traceId).not.toBe(WHERE);
    expect(view.traceId).not.toContain('.sayva');
  });

  it("never uses the framework's error digest as the trace ID", async () => {
    const { tracer } = recordingTracer();
    const { repository } = failingRepository(fileFailure());

    const view = await viewProjectListUseCase({ ...deps({ projects: repository }), tracer });

    expect(view).not.toEqual({ status: 'error', traceId: '2102856004' });
  });

  it('persists nothing: a failed read writes no Project and deletes none', async () => {
    const { tracer } = recordingTracer();
    const { repository, calls, store } = failingRepository(fileFailure());

    await viewProjectListUseCase({ ...deps({ projects: repository }), tracer });

    expect(calls.save).toBe(0);
    expect(calls.delete).toBe(0);
    expect(store.size).toBe(0);
  });

  it('carries only the trace ID in the error state — the location is SR-10, not this', async () => {
    const { tracer } = recordingTracer();
    const { repository } = failingRepository(fileFailure());

    const view = await viewProjectListUseCase({ ...deps({ projects: repository }), tracer });

    expect(Object.keys(view).sort()).toEqual(['status', 'traceId']);
  });
});
