import { DomainError } from '../errors.js';
import type { Clock, IdGenerator } from '../ports/index.js';
import {
  createMetadata,
  restoreMetadata,
  touchMetadata,
  type Metadata,
} from '../shared/metadata.js';
import { newProjectId, toProjectId, type ProjectId } from './project-id.js';

/**
 * The Project lifecycle — Domain Model §8:
 *
 *   Created → Active ⇄ Archived → Deleted
 *
 * All four are declared because the lifecycle names all four. Only one is
 * reachable in this phase, and deliberately:
 *
 *   Created    what `createProject` produces — the tail of the arrow.
 *   Active     BLOCKED. §8 says "Consult §3 for what triggers each
 *              transition"; §3's Project entry lists fields and invariants
 *              and names no trigger. Nothing here invents one.
 *   Archived   BLOCKED for the same reason, and unreachable anyway: no
 *              ArchiveProject use case exists in the Architecture
 *              Blueprint §4 table or in the Roadmap's Phase 2 scope.
 *   Deleted    Never persisted. "Delete is explicit and destructive" (§8)
 *              and `ProjectRepository` carries `delete`, so deletion
 *              removes the record — this names the terminal outcome rather
 *              than a flag a stored Project ever carries.
 */
export const PROJECT_STATES = ['Created', 'Active', 'Archived', 'Deleted'] as const;
export type ProjectState = (typeof PROJECT_STATES)[number];

/** The transitions no source specifies a trigger for. See `PROJECT_STATES`. */
export const PROJECT_TRANSITIONS_BLOCKED = ['Created→Active', 'Active⇄Archived'] as const;

export type Project = {
  readonly id: ProjectId;
  /** Required, non-empty — Domain Model §3. Not localized: unlike Language's
   *  DisplayName, the Project's Name carries no base-locale rule. */
  readonly name: string;
  /**
   * The format version of the `.sayva` file this Project is stored in.
   *
   * The invariant §3 states — "SchemaVersion must be readable by the current
   * Studio build" — is enforced by `assertProjectSchemaVersion` against
   * `CURRENT_PROJECT_SCHEMA_VERSION` (ADR-003 SR-07).
   *
   * Not to be confused with the Pack's `schemaVersion`: two unrelated numbers
   * that never need to agree, never get compared, and version different files
   * for different readers (ADR-003 SR-08, Pack Specification §8).
   */
  readonly schemaVersion: number;
  readonly state: ProjectState;
  readonly metadata: Metadata;
};

/**
 * Owned Languages are not modelled yet.
 *
 * Domain Model §3 has Project owning `LanguageId[]`, but `LanguageId` is
 * defined by Language Management (Roadmap Phase 3), and Phase 2's freeze
 * point is explicit that a Project here is "correctly still an empty shell —
 * no Language yet". The list arrives with the type it holds.
 */

/**
 * The name invariant, broken — Domain Model §3's "Name required, non-empty".
 *
 * Its own class rather than a bare `DomainError`, so a caller can tell this
 * one rule apart from every other invariant without reading a message. The
 * Create command maps exactly this to its `invalid-name` result, and treats
 * any other Domain failure as the defect it is. Still a `DomainError`: the
 * rule is Domain's, and nothing that already catches `DomainError` changes.
 */
export class ProjectNameRequiredError extends DomainError {
  constructor() {
    super('Project name is required and must not be empty.');
    this.name = 'ProjectNameRequiredError';
  }
}

function assertName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new ProjectNameRequiredError();
  return trimmed;
}

/**
 * The `.sayva` format version this Studio build writes — ADR-003 SR-07.
 *
 * Bumped only when the persisted shape of a Project changes. Unrelated to the
 * Pack's `schemaVersion`, which versions a different file for a different
 * reader (SR-08).
 */
export const CURRENT_PROJECT_SCHEMA_VERSION = 1;

/**
 * The concrete form of Domain Model §3's "SchemaVersion must be readable by
 * the current Studio build" — ADR-003 SR-07.
 *
 * Exported because the gate has to be callable at the read boundary *before*
 * anything else about a persisted Project is validated. A future schema may
 * legitimately add a state or reshape a field, so checking structure first
 * would report a newer file as malformed — an error about the wrong problem.
 * Infrastructure asks this question first and gets the right answer once,
 * rather than restating the rule and letting the two drift.
 */
export function assertProjectSchemaVersion(schemaVersion: number): number {
  if (!Number.isSafeInteger(schemaVersion) || schemaVersion < 1) {
    throw new DomainError(
      `Project schemaVersion must be a positive integer; received ${String(schemaVersion)}.`,
    );
  }
  if (schemaVersion > CURRENT_PROJECT_SCHEMA_VERSION) {
    throw new DomainError(
      `Project schemaVersion ${String(schemaVersion)} is newer than this Studio build can read ` +
        `(supports up to ${String(CURRENT_PROJECT_SCHEMA_VERSION)}).`,
    );
  }
  return schemaVersion;
}

export type CreateProjectInput = {
  name: string;
  /** The schema version the creating Studio build writes. See `Project.schemaVersion`. */
  schemaVersion: number;
  tags?: readonly string[];
};

/** The only way a Project comes into existence. */
export function createProject(
  input: CreateProjectInput,
  deps: { ids: IdGenerator; clock: Clock },
): Project {
  return {
    id: newProjectId(deps.ids),
    name: assertName(input.name),
    schemaVersion: assertProjectSchemaVersion(input.schemaVersion),
    state: 'Created',
    metadata: createMetadata(deps.clock, input.tags),
  };
}

/** Renames a Project, moving its `updatedAt` forward. */
export function renameProject(project: Project, name: string, clock: Clock): Project {
  return {
    ...project,
    name: assertName(name),
    metadata: touchMetadata(project.metadata, clock),
  };
}

export type RestoreProjectInput = {
  id: string;
  name: string;
  schemaVersion: number;
  state: ProjectState;
  createdAt: Date;
  updatedAt: Date;
  tags?: readonly string[];
  notes?: string;
};

/**
 * Rebuilds a Project read back from storage.
 *
 * Every invariant is re-checked. A file edited by hand, or written by an
 * older build, is exactly the case where "Domain validates truth" has to
 * hold — reconstitution is not a trusted path.
 *
 * The schema version is checked *first*, before the state or any other
 * field (ADR-003 SR-07). "Can this build read the file at all" precedes
 * "is what it contains valid": a version this build does not understand may
 * carry a state or a field shape that only looks wrong from here, and
 * reporting that as malformed would name the wrong problem.
 */
export function restoreProject(input: RestoreProjectInput): Project {
  const schemaVersion = assertProjectSchemaVersion(input.schemaVersion);
  if (!PROJECT_STATES.includes(input.state)) {
    throw new DomainError(`Unknown Project state "${String(input.state)}".`);
  }
  return {
    id: toProjectId(input.id),
    name: assertName(input.name),
    schemaVersion,
    state: input.state,
    metadata: restoreMetadata(input),
  };
}
