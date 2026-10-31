'use server';

import { openProjectUseCase, type OpenProjectResult } from '@sayva/application';
import { projectOpenDeps } from '@/composition-root';

/**
 * The Picker's Open reads the Project before it navigates — ADR-005 OP-08,
 * delivered as the read-only Server Action OP-10 allows.
 *
 * It calls the existing Open Query and returns its serializable result
 * unchanged: `opened`, `not-here` or `cant-read`, each classified by the use
 * case, with a `cant-read` traced once (OP-09, ADR-003 SR-11). It writes
 * nothing and adds no logic of its own. Like the Create action, it checks
 * only that the value arrived as a string; whether it is a ProjectId is the
 * use case's question, which answers a malformed one with `not-here`.
 */
export async function openProjectAction(projectId: unknown): Promise<OpenProjectResult> {
  if (typeof projectId !== 'string') {
    throw new TypeError('openProjectAction expects the ProjectId as a string.');
  }
  return openProjectUseCase(projectOpenDeps(), { id: projectId });
}
