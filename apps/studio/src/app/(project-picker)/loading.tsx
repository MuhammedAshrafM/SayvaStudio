import { workspaceRoot } from '@/composition-root';
import { ProjectPickerLoading } from '@/project-picker/project-picker';

/**
 * The Project Picker while the scan is in flight — the canonical `loading`
 * state: a skeleton, not a spinner, named "Studio is looking in {root}" (RB-5).
 *
 * Only the list's state. The header is the layout's, outside this boundary,
 * so it is on screen — New Project included — before any Project is read.
 */
export default function Loading() {
  return <ProjectPickerLoading root={workspaceRoot()} />;
}
