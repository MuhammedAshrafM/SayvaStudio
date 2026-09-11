import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createProject,
  renameProject,
  toProjectId,
  CURRENT_PROJECT_SCHEMA_VERSION,
  DomainError,
  type Clock,
  type IdGenerator,
  type Project,
  type ProjectRepository,
} from '@sayva/domain';
import { createFilesystemProjectRepository } from './filesystem-project-repository.js';
import { ProjectFileError } from './project-file-error.js';

/**
 * The filesystem `ProjectRepository` — ADR-003.
 *
 * Every test runs against a real directory on the real filesystem, created
 * fresh per test and removed afterwards. No `fs` mocking: the whole point of
 * this adapter is what actually happens on disk, and a mocked rename would
 * prove nothing about SR-06's crash-safety claim.
 */

const UUID_A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const UUID_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function ids(...queue: string[]): IdGenerator {
  const remaining = [...queue];
  return { newId: () => remaining.shift() ?? UUID_B };
}
const clockAt = (iso: string): Clock => ({ now: () => new Date(iso) });
const AT = '2026-09-11T10:00:00.000Z';

function aProject(name = 'ArSL Curriculum', id = UUID_A, at = AT): Project {
  return createProject(
    { name, schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION },
    { ids: ids(id), clock: clockAt(at) },
  );
}

let root: string;
let repository: ProjectRepository;

beforeEach(async () => {
  // A unique directory per test — tests never see each other's files, and
  // they can run in any order or in parallel.
  root = await mkdtemp(path.join(os.tmpdir(), 'sayva-project-repo-'));
  repository = createFilesystemProjectRepository(root);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/** The raw bytes of a `.sayva` file, for asserting on the format itself. */
const readRaw = (id: string): Promise<string> => readFile(path.join(root, `${id}.sayva`), 'utf8');

/** Writes a fixture file directly, bypassing the adapter. */
const writeRaw = (fileName: string, contents: string): Promise<void> =>
  writeFile(path.join(root, fileName), contents, 'utf8');

describe('round-trip against the real filesystem', () => {
  it('saves a project and reads it back identical', async () => {
    const project = aProject();
    await repository.save(project);

    expect(await repository.findById(project.id)).toEqual(project);
  });

  /**
   * Roadmap Phase 2's integration criterion — "create → save → reopen
   * roundtrip against the real filesystem" — exercised through the port.
   *
   * The same roundtrip driven by the *use cases* cannot live here: DR-02
   * forbids infrastructure from importing @sayva/application, so it belongs
   * wherever both layers are visible at once. The use cases themselves are
   * already covered against an in-memory fake in @sayva/application.
   */
  it('survives create, save, reopen, edit, save, reopen', async () => {
    const created = aProject('ArSL Curriculum');
    await repository.save(created);

    const reopened = await repository.findById(created.id);
    expect(reopened?.name).toBe('ArSL Curriculum');

    const renamed = renameProject(reopened!, 'ArSL Curriculum v2', clockAt('2026-09-12T08:00:00Z'));
    await repository.save(renamed);

    const again = await repository.findById(created.id);
    expect(again?.name).toBe('ArSL Curriculum v2');
    expect(again?.metadata.createdAt).toEqual(created.metadata.createdAt);
    expect(again?.metadata.updatedAt.toISOString()).toBe('2026-09-12T08:00:00.000Z');
  });

  it('preserves dates as Dates, not as the strings they were stored as', async () => {
    const project = aProject();
    await repository.save(project);
    const read = await repository.findById(project.id);

    expect(read?.metadata.createdAt).toBeInstanceOf(Date);
    expect(read?.metadata.createdAt.toISOString()).toBe(AT);
  });

  it('preserves tags and notes when the project carries them', async () => {
    const project = createProject(
      { name: 'X', schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION, tags: ['pilot', 'arsl'] },
      { ids: ids(UUID_A), clock: clockAt(AT) },
    );
    await repository.save(project);

    expect((await repository.findById(project.id))?.metadata.tags).toEqual(['pilot', 'arsl']);
  });

  it('returns null for a project that was never saved', async () => {
    expect(await repository.findById(toProjectId(UUID_B))).toBeNull();
  });
});

describe('the `.sayva` file itself — SR-03', () => {
  it('is one UTF-8 JSON file named after the ProjectId', async () => {
    const project = aProject();
    await repository.save(project);

    expect(await readdir(root)).toEqual([`${UUID_A}.sayva`]);
    expect(JSON.parse(await readRaw(UUID_A))).toMatchObject({ id: UUID_A });
  });

  it('carries exactly the contracted fields and nothing invented', async () => {
    await repository.save(aProject());
    const file = JSON.parse(await readRaw(UUID_A)) as Record<string, unknown>;

    // SR-03 forbids structure the Domain/Application contracts do not
    // require. `notes` is absent because this project has none, and
    // `createdBy` is absent because restoreMetadata cannot read it back.
    expect(Object.keys(file).sort()).toEqual([
      'createdAt',
      'id',
      'name',
      'schemaVersion',
      'state',
      'tags',
      'updatedAt',
    ]);
  });

  it('writes the current schema version, not whatever it was loaded with', async () => {
    await repository.save(aProject());
    const file = JSON.parse(await readRaw(UUID_A)) as { schemaVersion: number };
    expect(file.schemaVersion).toBe(CURRENT_PROJECT_SCHEMA_VERSION);
  });

  it('omits notes entirely rather than writing null', async () => {
    await repository.save(aProject());
    expect(await readRaw(UUID_A)).not.toContain('notes');
  });
});

describe('findAll', () => {
  it('returns every project in the workspace root', async () => {
    await repository.save(aProject('One', UUID_A));
    await repository.save(aProject('Two', UUID_B));

    const names = (await repository.findAll()).map((p) => p.name).sort();
    expect(names).toEqual(['One', 'Two']);
  });

  it('treats a root that does not exist yet as an empty workspace', async () => {
    const missing = createFilesystemProjectRepository(path.join(root, 'not-created-yet'));
    await expect(missing.findAll()).resolves.toEqual([]);
  });

  it('returns an empty list for an empty root', async () => {
    await expect(repository.findAll()).resolves.toEqual([]);
  });

  it('ignores files that are not projects, and directories', async () => {
    await repository.save(aProject());
    await writeRaw('notes.txt', 'not a project');
    await writeRaw('.DS_Store', 'noise');
    // The sibling Assets/ directory Phase 12's bundle describes.
    await mkdir(path.join(root, 'Assets'));

    expect(await repository.findAll()).toHaveLength(1);
  });

  it('does not mistake a directory named like a project file for one', async () => {
    await mkdir(path.join(root, `${UUID_B}.sayva`));
    await expect(repository.findAll()).resolves.toEqual([]);
  });
});

describe('delete', () => {
  it('removes the file from disk', async () => {
    const project = aProject();
    await repository.save(project);
    await repository.delete(project.id);

    expect(await readdir(root)).toEqual([]);
    expect(await repository.findById(project.id)).toBeNull();
  });

  it('leaves other projects alone', async () => {
    await repository.save(aProject('One', UUID_A));
    await repository.save(aProject('Two', UUID_B));
    await repository.delete(toProjectId(UUID_A));

    expect((await repository.findAll()).map((p) => p.name)).toEqual(['Two']);
  });

  it('is idempotent — deleting what is already gone succeeds', async () => {
    await expect(repository.delete(toProjectId(UUID_B))).resolves.toBeUndefined();
  });
});

describe('atomic writes — SR-06', () => {
  it('leaves no temporary file behind after a successful save', async () => {
    await repository.save(aProject());
    expect(await readdir(root)).toEqual([`${UUID_A}.sayva`]);
  });

  it('replaces an existing project file rather than failing on it', async () => {
    // A rename over an existing destination: this is the assertion that
    // proves the strategy works on this platform, not only in theory.
    await repository.save(aProject('First'));
    await repository.save(aProject('Second'));

    expect((await repository.findById(toProjectId(UUID_A)))?.name).toBe('Second');
    expect(await readdir(root)).toEqual([`${UUID_A}.sayva`]);
  });

  /**
   * The actual guarantee SR-06 buys, tested as the observable thing it is.
   *
   * A crash between the write and the rename leaves a temporary file. These
   * two tests stand in for that crash by planting exactly what it would
   * leave behind, and assert the repository is blind to it.
   */
  it('ignores the debris an interrupted write leaves', async () => {
    await writeRaw(`${UUID_B}.sayva.abc-123.tmp`, 'half a proj');

    expect(await repository.findAll()).toEqual([]);
    expect(await repository.findById(toProjectId(UUID_B))).toBeNull();
  });

  it('leaves the previously saved project readable after an interrupted write', async () => {
    const project = aProject('Saved earlier');
    await repository.save(project);
    await writeRaw(`${UUID_A}.sayva.abc-123.tmp`, '{"schemaVersion": 1, "id": "trunc');

    expect((await repository.findById(project.id))?.name).toBe('Saved earlier');
    expect(await repository.findAll()).toHaveLength(1);
  });
});

describe('corrupt and invalid files', () => {
  /** Plants a file under a given id and reads it back through the adapter. */
  const readBack = async (contents: string, id = UUID_A): Promise<Project | null> => {
    await writeRaw(`${id}.sayva`, contents);
    return repository.findById(toProjectId(id));
  };

  it('rejects a file that is not JSON, naming the file', async () => {
    await expect(readBack('{ not json at all')).rejects.toThrow(ProjectFileError);
    await expect(readBack('{ not json at all')).rejects.toThrow(/not valid JSON/);
    await expect(readBack('{ not json at all')).rejects.toThrow(`${UUID_A}.sayva`);
  });

  it('keeps the underlying failure as `cause`', async () => {
    await writeRaw(`${UUID_A}.sayva`, '{ not json');
    const error = await repository.findById(toProjectId(UUID_A)).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProjectFileError);
    expect((error as ProjectFileError).cause).toBeInstanceOf(SyntaxError);
    expect((error as ProjectFileError).path).toBe(path.join(root, `${UUID_A}.sayva`));
  });

  it.each([
    ['a JSON string', '"just a string"'],
    ['a JSON array', '[]'],
    ['JSON null', 'null'],
    ['a number', '42'],
  ])('rejects %s where an object belongs', async (_label, contents) => {
    await expect(readBack(contents)).rejects.toThrow(ProjectFileError);
  });

  const valid = {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    id: UUID_A,
    name: 'ArSL Curriculum',
    state: 'Created',
    createdAt: AT,
    updatedAt: AT,
    tags: [],
  };

  it.each([
    ['schemaVersion', 'missing'],
    ['id', 'missing'],
    ['name', 'missing'],
    ['state', 'missing'],
    ['createdAt', 'missing'],
    ['updatedAt', 'missing'],
    ['tags', 'missing'],
  ])('rejects a file with "%s" %s', async (field) => {
    const withoutField: Record<string, unknown> = { ...valid };
    delete withoutField[field];
    await expect(readBack(JSON.stringify(withoutField))).rejects.toThrow(ProjectFileError);
  });

  it.each([
    ['schemaVersion', '"1"'],
    ['id', '42'],
    ['name', '{}'],
    ['state', '7'],
    ['createdAt', 'true'],
    ['tags', '"pilot"'],
    ['tags', '[1, 2]'],
    ['notes', '99'],
  ])('rejects "%s" holding %s', async (field, json) => {
    const contents = JSON.stringify({ ...valid, [field]: JSON.parse(json) });
    await expect(readBack(contents)).rejects.toThrow(ProjectFileError);
  });

  it('rejects an unparseable timestamp', async () => {
    await expect(readBack(JSON.stringify({ ...valid, createdAt: 'nonsense' }))).rejects.toThrow(
      ProjectFileError,
    );
  });

  it('rejects a state this build does not know', async () => {
    await expect(readBack(JSON.stringify({ ...valid, state: 'Published' }))).rejects.toThrow(
      /Unknown Project state/,
    );
  });

  it('lets a Domain invariant failure through as the cause', async () => {
    await writeRaw(`${UUID_A}.sayva`, JSON.stringify({ ...valid, name: '   ' }));
    const error = await repository.findById(toProjectId(UUID_A)).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProjectFileError);
    expect((error as ProjectFileError).cause).toBeInstanceOf(DomainError);
    expect((error as ProjectFileError).message).toMatch(/name is required/i);
  });

  it('fails findAll loudly rather than hiding an unreadable project', async () => {
    await repository.save(aProject('Readable', UUID_A));
    await writeRaw(`${UUID_B}.sayva`, '{ corrupt');

    // Documented in ADR-003: skipping would be indistinguishable from the
    // project having been deleted.
    await expect(repository.findAll()).rejects.toThrow(ProjectFileError);
  });

  it('rejects a file whose id disagrees with its name — SR-04', async () => {
    // Exactly what copying a.sayva to b.sayva produces.
    await writeRaw(`${UUID_B}.sayva`, JSON.stringify(valid));

    await expect(repository.findById(toProjectId(UUID_B))).rejects.toThrow(
      /contains project ".*", but its name claims/,
    );
  });
});

describe('incompatible schema versions — SR-07', () => {
  const future = {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION + 1,
    id: UUID_A,
    name: 'From a newer Studio',
    state: 'Created',
    createdAt: AT,
    updatedAt: AT,
    tags: [],
  };

  it('refuses a project written by a newer build, naming both versions', async () => {
    await writeRaw(`${UUID_A}.sayva`, JSON.stringify(future));

    await expect(repository.findById(toProjectId(UUID_A))).rejects.toThrow(
      /schemaVersion 2 is newer than this Studio build can read \(supports up to 1\)/,
    );
  });

  it('reports it as a ProjectFileError with the DomainError as cause', async () => {
    await writeRaw(`${UUID_A}.sayva`, JSON.stringify(future));
    const error = await repository.findById(toProjectId(UUID_A)).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProjectFileError);
    expect((error as ProjectFileError).cause).toBeInstanceOf(DomainError);
  });

  /**
   * The ordering half of SR-07, and the reason the gate is checked first.
   *
   * A version-2 file is allowed to contain things this build has never heard
   * of. Reporting "Unknown Project state" would send whoever has to act on
   * it after the wrong problem entirely.
   */
  it('blames the version, not the unfamiliar state a newer format brought with it', async () => {
    await writeRaw(
      `${UUID_A}.sayva`,
      JSON.stringify({ ...future, state: 'SomeFutureState', tags: ['still-fine'] }),
    );

    await expect(repository.findById(toProjectId(UUID_A))).rejects.toThrow(
      /newer than this Studio build can read/,
    );
  });

  it('blames the version even when the newer format reshaped a field', async () => {
    await writeRaw(
      `${UUID_A}.sayva`,
      JSON.stringify({ ...future, name: { base: 'ArSL', locales: {} } }),
    );

    await expect(repository.findById(toProjectId(UUID_A))).rejects.toThrow(
      /newer than this Studio build can read/,
    );
  });

  it('still reads a file at the current version', async () => {
    await writeRaw(`${UUID_A}.sayva`, JSON.stringify({ ...future, schemaVersion: 1 }));
    expect((await repository.findById(toProjectId(UUID_A)))?.name).toBe('From a newer Studio');
  });

  it('fails findAll on a newer file too', async () => {
    await writeRaw(`${UUID_A}.sayva`, JSON.stringify(future));
    await expect(repository.findAll()).rejects.toThrow(/newer than this Studio build can read/);
  });
});

describe('the workspace root — SR-05', () => {
  it('is required, and an empty one is refused rather than defaulting to cwd', () => {
    expect(() => createFilesystemProjectRepository('')).toThrow(/needs a workspace root/);
    expect(() => createFilesystemProjectRepository('   ')).toThrow(/needs a workspace root/);
  });

  it('creates the root on first save rather than requiring it to exist', async () => {
    const nested = path.join(root, 'workspaces', 'author-one');
    const fresh = createFilesystemProjectRepository(nested);

    await fresh.save(aProject());
    expect(await readdir(nested)).toEqual([`${UUID_A}.sayva`]);
  });

  it('keeps two roots completely independent', async () => {
    const other = createFilesystemProjectRepository(path.join(root, 'other'));
    await repository.save(aProject('Mine', UUID_A));
    await other.save(aProject('Theirs', UUID_B));

    expect((await repository.findAll()).map((p) => p.name)).toEqual(['Mine']);
    expect((await other.findAll()).map((p) => p.name)).toEqual(['Theirs']);
  });

  it('accepts a relative root, resolving it once at construction', async () => {
    const relative = path.relative(process.cwd(), path.join(root, 'relative'));
    const fresh = createFilesystemProjectRepository(relative);

    await fresh.save(aProject());
    expect(await readdir(path.join(root, 'relative'))).toEqual([`${UUID_A}.sayva`]);
  });
});
