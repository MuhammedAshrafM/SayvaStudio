import { describe, expect, it } from 'vitest';
import {
  createProject,
  restoreProject,
  CURRENT_PROJECT_SCHEMA_VERSION,
  DomainError,
  ProjectFileFailure,
  type Clock,
  type IdGenerator,
  type Project,
  type ProjectId,
  type ProjectRepository,
} from '@sayva/domain';
import { ProjectNotFoundError, toProjectView } from './project-models.js';
import {
  createProjectUseCase,
  deleteProjectUseCase,
  duplicateProjectUseCase,
  listProjectsUseCase,
  openProjectUseCase,
  saveProjectUseCase,
  viewProjectListUseCase,
  type CreateProjectRequest,
  type CreateProjectUseCaseDeps,
  type OpenProjectUseCaseDeps,
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

describe('CreateProject — the Create command (Create decision closure B9, B10)', () => {
  /**
   * A recording tracer, the same shape as the list query's below: it mints a
   * visibly distinct value per call, so a command that cached, reused or
   * invented a trace ID would show up.
   */
  function createDeps(overrides: Partial<CreateProjectUseCaseDeps> = {}) {
    const traced: unknown[] = [];
    const memory = inMemoryRepository();
    const d: CreateProjectUseCaseDeps = {
      ...deps({ projects: memory.repository }),
      tracer: {
        trace: (failure: unknown) => {
          traced.push(failure);
          return `trace-${traced.length}`;
        },
      },
      ...overrides,
    };
    return { d, memory, traced };
  }

  /** A repository whose `save` fails the way the port's contract says it can. */
  function failingSaves(failure: () => unknown): ProjectRepository {
    const { repository } = inMemoryRepository();
    return { ...repository, save: () => Promise.reject(failure()) };
  }

  const WHERE = '/workspace/3f2504e0-4f89-41d3-9a0c-0305e82c3301.sayva';

  it('creates and persists a Project, and reports it created', async () => {
    const { d, memory } = createDeps();
    const result = await createProjectUseCase(d, { name: 'ArSL Curriculum' });

    expect(result.status).toBe('created');
    expect(memory.calls.save).toBe(1);
    expect(memory.store.get(UUID_A)?.name).toBe('ArSL Curriculum');
  });

  it('keeps the name Domain keeps — trimmed', async () => {
    const { d, memory } = createDeps();
    await createProjectUseCase(d, { name: '  ArSL Curriculum  ' });
    expect(memory.store.get(UUID_A)?.name).toBe('ArSL Curriculum');
  });

  it("supplies the schema version itself — the build's (B9, SR-07)", async () => {
    const { d, memory } = createDeps();
    const result = await createProjectUseCase(d, { name: 'X' });

    expect(result).toMatchObject({
      status: 'created',
      project: { schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION },
    });
    expect(memory.store.get(UUID_A)?.schemaVersion).toBe(CURRENT_PROJECT_SCHEMA_VERSION);
  });

  it('cannot be handed a schema version or tags by its caller (B9)', async () => {
    const { d, memory } = createDeps();

    // @ts-expect-error — B9: the request is `{ name }`; the caller has no schemaVersion to give.
    const typed: CreateProjectRequest = { name: 'X', schemaVersion: 99 };
    void typed;

    // And at runtime, extra fields smuggled past the type are ignored.
    const smuggled = { name: 'X', schemaVersion: 99, tags: ['injected'] } as CreateProjectRequest;
    await createProjectUseCase(d, smuggled);

    const stored = memory.store.get(UUID_A);
    expect(stored?.schemaVersion).toBe(CURRENT_PROJECT_SCHEMA_VERSION);
    expect(stored?.metadata.tags).toEqual([]);
  });

  it('takes identity and time from the IdGenerator and Clock ports', async () => {
    const { d } = createDeps({ ids: ids(UUID_B), clock: clockAt('2031-03-10T08:00:00.000Z') });
    const result = await createProjectUseCase(d, { name: 'X' });

    expect(result).toMatchObject({
      status: 'created',
      project: {
        id: UUID_B,
        state: 'Created',
        createdAt: '2031-03-10T08:00:00.000Z',
        updatedAt: '2031-03-10T08:00:00.000Z',
      },
    });
  });

  it('returns a serializable Response Model, never the Domain entity (AD-02)', async () => {
    const { d } = createDeps();
    const result = await createProjectUseCase(d, { name: 'X' });

    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(result.status === 'created' && result.project).not.toHaveProperty('metadata');
  });

  it.each(['', '   ', '\t\n'])(
    'reports %j as invalid-name, and writes and traces nothing',
    async (name) => {
      const { d, memory, traced } = createDeps();

      expect(await createProjectUseCase(d, { name })).toEqual({ status: 'invalid-name' });
      expect(memory.calls.save).toBe(0);
      expect(traced).toEqual([]);
    },
  );

  it('rethrows any other Domain failure as a defect, untraced — it is not a name problem', async () => {
    // A broken IdGenerator: Domain refuses the id, which is not the name rule.
    const { d, memory, traced } = createDeps({ ids: ids('not-a-uuid') });

    await expect(createProjectUseCase(d, { name: 'ArSL Curriculum' })).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(memory.calls.save).toBe(0);
    expect(traced).toEqual([]);
  });

  it('reports a ProjectFileFailure as write-failed, with its location and a minted trace ID', async () => {
    const failure = new ProjectFileFailure('could not be written', WHERE);
    const { d, traced } = createDeps({ projects: failingSaves(() => failure) });

    expect(await createProjectUseCase(d, { name: 'X' })).toEqual({
      status: 'write-failed',
      traceId: 'trace-1',
      location: WHERE,
    });
    // The tracer is handed the failure itself, once, so its record has the detail.
    expect(traced).toEqual([failure]);
  });

  it('asks for a new trace ID for every failed write — occurrence, not kind', async () => {
    const { d } = createDeps({
      projects: failingSaves(() => new ProjectFileFailure('could not be written', WHERE)),
    });

    const first = await createProjectUseCase(d, { name: 'X' });
    const second = await createProjectUseCase(d, { name: 'X' });

    expect(first).toMatchObject({ status: 'write-failed', traceId: 'trace-1' });
    expect(second).toMatchObject({ status: 'write-failed', traceId: 'trace-2' });
  });

  it('carries nothing out of a failed write but its status, trace ID and location', async () => {
    const { d } = createDeps({
      projects: failingSaves(
        () => new ProjectFileFailure('could not be written', WHERE, { cause: new Error('EACCES') }),
      ),
    });
    const result = await createProjectUseCase(d, { name: 'X' });

    expect(Object.keys(result).sort()).toEqual(['location', 'status', 'traceId']);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it('rethrows a write failure that is not the port contract, untraced', async () => {
    const { d, traced } = createDeps({ projects: failingSaves(() => new TypeError('a defect')) });

    await expect(createProjectUseCase(d, { name: 'X' })).rejects.toBeInstanceOf(TypeError);
    expect(traced).toEqual([]);
  });

  it('traces nothing when the write succeeds', async () => {
    const { d, traced } = createDeps();
    await createProjectUseCase(d, { name: 'X' });
    expect(traced).toEqual([]);
  });
});

describe('OpenProject — result and tracing (ADR-005 OP-09)', () => {
  /**
   * A recording tracer, the same shape as the Create and list ones: a
   * visibly distinct value per call, so a use case that cached, reused or
   * invented a trace ID would show up.
   */
  function openDeps(repository: ProjectRepository) {
    const traced: unknown[] = [];
    const d: OpenProjectUseCaseDeps = {
      ...deps({ projects: repository }),
      tracer: {
        trace: (failure: unknown) => {
          traced.push(failure);
          return `trace-${traced.length}`;
        },
      },
    };
    return { d, traced };
  }

  /** Counts reads, so "no repository call" is an observation, not an assumption. */
  function counted(repository: ProjectRepository) {
    const reads: string[] = [];
    const counting: ProjectRepository = {
      ...repository,
      findById: (id: ProjectId) => {
        reads.push(id);
        return repository.findById(id);
      },
    };
    return { repository: counting, reads };
  }

  const WHERE = 'C:/authoring/projects/3f2504e0-4f89-41d3-9a0c-0305e82c3301.sayva';
  /** The port's failure contract (SR-10), with a framework-style digest attached. */
  const fileFailure = () =>
    Object.assign(new ProjectFileFailure(`Project file "${WHERE}" is not valid JSON.`, WHERE), {
      digest: '2102856004',
    });

  /** A repository whose read fails with `failure`, and which still counts writes. */
  function failingReads(failure: () => unknown) {
    const memory = inMemoryRepository();
    const repository: ProjectRepository = {
      ...memory.repository,
      findById: () => Promise.reject(failure()),
    };
    return { repository, calls: memory.calls };
  }

  const MALFORMED = ['not-a-uuid', '', ` ${UUID_A}`, `${UUID_A}.sayva`, `../${UUID_A}`];

  it('opens a readable Project as its Response Model', async () => {
    const { project, repository } = seeded();
    const { repository: reading, reads } = counted(repository);
    const { d, traced } = openDeps(reading);

    const result = await openProjectUseCase(d, { id: project.id });

    expect(result).toEqual({ status: 'opened', project: toProjectView(project) });
    expect(reads).toEqual([project.id]);
    expect(traced).toEqual([]);
  });

  it.each(MALFORMED)('a malformed id (%j) is not here — no read, no trace', async (id) => {
    const { repository, reads } = counted(inMemoryRepository().repository);
    const { d, traced } = openDeps(repository);

    const result = await openProjectUseCase(d, { id });

    expect(result).toEqual({ status: 'not-here' });
    expect(reads).toEqual([]);
    expect(traced).toEqual([]);
  });

  it('never echoes the id it was given', async () => {
    const { d } = openDeps(inMemoryRepository().repository);
    for (const id of ['../../etc/passwd-not-a-uuid', UUID_B]) {
      const result = await openProjectUseCase(d, { id });
      expect(JSON.stringify(result)).not.toContain(id);
    }
  });

  it('an id nothing answers to is not here, untraced', async () => {
    const { repository, reads } = counted(inMemoryRepository().repository);
    const { d, traced } = openDeps(repository);

    const result = await openProjectUseCase(d, { id: UUID_B });

    expect(result).toEqual({ status: 'not-here' });
    expect(reads).toEqual([UUID_B]);
    expect(traced).toEqual([]);
  });

  it('a ProjectFileFailure is cant-read, traced exactly once with its location', async () => {
    const failure = fileFailure();
    const { repository } = failingReads(() => failure);
    const { d, traced } = openDeps(repository);

    const result = await openProjectUseCase(d, { id: UUID_A });

    expect(result).toEqual({ status: 'cant-read', traceId: 'trace-1', location: WHERE });
    expect(traced).toHaveLength(1);
    expect(traced[0]).toBe(failure);
    expect(JSON.stringify(result)).not.toContain('2102856004');
  });

  it('each failed open is its own occurrence, with its own trace ID', async () => {
    const { repository } = failingReads(fileFailure);
    const { d, traced } = openDeps(repository);

    const first = await openProjectUseCase(d, { id: UUID_A });
    const second = await openProjectUseCase(d, { id: UUID_A });

    expect(first).toMatchObject({ status: 'cant-read', traceId: 'trace-1' });
    expect(second).toMatchObject({ status: 'cant-read', traceId: 'trace-2' });
    expect(traced).toHaveLength(2);
  });

  it.each([
    ['a plain Error', () => new Error('adapter bug')],
    ['a DomainError', () => new DomainError('an invariant this read should never meet')],
  ])('rethrows %s untraced — a defect, not a read failure', async (_name, make) => {
    const error = make();
    const { repository } = failingReads(() => error);
    const { d, traced } = openDeps(repository);

    await expect(openProjectUseCase(d, { id: UUID_A })).rejects.toBe(error);
    expect(traced).toEqual([]);
  });

  it('never writes, whatever the outcome', async () => {
    const opened = seeded();
    await openProjectUseCase(openDeps(opened.repository).d, { id: opened.project.id });
    await openProjectUseCase(openDeps(opened.repository).d, { id: UUID_B });
    await openProjectUseCase(openDeps(opened.repository).d, { id: 'not-a-uuid' });
    expect(opened.calls).toEqual({ save: 0, delete: 0 });

    const failing = failingReads(fileFailure);
    await openProjectUseCase(openDeps(failing.repository).d, { id: UUID_A });
    expect(failing.calls).toEqual({ save: 0, delete: 0 });
  });

  it('every outcome survives a serialization boundary unchanged, carrying only its own fields', async () => {
    const { project, repository } = seeded();
    const results = [
      await openProjectUseCase(openDeps(repository).d, { id: project.id }),
      await openProjectUseCase(openDeps(repository).d, { id: UUID_B }),
      await openProjectUseCase(openDeps(failingReads(fileFailure).repository).d, { id: UUID_A }),
    ];

    expect(results.map((r) => r.status)).toEqual(['opened', 'not-here', 'cant-read']);
    expect(results.map((r) => Object.keys(r).sort())).toEqual([
      ['project', 'status'],
      ['status'],
      ['location', 'status', 'traceId'],
    ]);
    for (const result of results) expect(JSON.parse(JSON.stringify(result))).toEqual(result);
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
    const untraced = { trace: () => 'unused' };

    const result = await createProjectUseCase({ ...d, tracer: untraced }, { name: 'One' });
    if (result.status !== 'created') throw new Error(`expected created, got ${result.status}`);
    const created = result.project;
    const opened = await openProjectUseCase({ ...d, tracer: untraced }, { id: created.id });
    expect(opened.status).toBe('opened');
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
  /**
   * The port's failure contract (ADR-003 SR-10), as the repository throws it.
   * A framework-style `digest` is attached so the tests can prove it is never
   * what reaches the screen.
   */
  const fileFailure = () =>
    Object.assign(new ProjectFileFailure(`Project file "${WHERE}" is not valid JSON.`, WHERE), {
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

    expect(view).toEqual({ status: 'error', traceId: 'trace-1', location: WHERE });
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

    expect(first).toEqual({ status: 'error', traceId: 'trace-1', location: WHERE });
    expect(second).toEqual({ status: 'error', traceId: 'trace-2', location: WHERE });
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
    // The path is in the state — as the location, where SR-10 puts it — and
    // nowhere else.
    expect(view.location).toBe(WHERE);
    expect(view.traceId).not.toBe(WHERE);
    expect(view.traceId).not.toContain('.sayva');
  });

  it("never uses the framework's error digest as the trace ID", async () => {
    const { tracer } = recordingTracer();
    const { repository } = failingRepository(fileFailure());

    const view = await viewProjectListUseCase({ ...deps({ projects: repository }), tracer });

    expect(view.status).toBe('error');
    if (view.status !== 'error') return;
    expect(view.traceId).not.toBe('2102856004');
    expect(view.location).not.toBe('2102856004');
  });

  it('persists nothing: a failed read writes no Project and deletes none', async () => {
    const { tracer } = recordingTracer();
    const { repository, calls, store } = failingRepository(fileFailure());

    await viewProjectListUseCase({ ...deps({ projects: repository }), tracer });

    expect(calls.save).toBe(0);
    expect(calls.delete).toBe(0);
    expect(store.size).toBe(0);
  });

  it('carries the trace ID and the location in the error state, and nothing else', async () => {
    // SR-10 adds the location to what RB-2 shipped; the two stay separate.
    const { tracer } = recordingTracer();
    const { repository } = failingRepository(fileFailure());

    const view = await viewProjectListUseCase({ ...deps({ projects: repository }), tracer });

    expect(Object.keys(view).sort()).toEqual(['location', 'status', 'traceId']);
  });

  it('carries whatever location the failure names — the folder, when the folder is the problem', async () => {
    const { tracer } = recordingTracer();
    const folder = 'C:/authoring/projects';
    const { repository } = failingRepository(
      new ProjectFileFailure(`Project file "${folder}" could not be listed.`, folder),
    );

    const view = await viewProjectListUseCase({ ...deps({ projects: repository }), tracer });

    expect(view).toEqual({ status: 'error', traceId: 'trace-1', location: folder });
  });

  it('rethrows anything that is not a read failure, untraced', async () => {
    // A defect is not "Can't read the projects folder". Showing it as one
    // would name the wrong problem, so it is not caught at all.
    const { tracer, traced } = recordingTracer();
    const defect = new TypeError('Cannot read properties of undefined');
    const { repository } = failingRepository(defect);

    await expect(
      viewProjectListUseCase({ ...deps({ projects: repository }), tracer }),
    ).rejects.toBe(defect);
    expect(traced).toEqual([]);
  });
});

describe('ViewProjectList — first-run and listed states (read-only Picker slice)', () => {
  const noTracing = { trace: () => 'unused' };
  const at = (iso: string) => ({ ids: ids(UUID_A), clock: clockAt(iso) });

  it('is the first-run state when the workspace holds no Projects', async () => {
    const view = await viewProjectListUseCase({ ...deps(), tracer: noTracing });
    expect(view).toEqual({ status: 'first-run' });
  });

  it('never returns an empty list — an empty workspace is first-run, not a bare list', async () => {
    const view = await viewProjectListUseCase({ ...deps(), tracer: noTracing });
    expect(view).not.toHaveProperty('projects');
  });

  it('gives each row exactly what the row shows, and no more', async () => {
    // Dates far from the real calendar on purpose: a query that read the wall
    // clock instead of the Clock port would then disagree with this one. With
    // dates near today the two can coincide, and the defect goes unseen.
    const project = createProject(
      { name: 'ArSL Curriculum', schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION },
      at('2031-03-10T09:00:00.000Z'),
    );

    const view = await viewProjectListUseCase({
      ...deps({
        projects: inMemoryRepository([project]).repository,
        clock: clockAt('2031-03-13T09:00:00.000Z'),
      }),
      tracer: noTracing,
    });

    expect(view).toEqual({
      status: 'listed',
      projects: [
        {
          id: UUID_A,
          name: 'ArSL Curriculum',
          updatedAt: '2031-03-10T09:00:00.000Z',
          updatedAgo: '3d ago',
        },
      ],
    });
  });

  it('measures every row against the same instant', async () => {
    let calls = 0;
    const countingClock: Clock = {
      now: () => {
        calls += 1;
        return new Date('2026-09-28T09:00:00.000Z');
      },
    };
    const a = createProject({ name: 'A', schemaVersion: 1 }, at('2026-09-28T08:00:00.000Z'));
    const b = createProject(
      { name: 'B', schemaVersion: 1 },
      { ids: ids(UUID_B), clock: clockAt('2026-09-14T09:00:00.000Z') },
    );

    const view = await viewProjectListUseCase({
      ...deps({ projects: inMemoryRepository([a, b]).repository, clock: countingClock }),
      tracer: noTracing,
    });

    expect(calls).toBe(1);
    expect(view.status === 'listed' && view.projects.map((row) => row.updatedAgo)).toEqual([
      '1h ago',
      '2w ago',
    ]);
  });

  it('keeps the listed state serializable', async () => {
    const project = createProject({ name: 'X', schemaVersion: 1 }, at('2026-09-25T09:00:00.000Z'));
    const view = await viewProjectListUseCase({
      ...deps({ projects: inMemoryRepository([project]).repository }),
      tracer: noTracing,
    });
    expect(JSON.parse(JSON.stringify(view))).toEqual(view);
  });
});
