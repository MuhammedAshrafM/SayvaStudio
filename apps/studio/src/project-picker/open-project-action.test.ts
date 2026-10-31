// @vitest-environment node
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectUseCase } from '@sayva/application';
// Relative, not `@/`: tsconfig.json excludes test files, and the alias is
// resolved for the files it includes.
import { WORKSPACE_ROOT_ENV, projectCreateDeps, resetCompositionRoot } from '../composition-root';
import { openProjectAction } from './open-project-action';

/**
 * The Picker's Open action — ADR-005 OP-10 — against the real Composition
 * Root, the real adapters and a temporary workspace.
 *
 * `server-only` is a marker whose entry throws outside the `react-server`
 * condition, so it is stubbed, exactly as the Composition Root's own test
 * does. Nothing else is replaced.
 */
vi.mock('server-only', () => ({}));

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'sayva-open-action-'));
  vi.stubEnv(WORKSPACE_ROOT_ENV, root);
  resetCompositionRoot();
});

afterEach(async () => {
  resetCompositionRoot();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

async function aProject(name = 'ArSL Curriculum') {
  const created = await createProjectUseCase(projectCreateDeps(), { name });
  if (created.status !== 'created') throw new Error(`expected created, got ${created.status}`);
  return created.project;
}

const CORRUPT_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const traces = () => vi.spyOn(console, 'error').mockImplementation(() => {});

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

describe('openProjectAction — the read-only Open Query, delivered to the Picker', () => {
  it('answers opened with the Project, as the Response Model', async () => {
    const project = await aProject();
    expect(await openProjectAction(project.id)).toEqual({ status: 'opened', project });
  });

  it('answers not-here for a valid ProjectId with no file, untraced', async () => {
    const diagnostics = traces();
    expect(await openProjectAction('00000000-0000-4000-8000-000000000000')).toEqual({
      status: 'not-here',
    });
    expect(diagnostics).not.toHaveBeenCalled();
  });

  it.each([['not-a-uuid'], [''], ['../../etc/passwd'], ['3f2504e0-4f89-41d3-9a0c']])(
    'answers not-here for a malformed id (%j), untraced — the use case decides',
    async (id) => {
      const diagnostics = traces();
      expect(await openProjectAction(id)).toEqual({ status: 'not-here' });
      expect(diagnostics).not.toHaveBeenCalled();
    },
  );

  it('answers cant-read with the location and one trace ID for an unreadable file', async () => {
    const file = path.join(root, `${CORRUPT_ID}.sayva`);
    await writeFile(file, '{ not json', 'utf8');
    const diagnostics = traces();

    const result = await openProjectAction(CORRUPT_ID);

    if (result.status !== 'cant-read') throw new Error(`expected cant-read, got ${result.status}`);
    expect(Object.keys(result).sort()).toEqual(['location', 'status', 'traceId']);
    expect(result.location).toBe(file);
    expect(diagnostics).toHaveBeenCalledTimes(1);
    expect(diagnostics.mock.calls[0]?.[0]).toBe(`Trace ID ${result.traceId}`);
  });

  it('gives each unreadable occurrence its own trace ID', async () => {
    await writeFile(path.join(root, `${CORRUPT_ID}.sayva`), '{ not json', 'utf8');
    traces();

    const first = await openProjectAction(CORRUPT_ID);
    const second = await openProjectAction(CORRUPT_ID);

    if (first.status !== 'cant-read' || second.status !== 'cant-read')
      throw new Error('expected cant-read');
    expect(first.traceId).not.toBe(second.traceId);
  });

  it.each([[undefined], [null], [42], [{ id: 'x' }], [['x']]])(
    'rejects a non-string ProjectId (%j), as the Create action rejects a non-string name',
    async (value) => {
      await expect(openProjectAction(value)).rejects.toThrow(TypeError);
    },
  );

  it('writes nothing — every outcome leaves the workspace byte-for-byte as it was', async () => {
    const project = await aProject();
    await writeFile(path.join(root, `${CORRUPT_ID}.sayva`), '{ not json', 'utf8');
    traces();
    const before = await snapshot();

    await openProjectAction(project.id);
    await openProjectAction('00000000-0000-4000-8000-000000000000');
    await openProjectAction(CORRUPT_ID);
    await openProjectAction('not-a-uuid');

    expect(await snapshot()).toBe(before);
  });

  it('returns only serializable values', async () => {
    const project = await aProject();
    const result = await openProjectAction(project.id);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
