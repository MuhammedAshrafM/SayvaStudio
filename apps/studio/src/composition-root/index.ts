import 'server-only';

import type {
  CreateProjectUseCaseDeps,
  ProjectListUseCaseDeps,
  ProjectUseCaseDeps,
} from '@sayva/application';
import {
  createConsoleFailureTracer,
  createCryptoIdGenerator,
  createFilesystemProjectRepository,
  createSystemClock,
} from '@sayva/infrastructure';

/**
 * Composition Root (Architecture Blueprint §6, AD-05).
 *
 * The only module allowed to import concrete Infrastructure and wire it into
 * Application use cases. Every Server Action and Server Component that needs
 * a use case resolves its dependencies through here — never by importing an
 * Infrastructure class directly (§2: "Forbidden: a Server/Client Component
 * imports a concrete Infrastructure class directly").
 *
 * `import 'server-only'` makes it a build error for this module to reach a
 * Client Component's bundle. That matters more than usual here: it is the
 * mechanism that keeps ADR-003 SR-02's "Infrastructure is server-only" true
 * by construction rather than by review.
 */

/**
 * The environment variable that supplies the workspace root — ADR-003 SR-09.
 *
 * Exported so that anything describing the deployment contract names the
 * same string this module reads, rather than a copy of it that can drift.
 */
export const WORKSPACE_ROOT_ENV = 'SAYVA_WORKSPACE_ROOT';

let cachedRoot: string | undefined;

/**
 * Where this Studio installation keeps its Projects.
 *
 * Read here and nowhere else (SR-09). There is deliberately **no default**:
 * ADR-003 declined to choose a directory, and a silent fallback is how a
 * user's projects end up somewhere they never chose. An absent or blank
 * value is a configuration error and is reported as one.
 *
 * The value is deployment configuration, not architecture — this module
 * knows the variable's name and nothing about what a sensible path is.
 */
export function workspaceRoot(): string {
  if (cachedRoot !== undefined) return cachedRoot;

  const configured = process.env[WORKSPACE_ROOT_ENV];
  if (configured === undefined || configured.trim() === '') {
    throw new Error(
      `${WORKSPACE_ROOT_ENV} is not set. Sayva Studio has no default projects ` +
        `directory: set ${WORKSPACE_ROOT_ENV} to the folder that holds your ` +
        `.sayva files (ADR-003 SR-09).`,
    );
  }

  cachedRoot = configured;
  return cachedRoot;
}

let cachedDeps: ProjectUseCaseDeps | undefined;

/**
 * The dependencies every Project use case takes.
 *
 * This is the wiring AD-05 describes: concrete adapters on one side, the
 * port-shaped object Application expects on the other. The repository
 * receives the root **as a constructor argument** — SR-05 requires that
 * `@sayva/infrastructure` read nothing ambient, and honouring it is what
 * lets the same adapter be pointed at a temporary directory by a test.
 *
 * Memoised because the adapters are stateless and a Project's identity does
 * not depend on which instance minted it.
 */
export function projectUseCaseDeps(): ProjectUseCaseDeps {
  cachedDeps ??= {
    projects: createFilesystemProjectRepository(workspaceRoot()),
    ids: createCryptoIdGenerator(),
    clock: createSystemClock(),
  };
  return cachedDeps;
}

let cachedListDeps: ProjectListUseCaseDeps | undefined;

/**
 * The dependencies of the Project list query: the ordinary Project ones plus
 * the failure tracer (ADR-003 SR-11).
 *
 * Kept apart from `projectUseCaseDeps()` on purpose. SR-11 scopes tracing to
 * the Project list's read failure, so the tracer is wired into this one
 * dependency set and reaches no other use case.
 */
export function projectListDeps(): ProjectListUseCaseDeps {
  cachedListDeps ??= { ...projectUseCaseDeps(), tracer: createConsoleFailureTracer() };
  return cachedListDeps;
}

let cachedCreateDeps: CreateProjectUseCaseDeps | undefined;

/**
 * The dependencies of the Create command: the ordinary Project ones plus the
 * failure tracer — ADR-003 SR-11's Create extension.
 *
 * A third set rather than a reuse of `projectListDeps()`: the extension wires
 * the tracer into the Create command only, and a shared set would let the
 * two traced use cases drift into one without anyone deciding it. It is
 * still never added to `projectUseCaseDeps()`.
 */
export function projectCreateDeps(): CreateProjectUseCaseDeps {
  cachedCreateDeps ??= { ...projectUseCaseDeps(), tracer: createConsoleFailureTracer() };
  return cachedCreateDeps;
}

/**
 * Test seam, not production API.
 *
 * Every value above is memoised for the life of the process, which is
 * correct for a server but makes the module impossible to exercise twice
 * with different configuration. Nothing in the application calls this.
 */
export function resetCompositionRoot(): void {
  cachedRoot = undefined;
  cachedDeps = undefined;
  cachedListDeps = undefined;
  cachedCreateDeps = undefined;
}
