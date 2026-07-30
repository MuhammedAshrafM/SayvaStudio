# Sayva Studio — Pack Specification

**Status:** Frozen v1.0 · Reference
**Scope:** The versioned contract between Studio and Sayva Mobile — deliberately independent from the internal [Domain Model](./domain-model.md).
Studio's authoring concerns never cross this boundary; only what Mobile needs to teach a lesson does.

## Contents

1. [Principles](#1-principles)
2. [Two Version Axes](#2-two-version-axes)
3. [Pack Envelope](#3-pack-envelope)
4. [Content Schema](#4-content-schema)
5. [Localization](#5-localization)
6. [Assets](#6-assets)
7. [Vocabulary & the ML Seam](#7-vocabulary--the-ml-seam)
8. [Compatibility Rules](#8-compatibility-rules)
9. [What Never Crosses the Boundary](#9-what-never-crosses-the-boundary)
10. [Decision Log](#10-decision-log)
11. [Deferred to Later Phases](#11-deferred-to-later-phases)

---

## 1. Principles

The Pack is a contract, not a database dump.
It's shaped by what Mobile needs to *consume*, not by what Studio needs to *author*.

Exactly one thing connects the two schemas: the **Pack Assembler**, living behind the `PackExporter` port the [Architecture Blueprint](./architecture-blueprint.md) already seeded (§4 of that document).
Either side — Domain Model or Pack Schema — may change internally as long as the Assembler can still produce a schema-conformant Pack.
That's the whole point of designing this independently: a Domain refactor shouldn't force a Mobile release, and a new Mobile feature's data need shouldn't force a Domain migration.

A Pack is self-contained (Domain Model DL-03): content, resolved locales, referenced assets, and vocabulary all ship inside one ZIP.
Mobile never phones home mid-lesson for a missing piece.

Only *Published* content is ever assembled.
Draft, Hidden, SortIndex, and every other authoring-only concern stop existing the moment the Assembler runs — §9 enumerates exactly what stops here.

## 2. Two Version Axes

Easy to conflate, so stated sharply: a Pack has two independent version numbers, answering two different questions.

| Axis | Question | Detail |
|---|---|---|
| `schemaVersion` — integer | "Can I even read this file?" | Versions the Pack's *format*. Mobile checks this first, before parsing anything else — a hard compatibility gate. Bumped only when Studio ships an Assembler producing a structurally different file. |
| `packVersion` — semver | "Is there new content?" | The per-Language content version already defined in the Domain Model (§6, DL-06). Bumped by the existing MAJOR/MINOR/PATCH table every time an author publishes. |

`schemaVersion` changes are rare and tied to a Studio release.
`packVersion` changes happen every time a Language is rebuilt.
One is about the envelope; the other is about what's inside it — never merge them into a single number.

## 3. Pack Envelope

`manifest.json` — the first thing Mobile reads.
Everything needed to decide whether to trust and parse the rest of the ZIP.

```json
{
  "schemaVersion": 1,
  "packVersion": "1.4.0",
  "languageId": "5b1e2f0a-...-uuid",
  "languageCode": "asl",
  "generatedAt": "2026-07-30T00:00:00Z",
  "minMobileAppVersion": "2.3.0",
  "baseLocale": "en-US",
  "supportedLocales": ["en-US", "es-ES"],
  "integrity": {
    "algorithm": "sha256",
    "content": "a1b2c3...",
    "vocabulary": "d4e5f6..."
  }
}
```

*(Illustrative — field set, not final wire format.)*

`minMobileAppVersion` is an optional floor — a Pack can declare it needs at least this Mobile version, independent of schemaVersion, for cases where a new field is additive at the schema level but meaningless to an old app (e.g. a new question type it wouldn't know how to render).
`integrity` lets Mobile detect a corrupted or tampered download before it starts parsing content — relevant for anything distributed as a standalone file rather than through a controlled store pipeline.

## 4. Content Schema

**Ordered arrays, not SortIndex.**
SortIndex is an authoring-time sibling-ordering mechanism; the Pack ships Courses, Categories, and Lessons as already-ordered arrays.
Mobile never sees SortIndex.

**IDs pass through unchanged.**
Every Course/Category/Lesson/Sign/Asset ID in the Pack is exactly the Domain's own UUID — never regenerated at export.
This matters more than it looks: Mobile needs stable IDs across Pack rebuilds to track which lessons a learner has already completed.
Regenerate the IDs, and every update silently resets everyone's progress (PS-03).

```json
{
  "courses": [{
    "id": "course-uuid",
    "title": { "en-US": "ASL for Beginners", "es-ES": "ASL para principiantes" },
    "difficulty": "beginner",
    "estimatedDurationMinutes": 45,
    "categories": [{
      "id": "category-uuid",
      "title": { "en-US": "Greetings" },
      "lessons": [{
        "id": "lesson-uuid",
        "title": { "en-US": "Saying Hello" },
        "blocks": [
          { "type": "tip", "text": { "en-US": "Keep eye contact while signing." } },
          { "type": "media", "assetId": "asset-uuid", "caption": { "en-US": "..." } },
          { "type": "vocabulary", "signIds": ["sign-uuid-1"] },
          { "type": "exercise", "quiz": { "questions": [{
              "type": "signRecognition",
              "prompt": { "en-US": "Show the sign for Hello" },
              "targetSignId": "sign-uuid-1"
          }]}}
        ]
      }]
    }]
  }]
}
```

*(`content.json` — one lesson, illustrative.)*

The block variants (`tip`, `media`, `vocabulary`, `exercise`) mirror the Domain Model's ContentBlock types (DL-07) in name, but the Assembler reshapes fields for what a mobile client actually needs — e.g. a Domain `AssetReference` becomes a plain `assetId` resolved against the Pack's own `assets/` folder, not a Domain value object.

## 5. Localization

A Pack ships **every locale in `supportedLocales` at once** (PS-02).
Mobile resolves display text at runtime from the device's locale, falling back to `baseLocale` — the same fallback rule LocalizedText already defines in the Domain Model, just re-expressed as a plain object per field, as shown in the `title` fields above.

Rejected alternative: one Pack per locale.
It would multiply Pack count per Language, force a rebuild for every new translation, and stop Mobile from responding to a live device-locale change without a fresh download — and it would fracture packVersion's existing per-Language granularity (DL-06) into per-Language-per-locale, which nothing else in the contract assumes.

The Domain Model's soft invariant (§7, Inv. 7) already allows a Language to ship with incomplete translations.
The Pack simply omits the missing locale key for that field; the fallback-to-`baseLocale` rule is what covers the gap at read time — Mobile's behavior here isn't new, just the necessary counterpart to a rule already frozen upstream.

## 6. Assets

An `assets/` folder inside the ZIP, containing only Assets this Language actually references — the Pack self-containment invariant (Domain Model §7, added alongside DL-03) enforced concretely.

Assets are keyed by `AssetId`, not their original authoring-time filename (PS-04) — avoids collisions and decouples the Pack from however Studio happens to name uploaded files.

| Field | Purpose |
|---|---|
| `id` | The Domain AssetId, unchanged |
| `type` | `image` \| `audio` |
| `path` | Relative path inside the ZIP's `assets/` folder |
| `checksum` | Per-file integrity check — independent of the envelope-level `integrity` block, so one corrupted image doesn't require re-validating everything |

## 7. Vocabulary & the ML Seam

`vocabulary.json` ships every Sign in the Language.

```json
{
  "signs": [
    {
      "id": "sign-uuid-1",
      "label": "HELLO",
      "displayName": { "en-US": "Hello", "es-ES": "Hola" },
      "referenceAssetId": "asset-uuid-2"
    }
  ]
}
```

*(Illustrative.)*

`label` is the deliberate seam for later integration: Mobile's Live Camera/Translation features and a future ML Studio label space both key off this same stable string.
Nothing about an ML Pack's format is being designed here — ML Studio is a separate future product — only that `label`, once shipped, is effectively a public identifier other systems will come to depend on, and must be treated that way now.

## 8. Compatibility Rules

The rule that makes "evolve independently" real, not aspirational: renaming or restructuring a Domain concept never requires a schemaVersion bump by itself — only a change to what the Assembler actually emits does.

| | Rule |
|---|---|
| ✅ Safe — no bump | Adding a new optional field to any Pack object. Mobile must ignore fields it doesn't recognize — a requirement on Mobile's parser, out of this repo's scope, but load-bearing for this whole contract. |
| ❌ Breaking — requires bump | Removing a field, changing what a field means, or changing a field from optional to required. |

## 9. What Never Crosses the Boundary

Enumerated explicitly so it's a checklist, not an assumption:

- **Authoring** — the Project entity itself; Mobile never learns a Project exists.
- **State** — Draft/Hidden content, and the Visibility enum itself (Mobile receives an already-filtered, Published-only tree).
- **Ordering** — SortIndex (replaced by array order).
- **Metadata** — `notes`, `tags`, `createdBy`, and entity revision numbers.
- **Category** — its visibility-inheritance mechanics (Domain Model DL-04) never need to exist on the Mobile side; they're resolved before the Assembler runs.

> **Amendment resolved — see Domain Model DL-08.**
> Designing the vocabulary boundary surfaced a gap in PublishGate: it gated on referential integrity and required content, but said nothing about a referenced Sign's own readiness.
> Resolved without introducing a review workflow — Sign's lifecycle (Domain Model DL-08) is a plain `Draft → Active ⇄ Deprecated`, and PublishGate now simply requires every referenced Sign to be `Active`.
> No reviewer role, no approval pipeline — see PS-05.

## 10. Decision Log

Five Pack Specification decisions, each with reason, alternatives considered, and consequences.

### PS-01 — Two independent version axes

- **Decision:** every Pack carries a `schemaVersion` (integer, format) separate from `packVersion` (semver, content — already defined by DL-06).
- **Reason:** "can I read this file" and "is there new content" are different questions with different owners (a Studio release vs. an author hitting Publish) and different change frequencies.
- **Alternatives considered:** one combined version number — rejected, it would force a content-only publish to look like a format change, or force a real format change to hide inside what looks like a routine content bump.
- **Consequences:** Mobile's update-check logic reads two fields, not one; schemaVersion becomes the hard gate checked before anything else is parsed.

### PS-02 — All supported locales ship in one Pack

- **Decision:** a Pack contains every locale declared in its Language's `supportedLocales`; Mobile resolves at runtime.
- **Reason:** keeps one Pack per Language (matching DL-06's granularity), lets Mobile react to a device locale change without a new download, and avoids a rebuild per translation.
- **Alternatives considered:** one Pack per locale — rejected; fractures packVersion granularity and multiplies build/distribution surface for no benefit v1 needs.
- **Consequences:** Pack file size scales with locale count. Acceptable for v1's scope; worth revisiting only if a Language ships in many more locales than currently anticipated.

### PS-03 — IDs pass through unchanged

- **Decision:** the Assembler never regenerates IDs — every ID in the Pack is the Domain's own UUID.
- **Reason:** Mobile needs stable identifiers across rebuilds to track per-lesson learner progress.
- **Alternatives considered:** minting separate "public" Pack-scoped IDs — rejected; adds a mapping table for no benefit, and that mapping would itself need to be stable across rebuilds, which just reinvents passing the same ID through.
- **Consequences:** Domain UUIDs are effectively permanent public identifiers once a Pack ships — reinforces the Identity Strategy's existing "never recycled" rule (Domain Model §5) with an external consumer now depending on it too.

### PS-04 — Assets keyed by AssetId, not filename

- **Decision:** every asset in the Pack's `assets/` folder is addressed by its Domain AssetId.
- **Reason:** decouples the Pack from Studio's authoring-time file naming and avoids collisions between assets uploaded with the same original filename.
- **Alternatives considered:** preserving original filenames — rejected; no guarantee of uniqueness across a Project-wide Asset Library (DL-03).
- **Consequences:** the Assembler must maintain the ID→path mapping shown in §6; Mobile never needs to know or care what an asset was originally called.

### PS-05 — A referenced Sign must be Active to publish

- **Decision:** PublishGate requires every Sign a Lesson references to be in the `Active` state (Domain Model DL-08) — it exists and is enabled, nothing more.
- **Reason:** closes the original gap (an incomplete or disabled Sign shouldn't ship) without introducing any reviewer-oriented workflow — Review Workflow is explicitly out of scope for v1.
- **Alternatives considered:** the originally proposed `Verified` state — rejected, it implied a review actor/process that doesn't exist in v1 (see Domain Model DL-08); leaving Sign state out of PublishGate entirely — rejected, it would let an incomplete Draft Sign ship silently, the actual gap this closes.
- **Consequences:** PublishGate's Sign check is existence + one enum comparison — no new concept beyond what ReferentialIntegrityChecker already does. This amended the already-frozen Domain Model (DL-08 added) with explicit approval, not silently.

## 11. Deferred to Later Phases

Named so they aren't silently assumed.

- **Integrity** — exact checksum/hash algorithm is an implementation choice, not a specification concern.
- **Delta updates** — per-asset checksums (§6) leave room for an incremental/delta download later; not designed now.
- **ML Pack** — its own format is a separate future product's concern; only the `label` seam (§7) matters here.
- **minMobileAppVersion** — how Studio would know which Mobile versions exist isn't needed for v1's manual internal distribution.
