import { DomainError } from '../errors.js';
import type { IdGenerator } from '../ports/index.js';

declare const projectIdBrand: unique symbol;

/**
 * A Project's identity.
 *
 * Branded rather than a bare string so a `LanguageId` can never be passed
 * where a `ProjectId` belongs — the compiler enforces what Domain Model §5
 * states in prose: identity is permanent, never reused, never recycled
 * after a delete, "so a stale reference is always detectably broken rather
 * than silently pointing at the wrong thing".
 */
export type ProjectId = string & { readonly [projectIdBrand]: 'ProjectId' };

/**
 * Canonical 8-4-4-4-12 hexadecimal form.
 *
 * Deliberately not pinned to a UUID version or variant. §5 says
 * "client-generated UUID" and stops there; requiring v4 specifically would
 * be stricter than the source and would reject an equally valid id.
 */
const CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mints a new identity. The only way one is created. */
export function newProjectId(ids: IdGenerator): ProjectId {
  return toProjectId(ids.newId());
}

/**
 * Rebuilds an identity read back from storage, validating its shape.
 *
 * A malformed id is a broken reference, and §5 wants those detectable —
 * so this throws rather than passing the value through untouched.
 */
export function toProjectId(value: string): ProjectId {
  if (!CANONICAL_UUID.test(value)) {
    throw new DomainError(`ProjectId must be a canonical UUID; received "${value}".`);
  }
  return value.toLowerCase() as ProjectId;
}

/** Whether a string could be a `ProjectId`, without throwing. */
export function isProjectId(value: string): boolean {
  return CANONICAL_UUID.test(value);
}
