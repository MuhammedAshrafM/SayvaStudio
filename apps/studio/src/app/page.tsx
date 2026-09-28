import { viewProjectListUseCase } from '@sayva/application';
import { projectListDeps, workspaceRoot } from '@/composition-root';
import { ProjectPicker } from '@/project-picker/project-picker';

/**
 * Rendered per request, not at build time.
 *
 * The workspace root is deployment configuration (ADR-003 SR-09), and a build
 * should not need it: prerendering this page would make `next build` fail on
 * any machine that has not set `SAYVA_WORKSPACE_ROOT`, including CI. Being
 * per-request is also what makes Retry a real re-scan.
 */
export const dynamic = 'force-dynamic';

/**
 * The pre-shell Project Picker at the application root (ADR-004).
 *
 * A Server Component doing exactly what AD-07 allows: invoke a Query use case
 * and render the View Model it returns. Which state to show, the order of the
 * rows and how their dates read were all decided inside the query; nothing
 * is caught, counted or formatted here. Both props cross into a Client
 * Component, so both are plain serializable values.
 */
export default async function HomePage() {
  const view = await viewProjectListUseCase(projectListDeps());
  return <ProjectPicker root={workspaceRoot()} view={view} />;
}
