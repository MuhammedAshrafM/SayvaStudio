import { describe, expect, it } from 'vitest';
import {
  createProject,
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
    const source = createProject(
      { name: 'X', schemaVersion: 4 },
      { ids: ids(UUID_A), clock: clockAt('2026-09-01T10:00:00.000Z') },
    );
    const memory = inMemoryRepository([source]);
    const view = await duplicateProjectUseCase(
      deps({ projects: memory.repository, ids: ids(UUID_B) }),
      { id: source.id, name: 'Copy' },
    );
    expect(view.schemaVersion).toBe(4);
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
