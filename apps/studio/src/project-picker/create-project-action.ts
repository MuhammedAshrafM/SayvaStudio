'use server';

import { createProjectUseCase, type CreateProjectResult } from '@sayva/application';
import { projectCreateDeps } from '@/composition-root';

/**
 * The Create command's delivery mechanism — Architecture Blueprint §6: a
 * Server Action carries a Command use case, and only serializable Request
 * and Response Models cross it.
 *
 * It checks shape and nothing else (the Create decision closure's B12):
 * that what arrived is a string. Whether that string is a valid Project
 * name is Domain's to decide — "Zod validates shape. Domain validates
 * truth" — and the answer comes back as the command's own `invalid-name`.
 * Anything that is not a string is not a name the author typed; it is a
 * malformed call, and it fails as one.
 *
 * The dependencies come from the Composition Root (AD-05), including the
 * tracer, which reaches this command and the list query only.
 */
export async function createProjectAction(name: unknown): Promise<CreateProjectResult> {
  if (typeof name !== 'string') {
    throw new TypeError('createProjectAction expects the project name as a string.');
  }
  return createProjectUseCase(projectCreateDeps(), { name });
}
