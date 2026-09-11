import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProject, CURRENT_PROJECT_SCHEMA_VERSION, type Project } from '@sayva/domain';
import { createFilesystemProjectRepository } from './filesystem-project-repository.js';

/**
 * SR-06's mechanism, not just its consequence.
 *
 * The sibling test file proves the *filter* half of the guarantee — that a
 * temporary file left by an interrupted write is invisible to `findById` and
 * `findAll`. That half passes whether or not `save` ever uses a temporary
 * file at all, so on its own it would let a regression to a plain in-place
 * write through unnoticed.
 *
 * This file closes that gap by watching the calls `save` actually makes. The
 * filesystem is real and untouched — `writeFile` and `rename` still do their
 * jobs, and the assertions at the end confirm the file really landed. Only
 * the observation is added.
 */

const { renameSpy, writeFileSpy } = vi.hoisted(() => ({
  renameSpy: vi.fn(),
  writeFileSpy: vi.fn(),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...real,
    rename: (...args: Parameters<typeof real.rename>) => {
      renameSpy(...args);
      return real.rename(...args);
    },
    writeFile: (...args: Parameters<typeof real.writeFile>) => {
      writeFileSpy(...args);
      return real.writeFile(...args);
    },
  };
});

const UUID_A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const AT = '2026-09-11T10:00:00.000Z';

const aProject = (name = 'ArSL Curriculum'): Project =>
  createProject(
    { name, schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION },
    { ids: { newId: () => UUID_A }, clock: { now: () => new Date(AT) } },
  );

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'sayva-atomic-write-'));
  renameSpy.mockClear();
  writeFileSpy.mockClear();
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('save goes through a temporary file and a rename — SR-06', () => {
  it('never writes the destination directly', async () => {
    const repository = createFilesystemProjectRepository(root);
    const destination = path.join(root, `${UUID_A}.sayva`);

    await repository.save(aProject());

    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    const written = String(writeFileSpy.mock.calls[0]?.[0]);
    expect(written).not.toBe(destination);
  });

  it('renames the temporary file onto the destination', async () => {
    const repository = createFilesystemProjectRepository(root);
    const destination = path.join(root, `${UUID_A}.sayva`);

    await repository.save(aProject());

    expect(renameSpy).toHaveBeenCalledTimes(1);
    const [from, to] = renameSpy.mock.calls[0] as [string, string];
    expect(String(to)).toBe(destination);
    expect(String(from)).toBe(String(writeFileSpy.mock.calls[0]?.[0]));
  });

  it('keeps the temporary file a sibling, because rename is atomic only within one filesystem', async () => {
    const repository = createFilesystemProjectRepository(root);

    await repository.save(aProject());

    const [from] = renameSpy.mock.calls[0] as [string, string];
    expect(path.dirname(String(from))).toBe(root);
    // Not in the system temp directory, which would be a cross-device move.
    expect(path.dirname(String(from))).not.toBe(os.tmpdir());
  });

  it('names the temporary file so the `.sayva` filter cannot pick it up', async () => {
    const repository = createFilesystemProjectRepository(root);

    await repository.save(aProject());

    const [from] = renameSpy.mock.calls[0] as [string, string];
    expect(path.basename(String(from)).endsWith('.sayva')).toBe(false);
  });

  it('uses a distinct temporary name each time, so concurrent saves cannot collide', async () => {
    const repository = createFilesystemProjectRepository(root);

    await repository.save(aProject('One'));
    await repository.save(aProject('Two'));

    const names = renameSpy.mock.calls.map(([from]) => String(from));
    expect(new Set(names).size).toBe(2);
  });

  it('still lands the file correctly — the filesystem here is real', async () => {
    const repository = createFilesystemProjectRepository(root);

    await repository.save(aProject('Landed'));

    expect(await readdir(root)).toEqual([`${UUID_A}.sayva`]);
    const onDisk = JSON.parse(await readFile(path.join(root, `${UUID_A}.sayva`), 'utf8')) as {
      name: string;
    };
    expect(onDisk.name).toBe('Landed');
  });
});
