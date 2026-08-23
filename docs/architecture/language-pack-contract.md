# Sayva Ecosystem — Language Pack Contract

**Status:** Approved · Target contract · Not yet implemented
**Scope:** The canonical definition of a **Language Pack** — the complete, validated, versioned, self-contained artifact that Sayva Mobile consumes — and the division of responsibility for producing it across Sayva Studio Web, Sayva ML Studio, and Sayva Mobile.

This document is **ecosystem-level**, not Studio-level.
It lives in this repository because Pack Assembly and publishing are owned here, consistent with the `PackExporter` port already seeded in the [Architecture Blueprint](./architecture-blueprint.md) §4 and the publish pipeline described in the design handoff.
Sayva Mobile and Sayva ML Studio **reference** this document rather than maintaining their own copies — see [§10](#10-adoption--cross-references).

It introduces no new architecture into Studio itself.
Nothing here renames, rewrites, or supersedes the frozen [Pack Specification](./pack-specification.md), the frozen [Domain Model](./domain-model.md), or any shipped Sayva Mobile schema — [§9](#9-relationship-to-existing-frozen-documents) states exactly what this does and does not change.

## Contents

1. [Why this document exists](#1-why-this-document-exists)
2. [Canonical terms](#2-canonical-terms)
3. [Pack structure](#3-pack-structure)
4. [Optional bundles and capabilities](#4-optional-bundles-and-capabilities)
5. [Vocabulary ownership](#5-vocabulary-ownership)
6. [Versioning and compatibility](#6-versioning-and-compatibility)
7. [Production flow and ownership](#7-production-flow-and-ownership)
8. [Regional variants](#8-regional-variants)
9. [Relationship to existing frozen documents](#9-relationship-to-existing-frozen-documents)
10. [Adoption / cross-references](#10-adoption--cross-references)
11. [Decision Log](#11-decision-log)
12. [Open items](#12-open-items)

---

## 1. Why this document exists

Until now, "Language Pack" named two structurally different artifacts, both consumed by Sayva Mobile.

Sayva Mobile's `LanguagePack` carries recognition **models** — model binaries, inference strategy, confidence thresholds, output labels — alongside curriculum content.
This repository's frozen [Pack Specification](./pack-specification.md) defines a different artifact entirely: content, vocabulary, and assets, with **no models at all**, and its §11 explicitly defers the model-bearing artifact as "a separate future product's concern."

Both are real, both ship to the same application, and both were called a Language Pack.
That ambiguity blocks any Web → ML Studio → Mobile pipeline design, because "produce a Language Pack" does not identify which artifact is meant.

This document resolves that by naming the whole and its parts.
It was raised as **D-40** in Sayva Mobile's Phase 6 plan and is closed by this document.

## 2. Canonical terms

A **Language Pack** is the complete distributable product consumed by Sayva Mobile.
It is one artifact per language or regional variant, and it has exactly three parts.

| Term | Contains | Produced by |
|---|---|---|
| **Content Bundle** | Vocabulary identity, display labels and translations, curriculum, achievements, challenges, media assets, regional/language metadata | **Sayva Studio Web** |
| **ML Bundle** | Model binaries, the ordered model class list, evaluation metadata, model provenance | **Sayva ML Studio** |
| **Pack Manifest** | Versions, compatibility, capabilities, integrity/checksums, preprocessing and inference configuration, runtime requirements | **Pack Assembler** (Studio Web) |

Mapping to the artifacts that exist today — this is the substance of the resolution:

| Existing artifact | Canonical role |
|---|---|
| This repository's frozen "Pack" ([Pack Specification](./pack-specification.md)) | the **Content Bundle** |
| The "ML Pack" that specification defers (§11) | the **ML Bundle** |
| Sayva Mobile's current `LanguagePack` | the **Language Pack** — all three parts together |

**No file, schema, field, or frozen document is renamed by this mapping.**
It is a naming layer that makes the existing artifacts describable without collision.

## 3. Pack structure

```
<pack_code>/                    one language or regional variant
├── manifest.json               Pack Manifest — the only file Mobile parses first
├── content/                    Content Bundle
│   ├── vocabulary.json         sign identity + display names
│   ├── labels/<output>.json    per output language
│   ├── curriculum.json
│   ├── achievements.json
│   ├── challenges.json
│   └── assets/                 media, keyed by asset id
└── ml/                         ML Bundle
    ├── models/<model_id>        model binaries
    └── models.json             class list, IO shape, evaluation metadata
```

*(Illustrative layout — the directory shape is part of this contract; exact filenames and wire format are settled when the schema is implemented.)*

The Pack Manifest is the first and only thing Mobile reads before deciding whether to trust and parse the rest.
It binds a specific Content Bundle version to a specific set of ML Bundle models, declares what the pack supports, and carries the integrity metadata that makes the binding verifiable.

## 4. Optional bundles and capabilities

Both bundles are optional; the manifest is not.

- A **Content-only** Language Pack is valid.
  It supports learning and curriculum use without recognition, and is the expected shape for a language or variant whose curriculum exists before any model has been trained.
- An **ML Bundle may exist as an intermediate artifact** — the output of a training and export run, registered and evaluated before it is bound into anything.
  It is **not** a distributable.
  The final Language Pack that Sayva Mobile consumes is always assembled and validated through the Pack Assembler ([§7](#7-production-flow-and-ownership)).
- The manifest's **`capabilities` block must explicitly and exhaustively describe what the assembled pack supports** — which recognition roles it serves, if any, and which content surfaces it provides.
  Mobile decides what to offer the user from `capabilities`, never by inferring from the presence or absence of files.

A pack that declares a capability it cannot serve is invalid and must fail assembly.

## 5. Vocabulary ownership

Vocabulary is the one concern that genuinely spans both bundles, and splitting it correctly is load-bearing.

A model's output layer is index-bound to its class list: the *n*-th output unit means the *n*-th sign, and nothing in the artifact makes that ordering self-describing.
Reordering the list silently corrupts every prediction rather than failing loudly.

| Concern | Owner | Rationale |
|---|---|---|
| **Ordered model class list** (index → sign id) | **Sayva ML Studio**, frozen with the model it belongs to | It is a property of the trained model, not of the curriculum |
| **Stable sign identity, display labels, translations** | **Sayva Studio Web** | Editorial content — authored, reviewed, translated, versioned |
| **Integration key** | the **stable sign ID** | The single string both sides agree on |

The stable sign ID is the join between the two bundles.
This seam is not newly invented here: the frozen [Pack Specification](./pack-specification.md) §7 already designates the vocabulary `label` as "the deliberate seam for later integration," noting that Mobile's recognition features and a future ML Studio label space "both key off this same stable string."

**Consequence to accept.** Once a sign ID ships inside any Language Pack it is a public identifier, and renaming it is a breaking change — the same rule the Pack Specification's PS-03 already applies to IDs, now extended across the ML boundary.

## 6. Versioning and compatibility

Four version axes, because they answer four different questions and have four different owners.

| Axis | Question | Owner |
|---|---|---|
| `schemaVersion` (integer) | "Can this artifact be read at all?" | Pack format — an ecosystem release |
| `packVersion` (semver) | "Is this a new release of this pack?" | Pack Assembler |
| Content Bundle version (semver) | "Did curriculum, labels, or vocabulary change?" | Sayva Studio Web |
| ML Bundle model versions (semver) | "Was a model retrained?" | Sayva ML Studio |

A runtime floor (`minAppVersion`, or equivalent) is carried alongside them and owned by the Pack Assembler.

Independent component versions are what make two already-frozen rules true rather than aspirational:

- The design handoff's tenet **T4** — *"Content and models evolve separately — a retrained model must never require a content republish."*
- The domain rule **"Models never point at content — pairing happens only in a Release."**

Under this contract, **the Language Pack is that Release.**
The manifest is the only place where a content version and a model set are bound together, which is precisely why the binding must be explicit, versioned, and integrity-checked.

## 7. Production flow and ownership

```
  SAYVA STUDIO WEB                          SAYVA ML STUDIO
  ────────────────                          ───────────────
  language / region management              dataset preprocessing
  vocabulary identity + labels              feature extraction
  curriculum / assets                       training
  annotation + review workflow              evaluation / comparison
  dataset curation                          model validation
         │                                  model export
         │   approved sign list  ──────────────►│
         │◄──────────────  registered model     │
         │                 + ordered class list │
         ▼
   PACK ASSEMBLER  (Studio Web publish step)
   binds Content Bundle version + ML Bundle
   → writes manifest → computes integrity → validates
         │
         ▼
   LANGUAGE PACK  (validated, versioned, self-contained)
         │
         ▼
  SAYVA MOBILE — verifies schemaVersion, then integrity, then loads.
                 Never learns how the pack was produced.
```

Pack Assembly is owned by Sayva Studio Web, consistent with the `PackExporter` port this repository's [Architecture Blueprint](./architecture-blueprint.md) already defines and with the model-registration workflow the design handoff already describes.

**Boundaries, stated as rules:**

| Component | Must | Must not |
|---|---|---|
| **Sayva Studio Web** | Own content, curation, review, assembly, publishing | Train, evaluate, or convert models |
| **Sayva ML Studio** | Own preprocessing, training, evaluation, validation, export | Author curriculum, labels, or translations |
| **Sayva Mobile** | Consume a validated, versioned, self-contained pack | Parse datasets, lineage, or experiment metadata; reconstruct how a pack was produced |

A pack that fails validation is not assembled.
Sayva Mobile never sees an invalid Language Pack, and is not responsible for detecting one beyond its own schema and integrity gates.

## 8. Regional variants

Each regional variant is **its own Language Pack**, with its own pack code, vocabulary, dataset, model, evaluation results, manifest, and version.
Variants are **not** assumed interchangeable, and no monolithic pack stands in for a family of them.

This applies first to Arabic Sign Language, which is treated as a family of regional variants rather than one language.

What may be shared upstream without merging the packs: media assets — this repository's Asset aggregate is already Project-scoped (Domain Model DL-03), so one library can serve several variants — along with annotation tooling and review workflow.
What must never be shared across variants: class lists, models, and evaluation results.

**Not decided here, deliberately:** the variant list itself, and how each variant's `pack_code` is assigned.
Regional variant naming and coverage depend on datasets and naming conventions that do not yet exist, and no code, taxonomy, or family-grouping mechanism is committed to by this document.

## 9. Relationship to existing frozen documents

| Document | Effect of this contract |
|---|---|
| [Pack Specification](./pack-specification.md) (Frozen v1.0) | **Unchanged.** Its artifact is now called the Content Bundle. Its §7 `label` seam and §11 deferral of the ML artifact are both confirmed, not revised. |
| [Domain Model](./domain-model.md) | **Unchanged.** "Models never point at content" is preserved and given its binding point ([§6](#6-versioning-and-compatibility)). |
| [Architecture Blueprint](./architecture-blueprint.md) | **Unchanged.** `PackExporter` remains the assembly seam. |
| [Implementation Roadmap](../planning/implementation-roadmap.md) | **Not amended by this document.** The Data and Models planes this contract implies are not in the frozen 0–13 sequence; sequencing them is a separate roadmap decision. |
| Sayva Mobile's pack schema | **Unchanged.** Mobile's current pack keeps working exactly as it does today. No migration is authorized by this document. |

**No implementation is authorized by this contract.**
It is the target that Web and ML Studio pipeline work aims at when that work is scheduled — not a change request against anything currently shipped.

## 10. Adoption / cross-references

This document is canonical and is not to be duplicated.
Other repositories reference it rather than restating it.

| Repository | Reference | Status |
|---|---|---|
| **Sayva Studio Web** (this repository) | `docs/architecture/language-pack-contract.md` | Canonical source |
| **Sayva Mobile** | `docs/PHASE_6_IMPLEMENTATION_PLAN.md` — Decision Log **D-40** | Referenced |
| **Sayva ML Studio** | — | **Pending** — the project does not exist yet; the reference is added when the repository is created |

## 11. Decision Log

Eight decisions, each with its reason and its consequence.

### LP-01 — "Language Pack" names the complete distributable

- **Decision:** a Language Pack is the whole artifact Mobile consumes — Content Bundle plus ML Bundle plus Pack Manifest — not the content artifact alone.
- **Reason:** the term was already used this way by Sayva Mobile, and the alternative (Language Pack meaning content only) would have left the composite artifact unnamed.
- **Alternatives considered:** renaming Mobile's artifact — rejected, it affects shipped code; renaming this repository's artifact — rejected, its specification is frozen.
- **Consequences:** both existing artifacts keep their schemas and gain canonical roles ([§2](#2-canonical-terms)). Neither repository renames anything now.

### LP-02 — Three-part separation

- **Decision:** every Language Pack separates content data, ML assets, and manifest/integrity metadata.
- **Reason:** the three have different owners, different change frequencies, and different validation rules; collapsing them is what produced the original ambiguity.
- **Consequences:** the directory shape in [§3](#3-pack-structure) is part of the contract, not an implementation detail.

### LP-03 — Both bundles are optional; the manifest is not

- **Decision:** a Content-only pack is valid; an ML Bundle may exist as an intermediate artifact but is never distributed on its own.
- **Reason:** curriculum for a language routinely exists before a model does, and blocking publication on a model that may be months away would be wrong.
- **Consequences:** Mobile must handle a pack with no recognition capability as a normal case, not an error.

### LP-04 — Capabilities are declared, never inferred

- **Decision:** the manifest explicitly and exhaustively declares what the assembled pack supports; a pack declaring a capability it cannot serve fails assembly.
- **Reason:** inferring capability from file presence produces exactly the class of failure that motivated this contract — a declared role with nothing behind it.
- **Consequences:** Mobile reads `capabilities` to decide what to offer; adding a capability is a manifest change, reviewed like any other.

### LP-05 — The ordered class list belongs to the model, not the curriculum

- **Decision:** ML Studio owns the ordered class list and freezes it with the model; Studio Web owns sign identity, labels, and translations.
- **Reason:** output index → sign mapping is a property of the trained model. An editorial reordering in a content tool would silently corrupt predictions.
- **Alternatives considered:** a single shared vocabulary owned by Studio Web — rejected for exactly that failure mode.
- **Consequences:** the two vocabularies are joined by the stable sign ID, and assembly must verify that every class the model emits resolves to a sign the Content Bundle defines.

### LP-06 — The stable sign ID is the integration key

- **Decision:** one stable string joins Content Bundle and ML Bundle.
- **Reason:** it is already the designated seam in the frozen Pack Specification §7.
- **Consequences:** a shipped sign ID is a public identifier; renaming one is a breaking change ([§5](#5-vocabulary-ownership)).

### LP-07 — Pack Assembly is owned by Sayva Studio Web

- **Decision:** the Pack Assembler — binding, manifest generation, integrity, validation, publishing — lives in Studio Web.
- **Reason:** consistent with the `PackExporter` port already defined here and the model-registration and publish workflows already designed here.
- **Alternatives considered:** a standalone assembler, or assembly in ML Studio — both rejected as splitting publishing away from the review and release workflow that governs it.
- **Consequences:** ML Studio registers models into Studio Web rather than publishing directly to Mobile.

### LP-08 — Regional variants are separate packs

- **Decision:** each regional variant is an independent Language Pack; no monolithic pack represents a family.
- **Reason:** regional sign languages are not interchangeable, and a single model claiming to serve all of them would misrepresent its coverage.
- **Consequences:** assets and tooling may be shared upstream; class lists, models, and evaluation results may not. Variant naming and pack codes remain open ([§12](#12-open-items)).

## 12. Open items

Named so they are not silently assumed decided.

- **Wire format.** Exact filenames, field names, and serialization for the manifest and both bundles are settled when the schema is implemented, not here.
- **Regional variant list and pack codes.** Depends on datasets and naming conventions that do not yet exist. No code is assigned by this document.
- **Sayva ML Studio.** The project does not exist. Whether it is extracted from Sayva Mobile's existing `ml/` pipeline or built new is undecided, and this contract works either way.
- **Roadmap sequencing.** The Data and Models planes this contract implies are not in this repository's frozen implementation roadmap; adding them is a separate decision.
- **Distribution.** How an assembled pack reaches a device — bundled, imported locally, or delivered remotely — is out of scope. Sayva Mobile currently supports bundled and local import only.
