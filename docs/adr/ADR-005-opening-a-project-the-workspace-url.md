# ADR-005 — Opening a Project: The Workspace URL

**Status:** Approved
**Scope:** What opening a Project from the pre-shell Project Picker does — the URL an opened Project is reached at, how that URL resolves, what it does and does not grant, and how a failure to open is classified until finer distinctions are decided.
Not the design of the surface that URL shows: that is the temporary Workspace Entry, placed by [ADR-004 WS-05](./ADR-004-project-management-is-pre-shell.md#amendment--ws-05-opening-a-project-lands-on-a-temporary-pre-shell-workspace-entry) and commissioned in [the Workspace Entry design commission](../planning/phase-2-workspace-entry-design-commission.md). Not the shell, not the shell's routes, and no change to the URL contract's eleven routes. Nothing here is implemented, and this ADR does not authorize implementation.

## Contents

- [Context](#context)
- [Decision](#decision)
  - [The opened workspace's URL carries its ProjectId (OP-01)](#the-opened-workspaces-url-carries-its-projectid-op-01)
  - [The URL is resolved on every request (OP-02)](#the-url-is-resolved-on-every-request-op-02)
  - [Each tab holds its own Project, and a refresh keeps it (OP-03)](#each-tab-holds-its-own-project-and-a-refresh-keeps-it-op-03)
  - [Following a URL is not reopening (OP-04)](#following-a-url-is-not-reopening-op-04)
  - [A workspace URL identifies a Project and grants nothing (OP-05)](#a-workspace-url-identifies-a-project-and-grants-nothing-op-05)
  - [A Project with zero Languages is valid (OP-06)](#a-project-with-zero-languages-is-valid-op-06)
  - [Failures to open fall into two temporary categories (OP-07)](#failures-to-open-fall-into-two-temporary-categories-op-07)
  - [Open validates first, then navigates (OP-08)](#open-validates-first-then-navigates-op-08)
  - [The decision register (OD-1 to OD-8)](#the-decision-register-od-1-to-od-8)
- [Alternatives Considered](#alternatives-considered)
- [Consequences](#consequences)
- [Explicitly not decided here](#explicitly-not-decided-here)
- [Status](#status)

---

## Context

Roadmap Phase 2's freeze point requires that *"A Project can be created, opened, saved, duplicated, and deleted end-to-end"*, and its manual checklist opens a Project through the UI. The Picker already lists Projects and creates them. Opening one could not be built, because the canonical sources left four things open.

**Opening had nowhere to land.** Screens §04 §2 has opening hand *"the opened ProjectId to the shell"*. The shell, `SyAppShell`, is contracted but not built — Phase 1's scope decision D1 deferred it — and [ADR-004](./ADR-004-project-management-is-pre-shell.md)'s Consequences name the gap: *"Where opening a Project lands is now an explicit question."* Every content route needs a `:lang`, and a Project in this phase has no Language.

**Two product requirements had no repository record.** Both were confirmed by the project owner on 2026-10-01, and this ADR is where they are now written down:

- **PR-OPEN-01 — Independent Project context per browser tab.** Each browser tab must be able to open and work with a different Project independently. Changing the Project in one tab must not change the active Project in another.
- **PR-OPEN-02 — Refresh persistence.** When a tab is refreshed, it must stay associated with the Project it had open.

**On a refresh, the only per-tab state the server sees is the URL.** A browser has one cookie jar, so a cookie set from one tab is what every other tab sends. `sessionStorage`, `window.name` and the URL fragment are per tab, but none of them reaches the server. Server Components decide what a page shows (AD-07), so a Project that has to survive a refresh in one tab, and only that tab, has to be named in that tab's URL.

**And Screens §04 §11 forbade exactly that:** *"No Project id appears in any URL: a Project id resolves only on a machine whose workspace root holds that file, so such a link would work for exactly one person."*

## Decision

Ruled by the project owner: OD-1 on 2026-10-01, and OD-2 to OD-8 on 2026-10-03, together with the URL's exact shape, the not-found announcement surface, and the absence of any return control. Each is listed with the identifier it was ruled under in [the decision register](#the-decision-register-od-1-to-od-8).

### The opened workspace's URL carries its ProjectId (OP-01)

An opened Project is reached at **`/workspace/{projectId}`**, a **temporary pre-shell workspace URL**.

It is the **one narrow exception** to Screens §04 §11's *"No Project id appears in any URL"*. §11's reason stands, and the exception inherits it (OP-05).

It sits **outside the canonical URL contract**:

- It is not added to `foundations.url-contract.routes`, which still enumerates eleven routes.
- It is **not route twelve**, and not the missing twelfth route of [recorded discrepancy #4](../design-system/README.md#recorded-discrepancies). The handoff's *"URL contract (12 routes)"* is unchanged, and that discrepancy stays open.
- It is not a Language shell route, and no workspace recipe's `url` names it.
- It is temporary. It serves the Workspace Entry (ADR-004 WS-05) until the shell exists, and whether the shell's own routes carry a ProjectId is not decided here.

The Project Picker set the precedent: it occupies the application root and *"adds no entry to the canonical URL contract"*.

### The URL is resolved on every request (OP-02)

The `{projectId}` route parameter is validated and resolved by the existing **`openProjectUseCase`**, a Query, on every request. Its `load` checks the value against the canonical `ProjectId` form (`toProjectId`) before any file path is built, then reads the Project through `ProjectRepository.findById`.

A Server Component that renders the workspace calls that Query and renders what it returns, which is AD-07's rule as written. Architecture Blueprint §6 and AD-07 are unchanged.

Nothing else holds "the open Project": no cookie, no session store, no browser storage, no server-side context and no token. A later Command that acts on the opened Project receives the ProjectId as an explicit argument and resolves it again. OP-09 (below) adds that each request resolves it exactly once.

### Each tab holds its own Project, and a refresh keeps it (OP-03)

PR-OPEN-01 and PR-OPEN-02 follow from OP-01 and OP-02 with no further mechanism.

- Each browser tab identifies its own Project through its own URL, so changing the Project in one tab cannot change another's.
- A refresh, or the browser restoring the tab, sends the same URL and resolves the same Project again, against whatever the projects folder holds at that moment.

### Following a URL is not reopening (OP-04)

**`/` always displays the Project Picker.** Studio never chooses a Project on its own, and no last-opened Project is remembered. §04 §2's *"No automatic reopen"* stands, because it would need a preferences store no source defines.

A workspace URL **always opens the Project it identifies**, however it is reached: a refresh, browser history, a bookmark, a copied URL, or the browser restoring its tabs. That is the author following an explicit URL, not Studio deciding to reopen something, and the two stay distinct.

### A workspace URL identifies a Project and grants nothing (OP-05)

A workspace URL identifies a Project **within the configured projects folder** (ADR-003 SR-05, SR-09). Anywhere else — another machine, or another `SAYVA_WORKSPACE_ROOT` — it opens the Project only where the matching `<ProjectId>.sayva` file exists, and is *not here* otherwise (OP-07).

- It **grants no access** and is **not an authentication credential**. v1 has no authentication: the Domain Model makes `createdBy` *"a reserved no-op in v1 — no auth yet"*, and none is introduced here.
- It is **not portable** between installations. A Project moves between Studio installations by Import/Export (Roadmap Phase 12), never by link.
- A ProjectId is not a secret. It is already part of the Picker's page data.

### A Project with zero Languages is valid (OP-06)

The Domain Model's §1 glossary says a Project *"Contains one or more Languages"*. Its §3 invariants for a Project are *"Name required, non-empty · SchemaVersion must be readable by the current Studio build"*, and none of §7's eight Domain Invariants requires a Language. The glossary describes what a Project is for; the invariants define what makes one valid.

A Project with zero Languages is therefore valid. In Phase 2 every Project has zero, which is what Phase 2's freeze point means by *"Correctly still an empty shell — no Language yet"*. The Workspace Entry supports that state (ADR-004 WS-05).

This is a reading of the Domain Model, in the form ADR-003 SR-07 used for the SchemaVersion invariant. **The frozen Domain Model is not edited.**

### Failures to open fall into two temporary categories (OP-07)

Until finer distinctions are decided, every failure to open is either **not here** or **can't read**. The table maps each case to the contract that exists today. Nothing here adds a repository capability.

| Category | Case | What happens today |
|---|---|---|
| **Not here** | A malformed ProjectId | `toProjectId` rejects it with a `DomainError` before any path is built. Domain also exports `isProjectId`. |
| | A valid ProjectId with no matching file | `findById` returns `null`, and `openProjectUseCase` throws `ProjectNotFoundError`. *(Corrected 2026-10-11: since OP-09, implemented 2026-10-05, `openProjectUseCase` no longer throws `ProjectNotFoundError`. `findById` returning `null` is `not-here`, untraced.)* |
| | A missing workspace folder | The same: the file is absent. It matches SR-05, where a missing root is an empty workspace. *(Corrected 2026-10-11: the rule is Screens §04 §12's — "A missing root is an empty workspace, not an error" — and §6's "root empty or absent". SR-05 does not state it.)* |
| | A changed folder setting, so the Project no longer resolves | The same: the file is absent from the folder now configured. |
| **Can't read** | Corrupt JSON | `ProjectFileFailure` (ADR-003 SR-10), realised by `ProjectFileError` naming the file. |
| | Invalid Project content | The same. |
| | A Project id that does not match its file name (SR-04) | The same. |
| | A permission failure | The same. |
| | A newer schema version (SR-07), **temporarily** | The same. SR-07's rejection reaches the caller only as the `cause` of a `ProjectFileFailure`; there is no distinct contract for it. |
| | A workspace root that exists but is not a directory | Decided and implemented 2026-10-11 (ADR-003 SR-10, extended, which records how it was verified): `findById` fails with `ProjectFileFailure` located at the root, on every platform, so Open reports can't read. Before the implementation it depended on the platform. On Windows `findById` returned `null`, so Open reported not here. On POSIX it failed with `ProjectFileFailure` located at the Project file, not the root. `findAll` and `save` already failed at the root on both platforms, and are unchanged. `delete` is outside the decision and not decided. |

- **Not here is absence, not failure.** It is never traced.
- **Can't read** carries the failure's location (SR-10) and its own trace ID for each occurrence (ADR-003 SR-11, extended for Open).
- **A newer schema version is can't read, temporarily.** Screens §04 §4's newer-schema treatment — the row rendered normally with `Open` disabled and its reason stated — remains the target. Reaching it needs a newer schema version to be told apart from an unreadable file, which is deferred. No repository or Domain contract changes here.
- `openProjectUseCase` throws today. Under SR-10, Application maps a failure into a serializable state and Presentation never inspects an error, so the Open slice needs Open's outcomes as a serializable result, as the Create decision closure's B10 did for Create. Its exact shape is the implementing slice's. **OP-09 (below) fixes it.** *(Corrected 2026-10-11: that was so when OP-07 was decided. Since OP-09, implemented 2026-10-05, `openProjectUseCase` returns `OpenProjectResult` and no longer throws `ProjectNotFoundError`: a missing Project, where `findById` returns `null`, is `not-here`, and a `ProjectFileFailure` is `cant-read`. Only a defect is still thrown.)*

### Open validates first, then navigates (OP-08)

From the Picker, `Open` **reads the Project before it navigates**, through the same `openProjectUseCase`. Only a Project that reads cleanly is navigated to, at `/workspace/{projectId}`, and a failed Open never navigates. While the read is in flight, `Open` shows `SyButton`'s contracted `loading` state: the label persists, `aria-busy` is set and focus is kept.

| | From the Picker's `Open` | At a workspace URL |
|---|---|---|
| **Not here** | The list re-scans, and the row is gone. A screen-local assertive live region announces **Can't find that project**, once per occurrence (A16). No trace ID. | The request returns to `/`, where the Picker announces **Can't find that project** once, the same way. No trace ID. How the announcement crosses that navigation is **not decided** — see below. |
| **Can't read** | The row is replaced in place by `SyStateBlock`'s `error` state, `inline row` size: heading **Can't open the project**, the line naming the location, and a trace ID for this occurrence. `Retry` re-scans, and takes focus because the author's action caused the state. | The Workspace Entry shows `SyStateBlock`'s `error` state: heading **Can't open the project**, the line naming the location, and a trace ID for this occurrence. `Retry` re-runs the resolution. Its size, its placement and focus on arrival belong to the commissioned Workspace Entry design. |

**The not-found announcement** is a screen-local assertive live region whose text is exactly **Can't find that project**. It adds no Design System primitive and no Design System dependency. `SyToast` and `SyInlineBanner` stay registered-not-contracted (O3). `SyStateBlock`'s `error` contract requires a trace ID, and it is not changed to fit an absence that has none.

**How that announcement reaches the Picker after a navigation is explicitly unresolved.** When a workspace URL is not here, the request returns to `/`, and the Picker's live region has to learn there that it has something to announce. Nothing existing provides a way:

- The URL contract's encoding rule covers list state — *"filters, sort, columns, page"* — not a transient announcement.
- `SyToast` and `SyInlineBanner` have no contract.
- The studio app has no mechanism for it today: it reads no query parameter, sets no cookie, uses no browser storage and performs no redirect.

No query parameter, cookie, session store, browser storage, global event or other transport is chosen here. Implementing that path waits for a ruling.

**`findAll` is not tolerant, and that shapes `Retry`.** `ProjectRepository.findAll()` fails the whole list when any one Project file is unreadable (ADR-003, "Explicitly not decided here"), so the Picker never lists an unreadable file. The inline-row error can only appear when a file becomes unreadable after the scan that listed it. `Retry`'s re-scan then does one of three things:

- If the file is still unreadable, the list's own error appears, **Can't read the projects folder**, with a new trace ID.
- If the file has been repaired, the row returns.
- If the file has been removed, the row is gone.

Isolating unreadable files per row is not claimed. It needs the tolerant read that ADR-003 leaves undecided.

### The decision register (OD-1 to OD-8)

The conversation identifiers `DR-O…` and `DR-C…` are retired in favour of `OD-…`, because "DR-O2" and "DR-C1" read almost exactly like ADR-002's dependency rules DR-02 and DR-01. In this repository, `OD-` names an Open decision, `OP-` a rule in this ADR, and `DR-` stays ADR-002's.

| Canonical | Ruled as | Approved | Decision | Recorded in |
|---|---|---|---|---|
| **OD-1** | DR-C1, option A | 2026-10-01; the shape `/workspace/{projectId}` on 2026-10-03 | A ProjectId may appear in the opened workspace's URL, as a narrow exception to Screens §04 §11. | OP-01, OP-02; §04 §11 |
| **OD-2** | DR-O3, option A | 2026-10-03 | A Project with zero Languages is valid. | OP-06; §04 §2 |
| **OD-3** | DR-O1, option B | 2026-10-03 | Opening a Project leads to a temporary pre-shell Workspace Entry, not `SyAppShell`. It has no Back to Projects control or any other return control; returning is by navigating to `/`. | ADR-004 WS-05; §04 §2 |
| **OD-4** | DR-C2, option A | 2026-10-03 | A workspace URL always opens the Project it identifies, including on refresh, from history, from bookmarks, from copied URLs, and in browser-restored tabs. `/` always opens the Picker. No last-opened Project is remembered. | OP-03, OP-04; §04 §2 |
| **OD-5** | DR-C3, option A | 2026-10-03 | A copied workspace URL identifies the Project wherever the matching file exists. It grants no access, is not an authentication credential, and is not portable across installations. | OP-05; §04 §11 |
| **OD-6** | DR-C6, option A | 2026-10-03 | Failures are temporarily classified as *not here* or *can't read*. A too-new schema is temporarily *can't read*. | OP-07; ADR-003 SR-11; §04 §4 |
| **OD-7** | DR-O4, option B | 2026-10-03 | Normal Tab navigation only: Tab reaches each row's `Open` in visual order, and Enter or Space activates it. No roving focus. `↑` `↓` and `J` `K` row movement is deferred. | §04 §10 |
| **OD-8** | DR-O5, option A | 2026-10-03 | Validate the Project before navigating. Open read failures are represented inline in the Picker row, with `Retry`. | OP-08; §04 §4 |

The copy and trace behaviour approved with them are recorded in OP-07, OP-08, ADR-003 SR-11 and §04 §4: the heading **Can't open the project**; the announcement **Can't find that project** in a screen-local assertive live region; a trace ID for each can't-read occurrence; and none for not here.

## Alternatives Considered

### A session cookie holding the open Project — Rejected

Fails PR-OPEN-01 outright. A browser has one cookie jar, so opening a Project in one tab would change it in every tab.

### `sessionStorage`, restored by the browser — Rejected

It is per tab and survives a refresh, but the server never sees it. A Server Component could not render the opened Project on a refresh, so the browser would have to restore it after the first render. That changes how workspace pages are rendered, which is a larger change than OP-01 needs.

### An opaque per-tab token in the URL — Rejected

A sealed token, or one resolved through a server-side store, meets both requirements and leaves §11's wording as it is. But it adds a persistent secret or store, a codec, and key or expiry behaviour, only to keep the UUID's characters out of the URL. §11's own reason applies to a token exactly as it does to an id: a token link also works only where the file exists.

### Persistent server-side "current Project" storage — Rejected

Shared by every tab unless it is keyed per tab. Keying it per tab needs a per-tab value the server can see, and that value is the URL again.

### The workspace URL as a twelfth route in the URL contract — Rejected

It would make the enumeration reach twelve and appear to settle discrepancy #4, whose twelfth route *"must not be invented"*. It would also put a temporary pre-shell URL into the shell's own route contract.

## Consequences

**Gained:**

- PR-OPEN-01 and PR-OPEN-02 are met with no store, token, cookie, configuration, dependency, port or boundary change.
- Opening reuses what exists: `openProjectUseCase`, `toProjectId`'s check, `ProjectNotFoundError`, `ProjectFileFailure` and the `FailureTracer`.
- Architecture Blueprint §6, AD-07, ADR-002, the URL contract, the Domain Model and every Design System contract are unchanged.

**Cost:**

- The ProjectId appears in the address bar, browser history and bookmarks.
- A copied or restored URL can name a Project that is not here. That becomes a routine outcome rather than a race, and it needs the not-found path, whose announcement transport is still open.
- Opening the same Project in two tabs is now easy. What happens when both edit it is not decided.
- The shell, when it is built, inherits PR-OPEN-01 and PR-OPEN-02, so its routes may need the ProjectId too. That is not decided here.
- Until row movement arrives (OD-7), opening a Project lower in the list takes more than three keys. The Picker design's three-keys claim does not hold for opening during that boundary.

## Explicitly not decided here

- **The Workspace Entry's design.** Commissioned in [the Workspace Entry design commission](../planning/phase-2-workspace-entry-design-commission.md).
- **How the not-found announcement reaches the Picker** after a workspace URL returns to `/` (OP-08).
- **Concurrent editing** of one Project open in more than one tab.
- **Tolerant repository reads.** `findAll()` still fails the whole list on one unreadable file.
- **A distinct contract and state for a newer schema version.** It is can't read until then.
- **A missing workspace folder versus a missing Project**, and **a permission failure versus a corrupt file**. Each pair shares one category.
- **The shell's URLs**, including whether its routes carry the ProjectId.
- **The exact shape of Open's serializable result.** Decided by OP-09 (below).
- **How the Picker's validation reaches `openProjectUseCase`.** It is the implementing slice's, within Blueprint §6 and AD-07, which this ADR does not amend.
- **The repeated `Open` buttons' accessible name.** Each keeps its visible label, `Open`. No `aria-label` and no new copy is added, and whether a row's `Open` needs more is open.
- **The URL contract's route-count discrepancy (#4).**
- **Save, Duplicate, Delete, Archive and Rename.** All unchanged.
- **A root that does not exist because a parent folder is a file.** It reads as absent on Windows and fails on POSIX, for the Project list as well as for Open (ADR-003 SR-10, extended 2026-10-11).
- **What `delete` does when the workspace root exists but is not a directory.** The 2026-10-11 decision covers the two reads, `findById` and `findAll`. `delete` keeps its current behaviour (ADR-003 SR-10, extended 2026-10-11).

## Amendment — OP-09: Open's result and tracing contract

**Approved 2026-10-05 as M1**, the Open result and tracing contract identified by the Workspace Entry readiness review. Three questions were closed the same day: React's `cache` is used only as request-scoped memoization, `openProjectUseCase` is changed in place, and the third status is spelled `cant-read`. This fixes what OP-07 left to the implementing slice. **Implemented 2026-10-05** — see the last bullet.

- **Contract:** `openProjectUseCase(deps: OpenProjectUseCaseDeps, request: OpenProjectRequest): Promise<OpenProjectResult>`.
  - The existing use case changes in place. No second Open use case is introduced.
  - `OpenProjectRequest` stays `{ id: string }`, the raw route value.
  - It remains a Query: it reads and never writes. The trace is diagnostic output, as it is for the list query.
- **Result:**

  ```ts
  type OpenProjectResult =
    | { readonly status: 'opened'; readonly project: ProjectView }
    | { readonly status: 'not-here' }
    | { readonly status: 'cant-read'; readonly traceId: string; readonly location: string };
  ```

  - `opened` carries the existing `ProjectView`, so no new Response Model is added.
  - `not-here` carries no payload: no id, no trace and no location.
  - `cant-read` carries exactly the trace ID and the location. Its spelling is OP-07's category name.
  - There is no other status. A newer schema version is `cant-read` (OD-6).
- **Classification, in this order:**
  1. A value `isProjectId` rejects is `not-here`, before any repository call and without a trace. It is never passed to `toProjectId`, so it is never echoed.
  2. `findById` returning `null` is `not-here`, untraced. This covers a missing file, a missing workspace folder and a changed folder setting. A workspace root that exists but is not a directory is not among them: under ADR-003 SR-10, extended 2026-10-11, `findById` fails for it with `ProjectFileFailure` located at the root, which is step 3. Implemented 2026-10-11. Before that, Windows reached this step with `null`, and POSIX reached step 3 located at the Project file.
  3. `findById` throwing `ProjectFileFailure` is `cant-read`, traced exactly once, with that failure's `location`.
  4. Anything else is a defect and is rethrown untraced.
  5. Otherwise the result is `opened`, with `toProjectView` of the Project read.

  No Domain change is needed: `isProjectId` is already public Domain API and tests the same pattern as `toProjectId`. Open no longer throws `ProjectNotFoundError`; `load` and that error are unchanged for Save, Duplicate and Delete.
- **Tracing**, under ADR-003 SR-11's Open extension:
  - The tracer exists only in `OpenProjectUseCaseDeps = ProjectUseCaseDeps & { tracer: FailureTracer }`. `ProjectUseCaseDeps` is unchanged.
  - The Composition Root wires it as its own set, `projectOpenDeps()`: `projectUseCaseDeps()` plus a console `FailureTracer`. `resetCompositionRoot()` clears it, and it is never merged into the base set or shared with the list and Create sets.
  - The adapter mints a fresh identifier per call and writes one line to the server's diagnostic output. One use-case call that ends in `cant-read` is one occurrence with one trace ID.
- **One resolution per request**, refining OP-02:
  - Each workspace request calls `openProjectUseCase` exactly once, and the page and its metadata both derive from that single result.
  - The route slice shares it through React's `cache`, used only as request-scoped memoization. Next.js documents it as "scoped to the current request only", with no sharing between requests. It is not a persistent cache or a global store, and every request still resolves the Project, as OP-02 requires.
  - The use case itself does not memoize. Application depends on Domain only (ADR-002 DR-02), so React stays in Presentation.
- **What it does not change:** Domain, the `ProjectRepository` and `FailureTracer` ports, the Infrastructure adapters, Architecture Blueprint §6, AD-02, AD-07, ADR-002, and ADR-003 SR-11, which already covers this. It decides nothing about the workspace route or its UI, how the Picker's validation reaches `openProjectUseCase`, the not-found announcement transport (OP-08), or any other open Workspace Entry question.
- **Implemented 2026-10-05**, with the M1 slice:
  - `OpenProjectResult` is declared beside `CreateProjectResult`.
  - `openProjectUseCase` takes `OpenProjectUseCaseDeps` and returns `OpenProjectResult`, in the order above.
  - The Composition Root's `projectOpenDeps()` wires a console `FailureTracer` into Open's set alone, and `resetCompositionRoot()` clears it.
  - Nothing calls it yet. The workspace route, and the request-scoped resolver that shares one result per request, arrive with the route slice.

## Status

**Approved**, on explicit rulings from the project owner: OD-1 on 2026-10-01, and OD-2 to OD-8, the URL shape, the not-found announcement surface and the absence of a return control on 2026-10-03.

This ADR records decisions only. Open is not implemented, and nothing here authorizes its implementation. No frozen document is changed or amended. Screens §04 is amended in the Claude Design project to match, and re-exported.
