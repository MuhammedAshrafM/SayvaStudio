import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toProjectId, ProjectFileFailure } from '@sayva/domain';
import { createFilesystemProjectRepository } from './filesystem-project-repository.js';
import { ProjectFileError } from './project-file-error.js';

/**
 * `findById`'s root check against both platforms' read errors, on any
 * platform — ADR-003 SR-10, extended 2026-10-11.
 *
 * Reading a path beneath a file fails `ENOENT` on Windows and `ENOTDIR` on
 * POSIX, and a real filesystem only ever produces its own platform's one. So
 * the sibling test file's real-disk case runs one branch on a Windows machine
 * and the other in CI. This file injects each error into `readFile`, so both
 * branches run everywhere.
 *
 * Only the read's error is injected. The root is real, and whether it is a
 * directory is still decided by the filesystem — the thing under test. The
 * test names give the injected error and the platform whose shape it copies,
 * never the operating system running the test.
 */

const { injected } = vi.hoisted(() => ({ injected: { code: null as string | null } }));

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...real,
    readFile: (...args: Parameters<typeof real.readFile>) => {
      if (injected.code === null) return real.readFile(...args);
      const failure = Object.assign(new Error(`${injected.code}: injected`), {
        code: injected.code,
      });
      return Promise.reject(failure);
    },
  };
});

const UUID_A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'sayva-root-not-a-directory-'));
});

afterEach(async () => {
  injected.code = null;
  await rm(tmp, { recursive: true, force: true });
});

/** A root whose path is taken by a file. */
async function fileRoot(): Promise<string> {
  const file = path.join(tmp, 'not-a-folder');
  await writeFile(file, 'x', 'utf8');
  return file;
}

const openFrom = (workspaceRoot: string): Promise<unknown> =>
  createFilesystemProjectRepository(workspaceRoot)
    .findById(toProjectId(UUID_A))
    .catch((failure: unknown) => failure);

describe('a root that is a file fails at the root, whichever error the read gives', () => {
  it.each([
    ['POSIX', 'ENOTDIR'],
    ['Windows', 'ENOENT'],
  ])('%s error shape, injected on any host: a read failing %s', async (_platform, code) => {
    const workspaceRoot = await fileRoot();
    injected.code = code;

    const error = await openFrom(workspaceRoot);

    expect(error).toBeInstanceOf(ProjectFileError);
    expect(error).toBeInstanceOf(ProjectFileFailure);
    expect((error as ProjectFileError).location).toBe(path.resolve(workspaceRoot));
    expect((error as ProjectFileError).message).toMatch(/is not a directory/);
    expect((error as ProjectFileError).cause).toBeUndefined();
  });
});

describe("a root that is a directory keeps the read's own outcome", () => {
  it('an injected ENOTDIR is still a read failure located at the Project file — the code decides nothing', async () => {
    injected.code = 'ENOTDIR';

    const error = await openFrom(tmp);

    expect(error).toBeInstanceOf(ProjectFileError);
    expect((error as ProjectFileError).location).toBe(path.join(tmp, `${UUID_A}.sayva`));
    expect((error as ProjectFileError).message).toMatch(/could not be read/);
    expect(((error as ProjectFileError).cause as NodeJS.ErrnoException).code).toBe('ENOTDIR');
  });

  it('an injected ENOENT is still a missing Project', async () => {
    injected.code = 'ENOENT';
    await expect(openFrom(tmp)).resolves.toBeNull();
  });
});

describe('a root that does not exist is still an empty workspace', () => {
  it('an injected ENOENT answers null', async () => {
    injected.code = 'ENOENT';
    await expect(openFrom(path.join(tmp, 'not-created-yet'))).resolves.toBeNull();
  });
});
