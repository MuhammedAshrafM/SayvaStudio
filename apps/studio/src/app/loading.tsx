import { workspaceRoot } from '@/composition-root';
import { ProjectPickerLoading } from '@/project-picker/project-picker';

/**
 * The Project Picker while the scan is in flight — the canonical `loading`
 * state: a skeleton, not a spinner, named "Studio is looking in {root}" (RB-5).
 *
 * The header renders here too, so it does not wait on the scan: the location
 * is known before any Project is read.
 */
export default function Loading() {
  return <ProjectPickerLoading root={workspaceRoot()} />;
}
