import { DomainError } from '../errors.js';
import type { Clock } from '../ports/index.js';

/**
 * `Metadata` — Domain Model §4.
 *
 *   createdAt, updatedAt, createdBy?, tags[], notes?
 *
 * `createdBy` is "a reserved no-op in v1 — no auth yet", so it is declared
 * and never populated: there is nothing in v1 that knows who is authoring.
 * It is kept on the shape rather than dropped so the field's absence stays
 * a decision on the record instead of an omission someone re-derives later.
 */
export type Metadata = {
  readonly createdAt: Date;
  readonly updatedAt: Date;
  /** Reserved. Always `undefined` in v1 — there is no authentication. */
  readonly createdBy?: undefined;
  readonly tags: readonly string[];
  readonly notes?: string;
};

/** A fresh `Metadata`, created and updated at the same instant. */
export function createMetadata(clock: Clock, tags: readonly string[] = []): Metadata {
  const now = clock.now();
  return { createdAt: now, updatedAt: now, tags: [...tags] };
}

/** The same `Metadata` with its `updatedAt` moved forward. Everything else is carried. */
export function touchMetadata(metadata: Metadata, clock: Clock): Metadata {
  return { ...metadata, updatedAt: clock.now() };
}

/**
 * Rebuilds `Metadata` from storage.
 *
 * Separate from `createMetadata` on purpose: reconstitution must not invent
 * timestamps, and creation must not accept them.
 */
export function restoreMetadata(input: {
  createdAt: Date;
  updatedAt: Date;
  tags?: readonly string[];
  notes?: string;
}): Metadata {
  if (Number.isNaN(input.createdAt.getTime()) || Number.isNaN(input.updatedAt.getTime())) {
    throw new DomainError('Metadata timestamps must be valid dates.');
  }
  return {
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    tags: [...(input.tags ?? [])],
    ...(input.notes === undefined ? {} : { notes: input.notes }),
  };
}
