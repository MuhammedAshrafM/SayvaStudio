// @vitest-environment node
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// Relative, not `@/`: tsconfig.json excludes test files, and the alias is
// resolved for the files it includes.
import { WORKSPACE_ROOT_ENV, resetCompositionRoot } from '../composition-root';
import { duplicateProjectAction } from './duplicate-project-action';

/**
 * The Duplicate command's action — D1–D10 — against the real Composition
 * Root, the real adapters and a temporary workspace.
 *
 * `server-only` is stubbed, exactly as the Composition Root's own test does.
 * Nothing else is replaced. The source is written by hand, as a `.sayva`
 * file another build or an earlier session could have left, so what the copy
 * keeps and drops is read from disk rather than from a Response Model.
 */
vi.mock('server-only', () => ({}));

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'sayva-duplicate-action-'));
  vi.stubEnv(WORKSPACE_ROOT_ENV, root);
  resetCompositionRoot();
});

afterEach(async () => {
  resetCompositionRoot();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

/**
 * This build's `CURRENT_PROJECT_SCHEMA_VERSION` (ADR-003 SR-07). Stated here
 * rather than imported: the app reaches Domain only through Application.
 */
const SCHEMA_VERSION = 1;

const SOURCE_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const CORRUPT_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const sourceFile = () => path.join(root, `${SOURCE_ID}.sayva`);
const traces = () => vi.spyOn(console, 'error').mockImplementation(() => {});

/** A source with tags and notes, in the `.sayva` format ADR-003 SR-03 fixes. */
async function aSource() {
  const contents = `${JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      id: SOURCE_ID,
      name: 'BSL Pilot',
      state: 'Created',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-02T10:00:00.000Z',
      tags: ['bsl', 'pilot'],
      notes: 'Reviewed by the deaf advisory group.',
    },
    null,
    2,
  )}\n`;
  await writeFile(sourceFile(), contents, 'utf8');
  return contents;
}

/** Every file in the workspace with its bytes and modification time. */
async function snapshot(): Promise<string> {
  const names = (await readdir(root)).sort();
  const files = await Promise.all(
    names.map(async (name) => {
      const file = path.join(root, name);
      return `${name}|${(await stat(file)).mtimeMs}|${await readFile(file, 'utf8')}`;
    }),
  );
  return files.join('\n');
}

describe('duplicateProjectAction — the Duplicate command, delivered to the Picker', () => {
  it('writes exactly one new .sayva file, and leaves the source byte-identical', async () => {
    const original = await aSource();
    const before = (await stat(sourceFile())).mtimeMs;

    const result = await duplicateProjectAction(SOURCE_ID, 'BSL Pilot — Spring');
    if (result.status !== 'duplicated')
      throw new Error(`expected duplicated, got ${result.status}`);

    expect((await readdir(root)).sort()).toEqual(
      [`${SOURCE_ID}.sayva`, `${result.project.id}.sayva`].sort(),
    );
    expect(await readFile(sourceFile(), 'utf8')).toBe(original);
    expect((await stat(sourceFile())).mtimeMs).toBe(before);
  });

  it('writes the copy the closure’s copy table describes', async () => {
    await aSource();
    const result = await duplicateProjectAction(SOURCE_ID, '  BSL Pilot — Spring  ');
    if (result.status !== 'duplicated')
      throw new Error(`expected duplicated, got ${result.status}`);

    const written = JSON.parse(
      await readFile(path.join(root, `${result.project.id}.sayva`), 'utf8'),
    ) as Record<string, unknown>;

    expect(written.id).not.toBe(SOURCE_ID);
    expect(written.name).toBe('BSL Pilot — Spring');
    expect(written.schemaVersion).toBe(SCHEMA_VERSION);
    expect(written.state).toBe('Created');
    expect(written.createdAt).not.toBe('2026-09-01T10:00:00.000Z');
    expect(written.updatedAt).toBe(written.createdAt);
    expect(written.tags).toEqual(['bsl', 'pilot']);
    expect('notes' in written).toBe(false);
    // Nothing else crosses: no Languages or Assets exist in this phase to copy.
    expect(Object.keys(written).sort()).toEqual(
      ['createdAt', 'id', 'name', 'schemaVersion', 'state', 'tags', 'updatedAt'].sort(),
    );
    expect(result.project).toMatchObject({
      id: written.id,
      name: 'BSL Pilot — Spring',
      tags: ['bsl', 'pilot'],
    });
  });

  it.each([[''], ['   ']])(
    'answers invalid-name for %j, writing nothing and tracing nothing',
    async (name) => {
      await aSource();
      const diagnostics = traces();
      const before = await snapshot();

      expect(await duplicateProjectAction(SOURCE_ID, name)).toEqual({ status: 'invalid-name' });
      expect(await snapshot()).toBe(before);
      expect(diagnostics).not.toHaveBeenCalled();
    },
  );

  it('checks the name before the source: an empty name for an unreadable source is invalid-name, untraced', async () => {
    await writeFile(path.join(root, `${CORRUPT_ID}.sayva`), '{ not json', 'utf8');
    const diagnostics = traces();

    expect(await duplicateProjectAction(CORRUPT_ID, '')).toEqual({ status: 'invalid-name' });
    expect(diagnostics).not.toHaveBeenCalled();
  });

  it.each([['00000000-0000-4000-8000-000000000000'], ['not-a-uuid'], ['../../etc/passwd']])(
    'answers not-here for a source no file holds (%j), untraced, writing nothing',
    async (id) => {
      await aSource();
      const diagnostics = traces();
      const before = await snapshot();

      expect(await duplicateProjectAction(id, 'Copy')).toEqual({ status: 'not-here' });
      expect(await snapshot()).toBe(before);
      expect(diagnostics).not.toHaveBeenCalled();
    },
  );

  it('answers cant-read with the location and one trace ID for an unreadable source', async () => {
    const file = path.join(root, `${CORRUPT_ID}.sayva`);
    await writeFile(file, '{ not json', 'utf8');
    const diagnostics = traces();
    const before = await snapshot();

    const result = await duplicateProjectAction(CORRUPT_ID, 'Copy');

    if (result.status !== 'cant-read') throw new Error(`expected cant-read, got ${result.status}`);
    expect(result.location).toBe(file);
    expect(diagnostics).toHaveBeenCalledTimes(1);
    expect(diagnostics.mock.calls[0]?.[0]).toBe(`Trace ID ${result.traceId}`);
    expect(await snapshot()).toBe(before);
  });

  it('gives each failed attempt its own trace ID', async () => {
    await writeFile(path.join(root, `${CORRUPT_ID}.sayva`), '{ not json', 'utf8');
    traces();

    const first = await duplicateProjectAction(CORRUPT_ID, 'Copy');
    const second = await duplicateProjectAction(CORRUPT_ID, 'Copy');

    if (first.status !== 'cant-read' || second.status !== 'cant-read')
      throw new Error('expected cant-read');
    expect(first.traceId).not.toBe(second.traceId);
  });

  it.each([
    [undefined, 'Copy'],
    [SOURCE_ID, undefined],
    [42, 'Copy'],
    [SOURCE_ID, { name: 'x' }],
  ])('rejects a non-string argument (%j, %j), as the other actions do', async (id, name) => {
    await expect(duplicateProjectAction(id, name)).rejects.toThrow(TypeError);
  });

  it('returns only serializable values', async () => {
    await aSource();
    const result = await duplicateProjectAction(SOURCE_ID, 'Copy');
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
