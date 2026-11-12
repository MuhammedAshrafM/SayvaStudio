'use server';

import { duplicateProjectUseCase, type DuplicateProjectResult } from '@sayva/application';
import { projectDuplicateDeps } from '@/composition-root';

/**
 * The Duplicate command's delivery mechanism — Architecture Blueprint §6: a
 * Server Action carries a Command use case, and only serializable Request
 * and Response Models cross it.
 *
 * Like the Create and Open actions, it checks shape and nothing else: that
 * the source id and the copy's name each arrived as a string. Whether the
 * name is valid is Domain's to decide, and whether the id names a Project is
 * the use case's — answered as `invalid-name` and `not-here`. Anything that
 * is not a string is a malformed call, and it fails as one.
 */
export async function duplicateProjectAction(
  projectId: unknown,
  name: unknown,
): Promise<DuplicateProjectResult> {
  if (typeof projectId !== 'string' || typeof name !== 'string') {
    throw new TypeError(
      "duplicateProjectAction expects the source ProjectId and the copy's name as strings.",
    );
  }
  return duplicateProjectUseCase(projectDuplicateDeps(), { id: projectId, name });
}
