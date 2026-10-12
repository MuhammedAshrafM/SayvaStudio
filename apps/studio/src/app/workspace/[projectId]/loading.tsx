import { WorkspaceEntryLoading } from '@/workspace-entry/workspace-entry';

/**
 * The loading boundary while the Project resolves — `SyStateBlock`'s loading
 * state, a skeleton rather than a spinner (§04.1 Decision 4, F14).
 */
export default function Loading() {
  return <WorkspaceEntryLoading />;
}
