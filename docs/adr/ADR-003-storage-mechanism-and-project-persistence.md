# ADR-003 — Storage Mechanism and Project Persistence

**Status:** Approved
**Scope:** The three questions the [Architecture Blueprint](../architecture/architecture-blueprint.md) left open that block Roadmap Phase 2's filesystem `ProjectRepository` — which storage mechanism the filesystem repositories run against, what a `.sayva` file actually is, and what "SchemaVersion must be readable by the current Studio build" means concretely.
No repository implementation details, no UI, and nothing about the other six aggregates' file layouts — those arrive with the phases that build them.

## Contents

- [Context](#context)
- [Decision](#decision)
  - [Storage mechanism (SR-01)](#storage-mechanism-sr-01)
  - [Infrastructure stays server-only (SR-02)](#infrastructure-stays-server-only-sr-02)
  - [One Project is one UTF-8 JSON `.sayva` file (SR-03)](#one-project-is-one-utf-8-json-sayva-file-sr-03)
  - [A Project file is named after its ProjectId (SR-04)](#a-project-file-is-named-after-its-projectid-sr-04)
  - [The workspace root is injected, never hard-coded (SR-05)](#the-workspace-root-is-injected-never-hard-coded-sr-05)
  - [Writes are atomic — temp file then rename (SR-06)](#writes-are-atomic--temp-file-then-rename-sr-06)
  - [CURRENT_PROJECT_SCHEMA_VERSION and the compatibility gate (SR-07)](#current_project_schema_version-and-the-compatibility-gate-sr-07)
  - [Project SchemaVersion is independent of Pack schemaVersion (SR-08)](#project-schemaversion-is-independent-of-pack-schemaversion-sr-08)
- [Alternatives Considered](#alternatives-considered)
- [Consequences](#consequences)
- [Status](#status)

---

## Context

Roadmap Phase 2's second scope bullet is the filesystem `ProjectRepository`. Its first bullet — the Project aggregate and its five use cases — is complete, and the use cases already run end to end against the `ProjectRepository` port. What is missing is the adapter behind that port, and it could not be written, because three separate questions were open in the frozen documents.

**Storage was deferred by name.** Architecture Blueprint §9 lists it first among the deferred items: whether the filesystem repositories run against "direct Node `fs`, an Electron/Tauri host, or the browser File System Access API is a project/module-structure decision." §5's adapter table repeats the deferral rather than resolving it — "Concrete storage mechanism … is a §9 decision, not this one."

**The `.sayva` file was never specified.** It appears exactly twice in the repository, and neither is a specification: the Domain Model's glossary defines a Project as "One authoring workspace — a `.sayva` file", and Roadmap Phase 12 describes exporting "the `.sayva` file + Assets/" as a bundle. The Domain Model rules itself out as a source for the rest — its scope header reads "No persistence, UI, or framework structure implied."

**The SchemaVersion invariant had no rule behind it.** The Domain Model states the invariant — "SchemaVersion must be readable by the current Studio build" — without supplying either half of what enforcing it needs: the current build's version, or the predicate for "readable by". Phase 2's own acceptance criterion asks for a unit test on it ("Name required, SchemaVersion compatible"), so the gap blocked an acceptance criterion, not only the adapter.

This ADR answers all three. It is the decision Blueprint §9 anticipated, in the place §9 pointed at, so **no frozen document changes and none is amended** — §9 deferred these questions to a later project/module-structure decision, and this is that decision.

## Decision

### Storage mechanism (SR-01)

The filesystem repositories run against **direct Node `fs`** (`node:fs/promises`). Not the browser File System Access API, and no Electron or Tauri host is introduced.

Two of the three candidates Blueprint §9 named contradict architecture that is currently frozen, which is what settles this:

- **AD-05** specifies the Composition Root as "one **server-only** module" that instantiates concrete Infrastructure adapters. A File System Access API adapter is constructed in the browser, so it cannot be reached through a server-only Composition Root.
- **§6** forbids a Client Component from importing Infrastructure at all — the same adapter would need exactly that import.
- An **Electron/Tauri host** requires a shell process that does not exist. ADR-001's package table has one presentation package, `app` (Next.js), and nothing in the workspace scaffolds a desktop host.

Choosing either would mean amending AD-05 and §6, or adding a shell, before the adapter could be written. Direct Node `fs` requires neither, and it is what Phase 2's acceptance criterion already assumes when it asks for a roundtrip "against the real filesystem."

### Infrastructure stays server-only (SR-02)

The existing boundary is preserved exactly as frozen. `@sayva/infrastructure` is reachable only through the Composition Root (AD-05); no Client Component imports it (§6); `@sayva/application` and `@sayva/domain` continue to depend on nothing outside themselves and hold only the port (AD-01, ADR-002 DR-02).

Node APIs may be used freely **inside** `@sayva/infrastructure` and nowhere else. That is not a new permission: Blueprint §1's layer table already grants Infrastructure "external libraries", and it is the same table that forbids Domain any "Node APIs".

### One Project is one UTF-8 JSON `.sayva` file (SR-03)

A Project is persisted as a single UTF-8 encoded JSON file with a `.sayva` extension. Not SQLite, not a zip container, not a directory.

The file's fields are exactly the fields Domain already requires to reconstitute a Project through `restoreProject`, with `Date` values as ISO 8601 strings because JSON has no date type:

```json
{
  "schemaVersion": 1,
  "id": "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  "name": "ArSL Curriculum",
  "state": "Created",
  "createdAt": "2026-09-11T10:00:00.000Z",
  "updatedAt": "2026-09-11T10:00:00.000Z",
  "tags": []
}
```

`notes` is written only when the Project carries one. `createdBy` is never written: the Domain Model calls it "a reserved no-op in v1 — no auth yet", `restoreMetadata` does not accept it, and writing a field nothing can read back would be inventing structure.

**No envelope, no wrapper, no additional fields.** `schemaVersion` is written first so the compatibility gate is readable at the top of the file, which is presentation only — JSON object key order carries no meaning, and nothing depends on it.

Assets are **not** inside the file. Roadmap Phase 12 already describes the portable bundle as "the `.sayva` file **+ Assets/**", which places the Asset Library beside the Project file rather than within it. Phase 4 decides its layout; this ADR only records that SR-03 does not claim that ground.

### A Project file is named after its ProjectId (SR-04)

A Project's file is `<ProjectId>.sayva`, and reading a file whose contained `id` disagrees with its filename is an error rather than a silently accepted mismatch.

> **This rule was derived, not supplied.** Decisions 1–3 as approved did not name the file, and it is the one piece of this ADR that came from the contract rather than from the ruling. It is recorded separately so it can be overruled on its own.

It follows from the port. `ProjectRepository.findById(id)` must locate one Project from an id alone; every *other* repository in Blueprint §3 is scoped to a parent (`findAllByProject`, `findAllByLanguage`), but Project's is not. Naming files after the Project's `Name` would make `findById` a scan of every file in the workspace, would have to reconcile arbitrary user text with filesystem-legal characters, and would turn a rename into a file move. Naming them after the id makes `findById` a single path lookup, and Domain Model §5 already guarantees ids are unique, permanent, and never recycled — exactly the properties a filename needs.

The filename-to-`id` consistency check is that rule's enforcement. Without it, copying `a.sayva` to `b.sayva` would make `findById(b)` return a Project whose `id` is `a`, and the mismatch would propagate through the use cases as a wrong-but-plausible result instead of an error.

### The workspace root is injected, never hard-coded (SR-05)

`findAll()` enumerates the `.sayva` files in a **workspace root supplied to the adapter when it is constructed**. No default, no ambient path, nothing read from the environment inside the adapter, no constant compiled into `@sayva/infrastructure`.

Choosing where a user's projects live is the Composition Root's job under AD-05, and a hard-coded root would also make every test share one real directory. An empty root is rejected at construction rather than silently resolving to the process working directory.

Only files ending in `.sayva` are Projects. Directories and every other file in the root are ignored, which is what keeps a sibling `Assets/` directory (SR-03) from being mistaken for one.

### Writes are atomic — temp file then rename (SR-06)

`save` writes to a uniquely-named temporary file **in the destination directory**, then renames it over the destination. It never writes the destination file in place.

Rename is atomic only within one filesystem, which is why the temporary file is a sibling of its destination rather than in the system temp directory. The temporary file is removed if the write fails.

The guarantee this buys is precise: **a crash mid-write cannot produce a partially-written Project.** An interrupted `save` leaves a temporary file, and a temporary file is not named `*.sayva`, so SR-05's filter makes it invisible to `findById` and `findAll` — a previously-saved Project is left intact and readable.

The guarantee it does **not** buy, stated so it is not assumed: no `fsync` is performed, on either the file or the directory. Against a power loss rather than a process crash, a renamed file may still be incompletely flushed by the operating system. Adding durability barriers is a decision for whoever needs it, not a silent inclusion here.

### CURRENT_PROJECT_SCHEMA_VERSION and the compatibility gate (SR-07)

`CURRENT_PROJECT_SCHEMA_VERSION` is **1**, declared in `@sayva/domain` alongside the Project aggregate whose invariant it serves.

A Project is compatible when **`schemaVersion <= CURRENT_PROJECT_SCHEMA_VERSION`**. A Project whose `schemaVersion` is newer is rejected with an error naming both versions. This is the concrete meaning of the Domain Model's "SchemaVersion must be readable by the current Studio build", and it is what Roadmap Phase 12's criterion — "Importing an incompatible SchemaVersion is rejected with a clear message" — later builds on.

**The gate is checked before any other validation of a persisted Project.** Order matters here and is part of the decision: a future schema may legitimately add a Project state or change a field's shape, so validating structure first would report a newer file as malformed — a misleading error about the wrong problem. The version answers "can this build read the file at all", and it is answered first.

The gate lives in Domain because it enforces a Domain invariant — Blueprint §6's "Zod validates shape. Domain validates truth" puts structural checks at the Infrastructure boundary and truth inside Domain. Infrastructure therefore checks that `schemaVersion` is present and is a number, and Domain decides whether that number is readable.

At version 1 the `<=` rule and strict equality are behaviourally identical; the difference first becomes observable when a version 2 is introduced, and a build that accepts an older file is expected to read it, which is a migration obligation this ADR creates and does not discharge.

### Project SchemaVersion is independent of Pack schemaVersion (SR-08)

The Project's `SchemaVersion` and the Pack's `schemaVersion` are two unrelated numbers that never need to agree, are never compared, and are never derived from one another. Neither is bumped because the other was.

This restates the Pack Specification's own §8 rule — "renaming or restructuring a Domain concept never requires a schemaVersion bump by itself" — from the other side. PS-01 defines the Pack's number as a Mobile-facing gate on a shipped artifact; SR-07 defines the Project's as a Studio-facing gate on an authoring file. They version different files, for different readers, on different release cadences. `@sayva/application` and `@sayva/domain` do not import `@sayva/pack-schema` at all (ADR-001), so the separation is already structural — this rule says the coincidence of name must not be allowed to erode it.

## Alternatives Considered

### Browser File System Access API — Rejected

The user's own machine, no server process, a genuine fit for a local-first authoring tool, and one of the three candidates Blueprint §9 named.

Rejected because it contradicts two frozen decisions rather than merely being inconvenient. AD-05's Composition Root is "server-only" and §6 forbids Client Components from importing Infrastructure, so the adapter would have nowhere legal to be constructed. Adopting it means amending both first, which is a larger, separately-reviewable change — not something to absorb inside a Phase 2 implementation slice.

### An Electron or Tauri host — Rejected

Would give direct filesystem access with a desktop-native feel, and is the third of §9's candidates.

Rejected as out of scope: no such host exists in the workspace. ADR-001's package table has exactly one presentation package, `app` (Next.js), and introducing a shell process is a project-structure change far larger than the slice that surfaced the question.

### SQLite, or a zip container, for the `.sayva` file — Rejected

SQLite would make a Project queryable and give real transactional writes, answering AD-04's "no multi-file transaction primitive" note directly. A zip container would hold the Project and its Assets as one portable file.

Both rejected for v1. SQLite adds a native dependency to `@sayva/infrastructure` and buys transactionality that AD-04 has already declined to abstract over, for a file holding one small record. A zip container contradicts Phase 12's description of the bundle as "the `.sayva` file + Assets/", which already treats them as separate things. JSON keeps the file human-readable and diffable, which matters for an authoring tool's own working file, and neither rejection is permanent — SR-07's version gate is exactly the mechanism by which the format can change later.

### Strict equality for the SchemaVersion gate — Rejected

`schemaVersion === CURRENT_PROJECT_SCHEMA_VERSION`: the simplest possible rule, and it never silently mis-reads an older file.

Rejected because it makes every format change break every existing Project with no migration path, and it reads the Domain Model's invariant too narrowly — "readable by the current Studio build" describes the build's capability, not an exact match. At version 1 the two rules cannot be told apart, so this costs nothing today and preserves the option that matters later.

## Consequences

**Gained:**

- Phase 2's second scope bullet is unblocked, and its first acceptance criterion ("Name required, SchemaVersion compatible") becomes fully testable rather than half-enforced.
- Phase 2's integration criterion — a create/save/reopen roundtrip "against the real filesystem" — is directly satisfiable.
- The crash-safety property is a testable claim, not an intention: an interrupted write leaves a file that the repository provably ignores.
- Phase 12's "Importing an incompatible SchemaVersion is rejected with a clear message" now has a rule to reject against.
- The remaining six repositories inherit SR-01, SR-02, SR-05 and SR-06 rather than re-deciding them; only their own file layouts stay open.

**Cost:**

- `@sayva/infrastructure` gains `@types/node` and is now genuinely Node-bound. That is the point of SR-01, but it does mean the package can no longer run in a browser context without a further decision.
- SR-07 creates a migration obligation: introducing version 2 requires code that can still read a version 1 file, because `<=` promises it.
- `findAll()` reads and validates every `.sayva` file in the root. Fine at the scale a single author's workspace reaches; it is a scan, and a workspace large enough to feel it would need an index this ADR does not create.

**Explicitly not decided here:**

- Where the workspace root actually points. SR-05 fixes only that it is injected; choosing the path is the Composition Root's job, in the slice that builds one.
- The file layout for Language, Course, Category, Lesson, Asset, and Sign — each is decided by the phase that builds it. SR-01/02/05/06 apply; SR-03 and SR-04 are about the Project file specifically.
- The `Assets/` directory's layout (Phase 4), and the Phase 12 bundle's format.
- Whether `findAll()` should tolerate one unreadable file instead of failing. The port returns `readonly Project[]` with no channel for partial failure, so the adapter fails loudly rather than hiding a Project; giving the list screen a tolerant read would change the Domain port and needs its own decision.
- Durability barriers (`fsync`) — see SR-06.
- `ArchiveProject`, which remains absent from Blueprint §4 and from Phase 2's scope while Phase 2's manual checklist names it. Unchanged by this ADR and still open.

## Status

**Approved**, on explicit ruling from the project owner, 2026-09-11 — Decision 1 (SR-01, SR-02), Decision 2 (SR-03, SR-05, SR-06), Decision 3 (SR-07, SR-08). SR-04 was derived from the `ProjectRepository` port during implementation planning and is recorded here for separate review.

No frozen document is changed or amended by this ADR. It supplies what Architecture Blueprint §9 explicitly deferred, in the form §9 called for.
