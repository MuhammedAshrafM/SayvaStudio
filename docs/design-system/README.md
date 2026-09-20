# Design System Source Artifacts

**Status:** Vendored · Do not edit
**Scope:** The canonical Sayva Studio design work, copied into this repository verbatim so it can be diffed against the code that implements it.

This directory is the design's side of the design→code contract.
It introduces no design decisions of its own — every file here is a byte-faithful copy of something authored in Claude Design.

## Contents

- [Files](#files)
- [Provenance](#provenance)
- [Authority](#authority)
- [The extraction rule](#the-extraction-rule)
- [What is derived from these files](#what-is-derived-from-these-files)
- [How to update](#how-to-update)
- [Recorded discrepancies](#recorded-discrepancies)

---

## Files

| File | What it is |
|---|---|
| `SAYVA_STUDIO_DESIGN_HANDOFF.md` | Extraction-first handoff, 18 sections. The practical entry point — tokens, component contracts, workspace recipes, screen inventory, design rules, and everything the design has deliberately left unspecified. |
| `sayva-studio-design-inventory.json` | The machine-readable form. 93 tokens, 22 contracted components, 17 registered-without-contract, 5 reclassified, 8 patterns, 10 principles, **9 workspace recipes**, **17 screens**, 20 rules, 27 accessibility items, 9 open decisions, 18 unspecified-by-design entries. Every entry carries a `source` field naming the document and section it came from. |

Both are excluded from Prettier by the repository-root `.prettierignore` (`docs`), which is what keeps them byte-faithful.

## Provenance

| | |
|---|---|
| **Project** | Claude Design — *Design foundations review* (`d9a9cd38-f02e-4baf-8fff-4ff9f808b422`) |
| **Design extracted** | 2026-08-09 |
| **Ingested here** | 2026-08-11 (Phase 1, Slice 1) |
| **Amended** | 2026-09-20 — `Sayva Studio Screens.dc.html` **§04 Project picker** authored in the Claude Design project, then re-exported through the workflow below. Adds one workspace recipe and one screen, and introduces the status **`specified-not-drawn`**. No token, component contract, or existing section changed; §03 Design review keeps its number and both citations of it (`ai-register`, `R06`) are untouched. |
| **Source documents** | `Sayva Studio Foundations.dc.html` v0.2 · `Sayva Studio Design System.dc.html` v0.2 · `Sayva Studio Screens.dc.html` · `Sayva Studio Scale Review.dc.html` · `Sayva Studio Handoff Audit.dc.html` v1.1 |

The five `.dc.html` source documents are **not** vendored — they are rendered documents whose data lives in embedded script arrays, and the handoff plus the inventory are their extraction.
The Claude Design project remains authoritative: if a file here and a source document disagree, the source document wins.

A copy of the handoff also exists at `D:\Projects\KMP\Sayva\docs\SAYVA_STUDIO_DESIGN_HANDOFF.md`.
That repository is the Sayva **mobile app** and carries a deliberately different visual language (Material 3, Electric Indigo, Plus Jakarta Sans) from Studio's.
It is not a second source of truth for this repository, and the two do not share a token source.

## Authority

Where the design's own documents disagree, the handoff records the resolution order:

- **Design System** wins on component naming.
- **Foundations** wins on tokens and information architecture.
- **Scale Review** wins on interaction at scale.

## The extraction rule

Anything the design has not decided is recorded as **UNSPECIFIED BY DESIGN** (handoff §16, inventory `unspecifiedByDesign`).
Filling one of those from general UI convention is a design change, not an implementation detail, and must go back to design.
The design's own acceptance criterion **AC13** fails any component, colour, shadow, radius or interaction pattern with no design source.

Two conflicts are recorded rather than resolved, and must not be decided here:

- **C1** — compact row height: `28px` (Foundations §15) vs `26px` (Design System density prop). The design's only self-declared blocking conflict.
- **C2** — reclassified component count: the prose says four, the enumeration yields five. Housekeeping only, no implementation impact.

## What is derived from these files

| Derived artifact | Relationship |
|---|---|
| `packages/design-system/design-tokens.json` | A faithful projection of this directory's inventory `tokens[]` — the canonical generator input defined by DR-15. No value altered, added, removed or reordered. |
| `packages/design-system/design-manifest.json` | The design→code map. Every token and contracted primitive is `implemented`, `deferred`, or `blocked` with a reason. Parity-tested against the code from Slice 3 onward. |
| `packages/design-system/design-open-decisions.json` | The register of decisions Phase 1 cannot make on its own — each with its owner, what it blocks, and what must not be done. Every decision id cited in the manifest or the token generator must appear there, and a test enforces it. |
| `packages/design-system/design-decisions.json` | Values the design states in prose but never tokenised, once an owner approves one. Currently empty and deliberately so. |
| `packages/design-system/src/styles/tokens.css` | Generated from `design-tokens.json` (Slice 3). Never hand-edited. |
| `packages/design-system/src/tokens.ts` | Generated from `design-tokens.json` (Slice 3). Token names and types only — never values. |

## How to update

1. Change the design in the Claude Design project.
2. Re-export the handoff and the inventory, and replace the two files here verbatim.
3. Re-run the token ingest so `design-tokens.json` stays a faithful projection.
4. Re-run the generator so `tokens.css` and `tokens.ts` match.
5. Update `design-manifest.json` for anything added, removed, or unblocked.

Steps 3–5 are checked mechanically from Slice 3 onward: the regenerate-and-diff and set-parity tests fail if any of them is skipped.

## Recorded discrepancies

Four count discrepancies exist between the handoff's prose and the inventory's data.
The inventory is internally consistent in every case — its declared `$meta.counts` match its actual array lengths exactly — so it is treated as authoritative for counts, and none of the four has implementation impact beyond which number to build against.

| # | Discrepancy | Resolution |
|---|---|---|
| 1 | Handoff status summary says **85 tokens**; the inventory declares 93 and contains 93. | Build against **93**. Recorded as open decision D7. |
| 2 | Handoff §11 says **four** components were reclassified as configurations; enumerating them yields five, and the inventory contains five. | The design's own recorded conflict **C2**. Housekeeping. |
| 3 | Handoff §12's heading reads **"Design System primitives (9)"** but enumerates ten, and both the §11 contract table's class column and the inventory's `classification` field yield ten. | Build against **ten**. Not previously recorded by design — send back as a documentation correction. |
| 4 | Handoff §15.6 reads **"URL contract (12 routes)"**; the inventory's `foundations.url-contract.routes` enumerates eleven. | Build against the **eleven enumerated**. The twelfth is not identifiable from either file and **must not be invented**. Not previously recorded by design — send back as a documentation correction, together with whether a route is genuinely missing. Found 2026-09-14 while establishing that the URL contract has no Projects route ([ADR-004](../adr/ADR-004-project-management-is-pre-shell.md)). |
