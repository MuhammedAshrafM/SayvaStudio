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
   * Only its *shape* is enforced here. The invariant §3 states — "SchemaVersion
   * must be readable by the current Studio build" — needs a compatibility rule
   * and a current-build version, and neither exists in any canonical source.
   * The Pack's `schemaVersion` is a different concern by the Pack
   * Specification's own rule that Domain and Pack evolve independently, so it
   * cannot stand in. Supplied by the caller until that rule is decided.
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

function assertName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new DomainError('Project name is required and must not be empty.');
  }
  return trimmed;
}

function assertSchemaVersion(schemaVersion: number): number {
  if (!Number.isSafeInteger(schemaVersion) || schemaVersion < 1) {
    throw new DomainError(
      `Project schemaVersion must be a positive integer; received ${String(schemaVersion)}.`,
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
    schemaVersion: assertSchemaVersion(input.schemaVersion),
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
 */
export function restoreProject(input: RestoreProjectInput): Project {
  if (!PROJECT_STATES.includes(input.state)) {
    throw new DomainError(`Unknown Project state "${String(input.state)}".`);
  }
  return {
    id: toProjectId(input.id),
    name: assertName(input.name),
    schemaVersion: assertSchemaVersion(input.schemaVersion),
    state: input.state,
    metadata: restoreMetadata(input),
  };
}
