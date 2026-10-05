// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectUseCase, openProjectUseCase } from '@sayva/application';
import {
  WORKSPACE_ROOT_ENV,
  projectCreateDeps,
  projectListDeps,
  projectOpenDeps,
  projectUseCaseDeps,
  resetCompositionRoot,
} from './index';

/**
 * `server-only` is a marker: outside the `react-server` condition its entry
 * throws, which is how it keeps this module out of client bundles. A unit
 * test is neither a client bundle nor a React server, so the marker is
 * stubbed here — and only the marker (Vitest hoists this above the imports).
 * Everything below runs the real module against the real adapters.
 */
vi.mock('server-only', () => ({}));

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'sayva-composition-root-'));
  vi.stubEnv(WORKSPACE_ROOT_ENV, root);
  resetCompositionRoot();
});

afterEach(async () => {
  resetCompositionRoot();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

describe('Composition Root — the Open dependency set (ADR-005 OP-09, ADR-003 SR-11)', () => {
  it('gives Open a tracer, and never gives the base set one', () => {
    expect(projectOpenDeps().tracer).toEqual({ trace: expect.any(Function) });
    expect('tracer' in projectUseCaseDeps()).toBe(false);
  });

  it("builds Open's set from the base set's adapters", () => {
    const base = projectUseCaseDeps();
    const open = projectOpenDeps();
    expect(open.projects).toBe(base.projects);
    expect(open.ids).toBe(base.ids);
    expect(open.clock).toBe(base.clock);
  });

  it("keeps Open's set its own — not the list query's and not Create's", () => {
    const open = projectOpenDeps();
    expect(open).not.toBe(projectListDeps());
    expect(open).not.toBe(projectCreateDeps());
    expect(open.tracer).not.toBe(projectListDeps().tracer);
    expect(open.tracer).not.toBe(projectCreateDeps().tracer);
  });

  it('memoises the set for the life of the process', () => {
    expect(projectOpenDeps()).toBe(projectOpenDeps());
  });

  it("resetCompositionRoot clears Open's set too", () => {
    const before = projectOpenDeps();
    resetCompositionRoot();
    const after = projectOpenDeps();
    expect(after).not.toBe(before);
    expect(after.tracer).not.toBe(before.tracer);
  });

  it('composes Open end to end: opened, not-here and cant-read against a real workspace', async () => {
    const created = await createProjectUseCase(projectCreateDeps(), { name: 'ArSL Curriculum' });
    if (created.status !== 'created') throw new Error(`expected created, got ${created.status}`);

    const corruptId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    const corruptFile = path.join(root, `${corruptId}.sayva`);
    await writeFile(corruptFile, '{ not json', 'utf8');

    const diagnostics = vi.spyOn(console, 'error').mockImplementation(() => {});

    const opened = await openProjectUseCase(projectOpenDeps(), { id: created.project.id });
    expect(opened).toEqual({ status: 'opened', project: created.project });

    expect(await openProjectUseCase(projectOpenDeps(), { id: 'not-a-uuid' })).toEqual({
      status: 'not-here',
    });
    expect(
      await openProjectUseCase(projectOpenDeps(), { id: '00000000-0000-4000-8000-000000000000' }),
    ).toEqual({ status: 'not-here' });
    expect(diagnostics).not.toHaveBeenCalled();

    const unreadable = await openProjectUseCase(projectOpenDeps(), { id: corruptId });
    if (unreadable.status !== 'cant-read')
      throw new Error(`expected cant-read, got ${unreadable.status}`);
    expect(unreadable.location).toBe(corruptFile);
    expect(diagnostics).toHaveBeenCalledTimes(1);
    expect(diagnostics.mock.calls[0]?.[0]).toBe(`Trace ID ${unreadable.traceId}`);
  });
});
