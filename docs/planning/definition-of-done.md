# Sayva Studio — Definition of Done

**Status:** Approved
**Scope:** One reusable checklist. Every implementation phase and every feature from Phase 0 onward satisfies all of it before it's considered complete and Frozen — not phase-specific, not optional per feature.

Every item below traces back to something already frozen — the Domain Model, the Architecture Blueprint, ADR-001, or ADR-002.
This document doesn't introduce new rules; it's the checklist that confirms the existing ones actually held for whatever was just built.

> **How to use this.** Copy this checklist fresh at the start of every phase's freeze review (duplicate the file or paste the section into the PR description).
> The record of a phase actually passing lives in that phase's own Review Discipline output and Decision Log — not in a copy of this checklist.

**Phase / feature:** _____________________
**Reviewed by:** _____________________
**Date:** _____________________

## Contents

1. [Build, Test, Lint](#1-build-test-lint)
2. [Architecture Rules Respected](#2-architecture-rules-respected)
3. [Dependency Rules Respected](#3-dependency-rules-respected)
4. [Design System Compliance](#4-design-system-compliance)
5. [Accessibility Verification](#5-accessibility-verification)
6. [No Temporary Solutions](#6-no-temporary-solutions)
7. [Documentation Updated](#7-documentation-updated)
8. [Manual Verification Completed](#8-manual-verification-completed)
9. [Feature Frozen](#9-feature-frozen)

---

## 1. Build, Test, Lint

- [ ] `pnpm build` succeeds for every affected package and for the whole workspace
- [ ] `pnpm test` passes — unit tests green, integration tests green wherever this phase's Roadmap entry calls for one
- [ ] `pnpm lint` passes with zero errors and no newly suppressed or disabled rules
- [ ] `tsc -b` succeeds with zero type errors across all TypeScript project references (ADR-002 DR-06)
- [ ] CI is green on the pull request itself — not just reproduced locally

## 2. Architecture Rules Respected

- [ ] The feature's logic sits in the correct layer — nothing Domain-shaped living in Infrastructure, nothing business-logic-shaped living in a Server Component (AD-07)
- [ ] Every new Use Case takes a Request Model and returns a Response Model — no raw Domain entity crosses into Presentation (AD-02)
- [ ] Any new Domain entity, value object, or invariant matches what's frozen in the Domain Model — anything genuinely new carries its own Decision Log entry, not a silent addition
- [ ] Cross-aggregate work happens inside a Use Case, never by one aggregate reaching into another's internals; any Domain Service touched only reads, never orchestrates or writes (AD-06)

## 3. Dependency Rules Respected

- [ ] Every cross-package import matches ADR-002's allowed-dependency table — no new edge exists without an ADR amendment (DR-02, DR-11)
- [ ] No import reaches past another package's public `exports` surface (DR-05)
- [ ] No relative import crosses a package boundary on disk — cross-package imports always use the package name
- [ ] `dependency-cruiser` reports zero new violations against the approved graph (DR-08)

## 4. Design System Compliance

- [ ] Checked whether a design-system component already covers this need before building a new one
- [ ] Any genuinely new reusable component was added to `design-system`, not inlined in the feature, and ships with a preview
- [ ] Only design tokens used — no raw hex colors, pixel spacing, or one-off font sizes
- [ ] Empty, error, loading, and success states all use the shared patterns already established — no new one-off variant

## 5. Accessibility Verification

- [ ] Every interactive control has an accessible label
- [ ] Minimum touch target size is respected everywhere new
- [ ] Every new interactive flow is fully keyboard-navigable
- [ ] An automated accessibility check passes with no new violations

## 6. No Temporary Solutions

- [ ] No `TODO`, `FIXME`, or placeholder implementation anywhere in the diff
- [ ] No duplicated logic that should have reused an existing Use Case, Domain Service, or component
- [ ] No feature flag or backwards-compatibility shim introduced without explicit prior approval
- [ ] No commented-out code left behind

## 7. Documentation Updated

- [ ] Any frozen document this phase actually changed (Domain Model, Architecture Blueprint, Pack Specification, an ADR) carries a new Decision Log entry — reason, alternatives, consequences — never a silent edit
- [ ] Feature-level documentation exists: architecture, design decisions, alternatives considered, acceptance criteria, testing strategy, known limitations, future improvements
- [ ] The Implementation Roadmap's entry for this phase still matches reality — updated if anything shifted during the build

## 8. Manual Verification Completed

- [ ] A unit test exists for every invariant this phase introduces or touches
- [ ] Integration tests exist wherever this phase's Roadmap entry calls for one
- [ ] The phase's manual verification checklist from the Implementation Roadmap has actually been run, not just written
- [ ] A regression pass confirms no earlier frozen phase broke

## 9. Feature Frozen

- [ ] Review Discipline output has been provided: files changed, architecture impact, design decisions, tests executed, known limitations
- [ ] Explicit approval has been received — never assumed, never inferred from silence
- [ ] The feature is marked Frozen — from here, only a verified production bug may reopen it
