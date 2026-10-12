import 'server-only';

import { cache } from 'react';
import { openProjectUseCase, type OpenProjectResult } from '@sayva/application';
import { projectOpenDeps } from '@/composition-root';

/**
 * Resolves a workspace URL's Project — once per request.
 *
 * ADR-005 OP-02 resolves the Project on every request through the existing
 * `openProjectUseCase`; nothing else holds the open Project. The page and its
 * `generateMetadata` both need the result, and resolving twice would read
 * the file twice and, for a read failure, trace it twice.
 *
 * React's `cache` is used only as the M1 ruling allows (ADR-005 OP-09):
 * request-scoped memoization. It is not a persistent cache or a global store —
 * each request starts empty, so a refresh or a Retry resolves again.
 */
export const resolveWorkspace = cache((projectId: string): Promise<OpenProjectResult> =>
  openProjectUseCase(projectOpenDeps(), { id: projectId }),
);
