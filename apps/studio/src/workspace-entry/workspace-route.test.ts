// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectUseCase } from '@sayva/application';
// Relative, not `@/`: tsconfig.json excludes test files, and the alias is
// resolved for the files it includes — which covers every route file here.
import WorkspacePage, { dynamic, generateMetadata } from '../app/workspace/[projectId]/page';
import { WORKSPACE_ROOT_ENV, projectCreateDeps, resetCompositionRoot } from '../composition-root';
import { WorkspaceEntry } from './workspace-entry';

/**
 * The `/workspace/{projectId}` route, composed exactly as Next composes it:
 * the real page module, the real Composition Root and the real filesystem
 * adapters, against a temporary workspace.
 *
 * Two stand-ins, and only two:
 *
 * `server-only` is a marker whose entry throws outside the `react-server`
 * condition. A unit test is neither a client bundle nor a React server, so
 * the marker is stubbed, as the Composition Root's own test does.
 *
 * React's `cache` memoizes only inside a React server render; the client
 * build this runner loads turns it into a pass-through. So `cache` is given
 * one request's scope here — a memo cleared before every test, each test
 * being one request. Everything that decides whether the page and its
 * metadata share one resolution is the real code; only the request boundary
 * React would supply is simulated.
 */
vi.mock('server-only', () => ({}));

const request = vi.hoisted(() => ({ scope: new WeakMap<object, Map<string, unknown>>() }));
vi.mock('react', async (importOriginal) => {
  const real = await importOriginal<typeof import('react')>();
  return {
    ...real,
    cache:
      <A extends unknown[], R>(fn: (...args: A) => R) =>
      (...args: A): R => {
        const memo = request.scope.get(fn) ?? new Map<string, unknown>();
        request.scope.set(fn, memo);
        const key = JSON.stringify(args);
        if (!memo.has(key)) memo.set(key, fn(...args));
        return memo.get(key) as R;
      },
  };
});

/** Starts a new request: React's request scope is empty again. */
const newRequest = () => {
  request.scope = new WeakMap();
};

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'sayva-workspace-route-'));
  vi.stubEnv(WORKSPACE_ROOT_ENV, root);
  resetCompositionRoot();
  newRequest();
});

afterEach(async () => {
  resetCompositionRoot();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

const params = (projectId: string) => ({ params: Promise.resolve({ projectId }) });

/** Where a `redirect()` error sends the request, read from Next's own digest. */
function redirectTarget(failure: unknown): string | undefined {
  const digest = (failure as { digest?: unknown } | null)?.digest;
  if (typeof digest !== 'string' || !digest.startsWith('NEXT_REDIRECT;')) return undefined;
  return digest.split(';')[2];
}

async function aProject(name = 'ArSL Curriculum') {
  const created = await createProjectUseCase(projectCreateDeps(), { name });
  if (created.status !== 'created') throw new Error(`expected created, got ${created.status}`);
  return created.project;
}

const CORRUPT_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
async function anUnreadableProject(): Promise<string> {
  const file = path.join(root, `${CORRUPT_ID}.sayva`);
  await writeFile(file, '{ not json', 'utf8');
  return file;
}

const traces = () => vi.spyOn(console, 'error').mockImplementation(() => {});

describe('the route — ADR-005 OP-01, OP-02', () => {
  it('is resolved on every request, never prerendered', () => {
    expect(dynamic).toBe('force-dynamic');
  });
});

describe('a Project that opens', () => {
  it('renders the Workspace Entry with the Project as its Response Model', async () => {
    const project = await aProject();

    const element = await WorkspacePage(params(project.id));

    expect(element.type).toBe(WorkspaceEntry);
    expect(element.props).toEqual({ result: { status: 'opened', project } });
  });

  it('titles the tab "{name} — Sayva Studio"', async () => {
    const project = await aProject();
    expect(await generateMetadata(params(project.id))).toEqual({
      title: 'ArSL Curriculum — Sayva Studio',
    });
  });

  it('opens an id written in upper case as the same Project', async () => {
    const project = await aProject();
    const element = await WorkspacePage(params(project.id.toUpperCase()));
    expect(element.props).toEqual({ result: { status: 'opened', project } });
  });
});

describe('not here — returns to / and never renders the surface (F7), not yet announced', () => {
  it.each([
    ['a malformed id', 'not-a-uuid'],
    ['a path-shaped id', '..%2F..%2Fetc%2Fpasswd'],
    ['a valid id with no matching file', '00000000-0000-4000-8000-000000000000'],
  ])('redirects %s to /, untraced', async (_label, projectId) => {
    const diagnostics = traces();

    const failure = await WorkspacePage(params(projectId)).catch((thrown: unknown) => thrown);

    expect(redirectTarget(failure)).toBe('/');
    expect(diagnostics).not.toHaveBeenCalled();
  });

  it('redirects to / when the workspace folder does not exist', async () => {
    vi.stubEnv(WORKSPACE_ROOT_ENV, path.join(root, 'not-created-yet'));
    resetCompositionRoot();

    const failure = await WorkspacePage(params(CORRUPT_ID)).catch((thrown: unknown) => thrown);
    expect(redirectTarget(failure)).toBe('/');
  });

  it('gives the tab no title of its own', async () => {
    expect(await generateMetadata(params('not-a-uuid'))).toEqual({});
  });
});

describe("can't read", () => {
  it('renders the Workspace Entry with the location and the trace ID, traced exactly once', async () => {
    const file = await anUnreadableProject();
    const diagnostics = traces();

    const element = await WorkspacePage(params(CORRUPT_ID));
    const result = element.props.result as { status: string; traceId: string; location: string };

    expect(element.type).toBe(WorkspaceEntry);
    expect(result.status).toBe('cant-read');
    expect(result.location).toBe(file);
    expect(diagnostics).toHaveBeenCalledTimes(1);
    expect(diagnostics.mock.calls[0]?.[0]).toBe(`Trace ID ${result.traceId}`);
  });

  it(`titles the tab "Can't open the project — Sayva Studio"`, async () => {
    await anUnreadableProject();
    traces();

    expect(await generateMetadata(params(CORRUPT_ID))).toEqual({
      title: "Can't open the project — Sayva Studio",
    });
  });
});

describe('one resolution per request — the page and its metadata share it', () => {
  it('reads and traces a failure once, though both the page and the title need it', async () => {
    await anUnreadableProject();
    const diagnostics = traces();

    const metadata = await generateMetadata(params(CORRUPT_ID));
    const element = await WorkspacePage(params(CORRUPT_ID));
    const { traceId } = element.props.result as { traceId: string };

    expect(metadata.title).toBe("Can't open the project — Sayva Studio");
    expect(diagnostics).toHaveBeenCalledTimes(1);
    expect(diagnostics.mock.calls[0]?.[0]).toBe(`Trace ID ${traceId}`);
  });

  it('resolves again on the next request — a refresh or a Retry is a new occurrence', async () => {
    await anUnreadableProject();
    const diagnostics = traces();

    const first = await WorkspacePage(params(CORRUPT_ID));
    newRequest();
    const second = await WorkspacePage(params(CORRUPT_ID));

    const ids = [first, second].map((el) => (el.props.result as { traceId: string }).traceId);
    expect(diagnostics).toHaveBeenCalledTimes(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('sees a Project that became readable on the next request', async () => {
    const project = await aProject();
    const file = path.join(root, `${project.id}.sayva`);
    const contents = await readFile(file, 'utf8');
    await writeFile(file, '{ not json', 'utf8');
    traces();

    expect((await WorkspacePage(params(project.id))).props.result.status).toBe('cant-read');

    await writeFile(file, contents, 'utf8');
    newRequest();
    expect((await WorkspacePage(params(project.id))).props.result).toEqual({
      status: 'opened',
      project,
    });
  });
});
