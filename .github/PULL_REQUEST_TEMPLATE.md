## Summary

<!-- What does this PR do, and why? -->

## Related

- Roadmap phase / slice:
- Decision Log entries touched, if any (DL-xx / AD-xx / PS-xx / DR-xx):

## Review Discipline

<!-- Per the project's Review Discipline rule: this is provided before requesting review, not after. -->

**Files changed:**

**Architecture impact:**

**Design decisions:**

**Tests executed:**

**Known limitations:**

## Definition of Done

Working copy of [`docs/planning/definition-of-done.md`](../docs/planning/definition-of-done.md), which stays the authoritative source — if this list and that file ever disagree, the file wins and this template should be updated to match.

### Build, Test, Lint

- [ ] `pnpm build` succeeds for every affected package and for the whole workspace
- [ ] `pnpm test` passes — unit tests green, integration tests green wherever this phase's Roadmap entry calls for one
- [ ] `pnpm lint` passes with zero errors and no newly suppressed or disabled rules
- [ ] `tsc -b` succeeds with zero type errors across all TypeScript project references (ADR-002 DR-06)
- [ ] CI is green on the pull request itself — not just reproduced locally

### Architecture Rules Respected

- [ ] The feature's logic sits in the correct layer (AD-07)
- [ ] Every new Use Case takes a Request Model and returns a Response Model (AD-02)
- [ ] Any new Domain entity, value object, or invariant carries its own Decision Log entry, not a silent addition
- [ ] Cross-aggregate work happens inside a Use Case; any Domain Service touched only reads (AD-06)

### Dependency Rules Respected

- [ ] Every cross-package import matches ADR-002's allowed-dependency table (DR-02, DR-11)
- [ ] No import reaches past another package's public `exports` surface (DR-05)
- [ ] No relative import crosses a package boundary on disk
- [ ] `dependency-cruiser` reports zero new violations against the approved graph (DR-08)

### Design System Compliance

- [ ] Checked whether a design-system component already covers this need before building a new one
- [ ] Any genuinely new reusable component was added to `design-system`, not inlined, and ships with a preview
- [ ] Only design tokens used — no raw hex colors, pixel spacing, or one-off font sizes
- [ ] Empty, error, loading, and success states use the shared patterns already established

### Accessibility Verification

- [ ] Every interactive control has an accessible label
- [ ] Minimum touch target size is respected everywhere new
- [ ] Every new interactive flow is fully keyboard-navigable
- [ ] An automated accessibility check passes with no new violations

### No Temporary Solutions

- [ ] No `TODO`, `FIXME`, or placeholder implementation anywhere in the diff
- [ ] No duplicated logic that should have reused an existing Use Case, Domain Service, or component
- [ ] No feature flag or backwards-compatibility shim introduced without explicit prior approval
- [ ] No commented-out code left behind

### Documentation Updated

- [ ] Any frozen document this PR actually changed carries a new Decision Log entry — reason, alternatives, consequences — never a silent edit
- [ ] Feature-level documentation exists where applicable
- [ ] The Implementation Roadmap's entry for this phase still matches reality

### Manual Verification Completed

- [ ] A unit test exists for every invariant this PR introduces or touches
- [ ] Integration tests exist wherever this phase's Roadmap entry calls for one
- [ ] The phase's manual verification checklist has actually been run, not just written
- [ ] A regression pass confirms no earlier frozen phase broke

### Feature Frozen

- [ ] Review Discipline output above is complete
- [ ] Explicit approval has been received — never assumed, never inferred from silence
- [ ] Ready to be marked Frozen once merged
