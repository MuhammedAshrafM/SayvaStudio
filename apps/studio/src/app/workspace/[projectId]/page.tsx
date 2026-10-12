import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { resolveWorkspace } from '@/workspace-entry/resolve-workspace';
import { workspaceTitle } from '@/workspace-entry/workspace-entry-copy';
import { WorkspaceEntry } from '@/workspace-entry/workspace-entry';

/**
 * `/workspace/{projectId}` — the temporary pre-shell workspace URL (ADR-005
 * OP-01). Outside the URL contract, and not route twelve.
 *
 * Resolved on every request (OP-02), so it is never prerendered: the Project
 * is read from the workspace root at request time, and the root itself is
 * deployment configuration read at runtime (ADR-003 SR-09).
 */
export const dynamic = 'force-dynamic';

type WorkspaceRouteProps = { params: Promise<{ projectId: string }> };

/**
 * The tab title: "{name} — Sayva Studio" when the Project opens, "Can't open
 * the project — Sayva Studio" when it cannot be read. Shares the page's one
 * resolution, so it never reads the file a second time or traces a failure
 * twice. Not here gets no title of its own: the page redirects.
 */
export async function generateMetadata({ params }: WorkspaceRouteProps): Promise<Metadata> {
  const result = await resolveWorkspace((await params).projectId);
  return result.status === 'not-here' ? {} : { title: workspaceTitle(result) };
}

/**
 * A Server Component that only invokes a Query use case and hands its
 * serializable result to the surface (AD-07).
 *
 * Not here — a malformed id, no matching file, a missing workspace folder or
 * a changed folder setting (OP-07) — never renders this surface: it returns
 * to `/` (F7). **Temporary boundary of this slice:** the Picker does not yet announce
 * "Can't find that project" when it gets there, because how that
 * announcement reaches it is still unruled (OP-08). This redirect claims
 * nothing more than the return.
 */
export default async function WorkspacePage({ params }: WorkspaceRouteProps) {
  const result = await resolveWorkspace((await params).projectId);
  if (result.status === 'not-here') redirect('/');
  return <WorkspaceEntry result={result} />;
}
