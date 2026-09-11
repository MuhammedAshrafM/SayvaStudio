import type { Clock } from '@sayva/domain';

/**
 * `Clock` backed by the system clock — Architecture Blueprint §5:
 * "`now()` for Metadata timestamps, abstracted for the same reason".
 *
 * The same reason being testability: every test in `@sayva/domain` and
 * `@sayva/application` passes a fixed clock and asserts on exact instants,
 * which is only possible because nothing in those layers calls `new Date()`
 * itself.
 *
 * A fresh `Date` is returned on every call, never a cached one. `Date` is
 * mutable, and `Metadata` holds the instance it was given — a shared object
 * would let one holder's `setTime` silently rewrite another entity's
 * `createdAt`.
 */
export function createSystemClock(): Clock {
  return {
    now: () => new Date(),
  };
}
