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

- Where the workspace root actually points. SR-05 fixes only that it is injected; **SR-09 (below) fixes how it arrives**; the directory itself remains a deployment decision and is still not chosen here.
- The file layout for Language, Course, Category, Lesson, Asset, and Sign — each is decided by the phase that builds it. SR-01/02/05/06 apply; SR-03 and SR-04 are about the Project file specifically.
- The `Assets/` directory's layout (Phase 4), and the Phase 12 bundle's format.
- Whether `findAll()` should tolerate one unreadable file instead of failing. The port returns `readonly Project[]` with no channel for partial failure, so the adapter fails loudly rather than hiding a Project; giving the list screen a tolerant read would change the Domain port and needs its own decision.
- Durability barriers (`fsync`) — see SR-06.
- `ArchiveProject`, which remains absent from Blueprint §4 and from Phase 2's scope while Phase 2's manual checklist names it. Unchanged by this ADR and still open.

## Amendment — SR-09: the workspace root reaches the Composition Root through the environment

**Approved 2026-09-22 as decision PP-02.** SR-05 fixed that the root is *injected*; it deferred *how it arrives* and *where it points*. This settles the mechanism. **It does not choose a directory.**

- **Decision:** the workspace root is supplied by the environment variable **`SAYVA_WORKSPACE_ROOT`**, read **only** in the Composition Root. There is **no default** — an absent or empty value fails loudly rather than resolving to anything. `@sayva/infrastructure` continues to receive the root as a constructor argument and reads no environment variable of its own, exactly as SR-05 requires: "no ambient path, nothing read from the environment inside the adapter".
- **The root is also presentation data.** The canonical Project Picker design has the surface name the location it is listing — an empty picker that cannot say *where* Studio looked is the "broken screen" the design's own absence-state rule warns about. The root therefore crosses the Server→Client boundary as a plain serializable string, like any other Response Model value (AD-02, Blueprint §6). It is displayed only: the picker cannot change it.
- **Reason:** the workspace root is deployment configuration, not architecture. An environment variable keeps the choice out of the codebase entirely, needs no new config file format, and is read in the one module AD-05 already designates for concrete wiring. Failing loudly rather than defaulting is what keeps SR-05's "no default" true in practice rather than only on paper.
- **Alternatives considered:** a per-OS default directory by convention — rejected twice over: it is the invention ADR-003 declined to make, and a silent default is how a user's projects end up somewhere they never chose. A config file — rejected; it buys nothing an environment variable does not and adds a format decision. Passing the root in from the Composition Root's caller — rejected as circular, relocating the question rather than answering it.
- **Consequences:** Studio will not start without `SAYVA_WORKSPACE_ROOT` set, which is intended. Multi-root is **not** supported and not designed. The actual directory remains a deployment decision, documented for operators rather than fixed here.

## Amendment — SR-10: a repository failure reaches the interface through a Domain-side contract

**Approved in principle 2026-09-24 as readiness ruling RB-1.** It fixes where a failure's information may travel. It does not fix the exact shape of the contract, which is implementation work for the slice that needs it.

- **The problem it settles:** the canonical Project Picker design has its error state show the affected location — `ProjectFileError.path`. That error is an Infrastructure class. Blueprint §2 forbids a component from importing one; ADR-002 DR-02 forbids Application from importing Infrastructure at all; and AD-07 forbids a Server Component from deciding which state to show. Read literally, no layer could legally carry the path to the screen.
- **Decision:** the repository's failure contract is declared where the port itself is declared — Domain, per AD-01 — and it carries what the canonical design needs to represent a project-file failure, **including the affected location where the design requires it**. Application catches that Domain-side failure and maps it into a serializable View Model state (AD-02, AD-07). Presentation renders the state it is handed and never inspects an error.
- **`ProjectFileError` stays an Infrastructure implementation detail.** It realises the Domain-side contract; it is not the contract. Nothing in Domain, Application or Presentation imports it or anything else from `@sayva/infrastructure`.
- **What it deliberately does not carry:** a trace ID. The error state's trace ID is a separate `SyStateBlock` contract (AC14), supplied by SR-11 below, and the file location must not stand in for it.
- **What it does not change:** `findAll()` still fails the whole call on one unreadable file. Tolerant repository reads remain undecided, exactly as recorded above.
- **Implemented 2026-09-28**, with the Project Picker's read-only slice. The contract is `ProjectFileFailure`, declared in `@sayva/domain` beside `ProjectRepository`: an `Error` whose one addition is `location`. `ProjectFileError` extends it and passes its `path` as that location. `viewProjectListUseCase` catches only this class and returns `{ status: 'error', traceId, location }`; any other failure is a defect and is rethrown untraced rather than shown as a read failure, which narrows the catch-all RB-2 shipped with.
- **Extended 2026-09-29 (Create Project decision closure, B11).** `save` creates the workspace root before it writes (SR-05, SR-06). A failure to create that root is now the same contract: a `ProjectFileError` located at the workspace root, not a raw filesystem error escaping the port. Write and rename failures were already this contract, located at the Project file. This covers exactly what Create needs; no other repository operation changes, and the Node error stays an Infrastructure detail carried only as `cause`.
- **Extended 2026-10-11 (reading a workspace root that is not a directory).** The decision covers the two reads, `findById` and `findAll`. When a configured workspace root exists but is not a directory, each fails with the port's failure contract, located at the root, on every platform. Neither reports the root as absent.
  - `findById` changed to fail this way. Before, it depended on the platform. Windows reports `ENOENT` for a path beneath a file, so `findById` answered `null`. POSIX reports `ENOTDIR`, so `findById` failed, but located at the Project file rather than the root.
  - `findAll` already fails this way on both platforms ("could not be listed"). That behaviour is kept.
  - The adapter decides this by inspecting the root, never by the error code.
  - The writes are outside this decision and do not change:
    - `save` already fails at the root on both platforms, because the root cannot be created (B11, "could not be created").
    - `delete` is not decided. Today it succeeds on Windows, as if the Project were already gone, and fails on POSIX, located at the Project file.
  - A root that does not exist is unchanged. It stays an empty workspace — `null` from `findById`, an empty list from `findAll` — as Screens §04 §12 states: "A missing root is an empty workspace, not an error."
  - Not decided: a root that does not exist because one of its parent folders is a file. Today it reads as absent on Windows and fails on POSIX.
  - **Implemented 2026-10-11.** `findById` inspects the root only after a read has failed or found no file, so opening a Project that is there costs nothing extra. A root that does not exist, or cannot be inspected, leaves the read's own outcome. The tests inject each platform's read error, so both paths run on any platform; at implementation they were run on Windows only.

## Amendment — SR-11: a Project list read failure carries a per-occurrence trace ID

**Approved 2026-09-24 as readiness ruling RB-2, option B.**

- **The problem it settles:** `SyStateBlock`'s `error` state requires a trace ID (AC14) and prints it after a fixed, visible **Trace ID** label. The file path was ruled out — it is location, and it is already on screen. Next.js's `digest` was ruled out. A stable diagnostic code was ruled out because under that label it names a *kind* of failure as though it were one occurrence of it. What was left was a real trace, and that needs a mechanism.
- **Decision:** a minimal one. Domain declares a `FailureTracer` port beside `IdGenerator` and `Clock`; Infrastructure implements it; the Composition Root wires it. When the Project list cannot be read, Application asks the tracer for a trace ID and puts it into the serializable View Model state. The tracer generates a fresh identifier for that one occurrence **and** writes it, with the failure's details, to the server process's own diagnostic output — one line. That line is what makes it a trace: the value on screen leads to a record of what went wrong. An identifier that led nowhere would be the same mislabelling as the diagnostic code, one step removed.
- **Why the port is in Domain even though Domain never calls it:** Architecture Blueprint §5 — "every adapter here implements an interface Domain declares" — and ADR-002 DR-02 makes Domain the only layer both Application and Infrastructure can see. An Application-declared port could not be implemented by Infrastructure without importing Application, which DR-02 forbids.
- **Why `IdGenerator` is not reused:** its contract is "supplies entity identity" (Domain Model §5). A trace identifies an occurrence of a failure, not an entity, and routing it through the entity-identity port would tell every future reader that traces are entities. The *technique* — `randomUUID` inside Infrastructure — is reused; the port is not.
- **Scope, stated so it is not widened by accident:** only the Project list's read failure is traced. Nothing else calls the tracer. It is not a logging system, adds no external telemetry, and needs no configuration.
- **Not persisted:** the trace ID is never written to the repository, a `.sayva` file, or any store. It exists in the returned View Model and in one line of the server's existing output, which the application neither stores nor reads back.
- **What it does not change:** the frozen `SyStateBlock` contract; `listProjectsUseCase`, `ProjectView`, `ProjectUseCaseDeps` and the repository port; tolerant repository reads, still undecided. SR-10's Domain-side failure contract — the affected *location* — arrived separately, with the read-only slice; this carries only the trace.
- **Extended 2026-09-29 (Create Project decision closure, B2).** A failed Create write is traced too. The canonical Create design shows it through `SyStateBlock`'s `error` state, which requires a trace ID (AC14). It uses the same `FailureTracer` port and adapter, with one trace per failed write attempt, so a Retry that fails again is a new occurrence. The tracer is wired into the Create command only, never into `ProjectUseCaseDeps` as a whole, and the Create command's `write-failed` result carries `traceId` and `location`. This supersedes the scope bullet above: exactly two failures are now traced, the list read and the Create write, and nothing else calls the tracer. It is still not a logging system and still not persisted.
- **Extended 2026-10-03 (Open decisions OD-6 and OD-8, [ADR-005](./ADR-005-opening-a-project-the-workspace-url.md)).** The existing `FailureTracer` is extended to cover Open read failures, in addition to the existing Project-list read and Create write failures. Each failure receives a unique trace ID per occurrence. Not-found outcomes are absence, not failures, and are never traced.
  - **What counts as an Open read failure:** a can't-read outcome of Open (ADR-005 OP-07), whether it comes from the Picker's `Open` or from resolving a workspace URL. Both use the same port and adapter, so a `Retry` that fails again is a new occurrence with a new trace ID.
  - **The three traced failure categories** are now the Project-list read, the Create write and the Open read. This supersedes the Create extension's scope above. Nothing else calls the tracer.
  - **Unchanged guarantees:** one trace ID per failure occurrence; never the file path; never Next.js's `digest`; never persisted. It is still not a logging system.
  - **Unchanged wiring rule:** as with Create, the tracer reaches each traced operation through that operation's own dependencies, never through `ProjectUseCaseDeps` as a whole.

## Status

**Approved**, on explicit ruling from the project owner, 2026-09-11 — Decision 1 (SR-01, SR-02), Decision 2 (SR-03, SR-05, SR-06), Decision 3 (SR-07, SR-08). SR-04 was derived from the `ProjectRepository` port during implementation planning and is recorded here for separate review.

No frozen document is changed or amended by this ADR. It supplies what Architecture Blueprint §9 explicitly deferred, in the form §9 called for.
