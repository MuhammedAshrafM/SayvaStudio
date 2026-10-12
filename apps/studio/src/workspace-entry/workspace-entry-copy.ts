import type { OpenProjectResult } from '@sayva/application';

/**
 * Every string the Workspace Entry shows — `Sayva Studio Screens.dc.html`
 * §04.1, its copy table, as vendored in the inventory's `workspace-entry`
 * recipe. Nothing here is new copy.
 *
 * A plain module rather than part of the `'use client'` component file,
 * because the route's `generateMetadata` runs on the server and needs the
 * tab titles as strings: an export of a client module reaches a Server
 * Component as a client reference, not as its value.
 */

/** Fixed by ADR-005 OP-08 (§04.1 F8): can't read's heading. */
export const CANT_OPEN_THE_PROJECT = "Can't open the project";

/** The loading state's accessible name, which names the act, not the Project. */
export const OPENING_THE_PROJECT = 'Opening the project';

/** The zero-Language heading and line (OP-06: zero Languages are valid). */
export const NO_LANGUAGES_YET = 'No languages yet';
export const NO_LANGUAGES_LINE = 'This project is open and has no sign languages.';

/** Can't read's line. The location is the failure's own (ADR-003 SR-10). */
export const couldNotRead = (location: string): string => `Studio couldn't read ${location}.`;

/** The error action's label — the frozen error state's own. */
export const RETRY = 'Retry';

/** The three tab titles: "{subject} — Sayva Studio". */
export const tabTitle = (subject: string): string => `${subject} — Sayva Studio`;

/** What a readable Project or a read failure shows; not here never renders (F7). */
export type WorkspaceResult = Exclude<OpenProjectResult, { status: 'not-here' }>;

/** The tab title for a resolved state: the Project's name, or can't read's heading. */
export function workspaceTitle(result: WorkspaceResult): string {
  return tabTitle(result.status === 'opened' ? result.project.name : CANT_OPEN_THE_PROJECT);
}
