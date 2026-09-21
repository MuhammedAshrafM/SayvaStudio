'use client';

/**
 * PP-02's serialization proof. **Not Project Picker UI.**
 *
 * ADR-003 SR-09 requires the workspace root to reach the interface as
 * "a plain serializable string" crossing the Server→Client boundary, because
 * the canonical Project Picker design has the surface name the location it is
 * listing. A value can be asserted serializable in a unit test and still fail
 * at that boundary, so something has to actually cross it.
 *
 * This is that something, and nothing more: one prop in, one string rendered.
 * It has no list, no actions, no absence states and no styling opinion. The
 * Project Picker (Screens §04, `specified-not-drawn`) replaces it wholesale
 * when it is built — this exists so the wiring underneath it is proven first.
 */
export function WorkspaceRootReadout({ root }: { root: string }) {
  return (
    <p>
      Workspace root: <span data-testid="workspace-root">{root}</span>
    </p>
  );
}
