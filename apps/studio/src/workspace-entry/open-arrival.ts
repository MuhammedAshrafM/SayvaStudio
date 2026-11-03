/**
 * Whether an arrival at the Workspace Entry came from the Picker's Open —
 * §04.1's focus on arrival (WE-A3), as an in-memory, one-shot marker.
 *
 * App Router navigations from Open and from Back or Forward are both client
 * side, so the navigation itself cannot say which one happened. Open says so
 * here, immediately before it navigates, and the Workspace Entry reads the
 * mark for its own Project and clears it, once. Create says so too: a
 * successful Create opens the Project it made, and counts as an Open arrival
 * (Create-then-Open, CO-2).
 *
 * The mark lives only in this module's memory: no URL parameter, hash,
 * storage or cookie (ADR-005 OP-01, and OP-08 chooses no browser storage).
 * A document load starts with none, so a refresh, bookmark, copied URL or
 * restored tab never moves focus. Each browser tab has its own.
 */

let arrivingAt: string | null = null;

/** Open read the Project cleanly, or Create made it, and either is about to navigate to it. */
export function markOpenArrival(projectId: string): void {
  arrivingAt = projectId;
}

/** Whether the mark names this Project. Reads only; clears nothing. */
export function isOpenArrival(projectId: string): boolean {
  return arrivingAt !== null && arrivingAt === projectId;
}

/** Clears the mark if it names this Project; a mark for another stays. */
export function consumeOpenArrival(projectId: string): boolean {
  if (!isOpenArrival(projectId)) return false;
  arrivingAt = null;
  return true;
}

/** Drops any mark no arrival used. The Picker does this whenever it mounts. */
export function clearOpenArrival(): void {
  arrivingAt = null;
}
