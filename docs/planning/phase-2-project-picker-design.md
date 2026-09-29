# Project Picker — Design

**Status:** Canonical as `Sayva Studio Screens.dc.html` **§04**, status `specified-not-drawn` · answers [the commission](./phase-2-project-picker-design-commission.md) · amended 2026-09-24 for readiness rulings RB-2 to RB-6, 2026-09-28 for the future-`updatedAt` rule, and 2026-09-29 for the Create Project decision closure (B1–B15)
**Governed by:** [ADR-004](../adr/ADR-004-project-management-is-pre-shell.md) — the surface sits before `SyAppShell`
**Authored:** 2026-09-14, on the design owner's instruction to execute the commission

> **Authority note.** This document was approved at `8d0deb6` and authored into the Claude Design project as `Sayva Studio Screens.dc.html` §04 at `556fc99`. **§04 is the canonical source**; this file is its planning-side text and is kept in step with it. Where the two ever disagree, §04 wins and this file is wrong.

---

## Contents

- [Three contract findings that shaped this design](#three-contract-findings-that-shaped-this-design)
- [The workspace recipe](#the-workspace-recipe)
- [Decisions, sections 2–12](#decisions-sections-212)
- [New component contracts required](#new-component-contracts-required)
- [Blocked dependencies](#blocked-dependencies)

---

## Three contract findings that shaped this design

Read before the decisions — each one closed off an option that looked obvious.

**① `SyStatusBadge` cannot show a Project's lifecycle state.** Its contracted states are the *editorial* lifecycle — `Draft`, `In Review`, `Changes Requested`, `Approved`, `Published`, `Deprecated`, plus stale and blocked modifiers. A Project's states are `Created`, `Active`, `Archived`, `Deleted`. Not one overlaps. Showing a Project state would require extending a frozen contract.

**② `SyEntityRef` cannot be the row.** Its anatomy is `type glyph · ID · name · state` and its accessibility rule is *"Accessible name = type + name + ID; never a bare ID link."* All three of those parts are unavailable here: the type glyph needs an icon set (**D6**, open), the ID is a UUID that is not author-facing, and the state is finding ①.

**③ `SyDialog` cannot be the create surface.** Its purpose is *"Blocking decisions only"* and the overlay selection rule assigns it *"A decision that must not be missed."* Creating a Project is neither.

---

## The workspace recipe

All 21 contracted fields, in the design's own shape.

| Field | Value |
|---|---|
| `id` | `project-picker` |
| `name` | Project Picker |
| **`entity`** | `PROJECT` (many) |
| **`template`** | **None of L1–L7.** The seven templates are shell templates; this surface precedes the shell (ADR-004 WS-01). Recorded as `pre-shell`, a new template class of one. |
| **`status`** | `proposed` — not `canonical-drawn`. No screen has been drawn. |
| **`source`** | This document, answering `phase-2-project-picker-design-commission.md` under ADR-004. |
| **`url`** | The application root. **Adds no entry to the canonical URL contract**, and is not the missing twelfth route of recorded discrepancy #4. See §11. |
| **`goal`** | Get the author into the workspace they mean to work in, or into a new one, without asking them anything the filesystem already knows. |
| **`layout`** | One column at every breakpoint. No rail, no scope bar, no sidebar, no inspector. Header, then list, then nothing. The column does not grow without bound — see §8 for the one value this design cannot set. |
| **`scope`** | **None.** No scope bar (WS-02). Nothing here is language-scoped: the surface exists precisely because no workspace is open yet. |
| **`appBar`** | A screen-local header: the product name, the workspace-root line (§12), and the single primary action `New Project`. The header, `New Project` included, is present in every state: with the list, and in first-run, loading and error (B15). The workspace-root line reads **"Studio is looking in {root}"** — the sentence the first-run line already begins with, so the states repeat the header rather than paraphrase it (RB-4). **Not `SyEntityHeader`** — that is one of the twelve patterns D1 deferred, and this header needs none of what it provides. |
| **`columns`** | `name` · `updatedAt`. Two, deliberately. Not `id` (a UUID is not author-facing), not `schemaVersion` (an implementation detail, surfaced only when it blocks an open), not `state` (finding ①, and every Project in this phase is `Created` because `Created → Active` has no trigger). `updatedAt` is shown as compact relative time — see §5 (RB-3). |
| **`filters`** | **None.** |
| **`savedViews`** | **None.** Saved views are named URLs, and this surface has no route state to name. |
| **`selection`** | **None.** Selection exists to enable bulk action; there is none. |
| **`bulkActions`** | **None.** |
| **`inspector`** | **None.** `SyInspector` is a deferred pattern, and a Project has six fields, two of which are shown. |
| **`queues`** | **None.** Nothing here hands a cursor to anything. |
| **`jobs`** | **None.** Create, open and duplicate are each a single small file operation. The design's rule is that cardinality decides sync vs job; the cardinality here is one. |
| **`states`** | `first-run` · `loading` · `error`, plus `error` in the `inline row` variant per bad file, and in the `panel` size inside the Create drawer when a write fails (§3, B2). Three of `SyStateBlock`'s six — see §6 for why the other three are excluded rather than forgotten. Loading is named **"Studio is looking in {root}"** (RB-5). First-run's `New Project` action is deferred to the Create slice (RB-6). The error state's trace ID is **per occurrence** (RB-2) — see §6. |
| **`responsive`** | One column at all four breakpoints. At `bp.sm` the surface is read-and-open only, with `New Project` and `Duplicate` disabled and a stated reason — the canonical `bp.sm` rule. `New Project`'s stated reason reads **"Creating a project needs a window at least 900px wide."** See §8. |
| **`components`** | `SyButton` · `SyField` · `SyDrawer` · `SyStateBlock`. Four primitives, no patterns. |
| **`screenSpecific`** | The four copy strings (§6, §4) · the two-column row content · the workspace-root line in the header · the `updatedAt` presentation (§5) · the `N` shortcut for `New Project`, deferred to a later slice (§10, B8). |

---

## Decisions, sections 2–12

### §2 — Entry and exit

**Entry.** The picker is the application's entry state whenever no Project is open.

**Exit.** Opening a Project ends the picker: it hands the opened `ProjectId` to the application shell and relinquishes the surface. **The picker's responsibility ends there.**

**Where opening lands — outside this design.** A Project may have zero Languages, and in this phase always does. The shell must therefore provide an appropriate zero-Language entry state.

That is a **separate shell design concern**, belonging to whoever designs `SyAppShell` in the phase that builds it. This design does not define it, does not assume any particular form for it, and creates no shell contract. `SyAppShell` is untouched.

**Returning to the picker.** By navigating to the application root. No control is added inside the shell — `SyAppShell` has no "close workspace" affordance and this design does not give it one.

**Automatic reopen — no.** Reopening the last Project requires persisted per-user state, and no canonical source defines a store for it. (`SyAppShell`'s *"persisted per user"* covers pane sizes, inside the shell.) Instead the picker orders by `updatedAt` descending, so the most recently edited Project is first — the same benefit from data that already exists.

**Exit confirmation — none.** There is no unsaved state to lose: `SaveProject` is explicit and the `.sayva` file is written atomically (ADR-003 SR-06). If the shell later holds unsaved edits, that is the shell's concern and `SyDrawer`'s contracted `dirty (blocks close)` is the existing pattern for it.

### §3 — Create Project

**Surface: `SyDrawer`, right variant.** Finding ③ rules out `SyDialog`. The overlay selection rule assigns `SyDrawer` *"Do work beside context"*, and the context is real rather than a stretch: **Project names carry no uniqueness invariant** (Domain Model §3 requires only non-empty), so seeing the existing names while choosing a new one is what stops an author making a second "ArSL Curriculum" by accident. The drawer's contract also already supplies the semantics a name form needs — `⌘Enter` submits, `Esc` closes.

> **Amended 2026-09-29 (Create decision closure, B5).** This paragraph first read "`dirty (blocks close)` protects a half-typed name". **The Create drawer is never dirty.** A dirty drawer must prompt before discard, the prompt would be a `SyDialog`, and this surface does not use `SyDialog` (the next paragraph, and §9). So `Esc` and `Cancel` close the drawer directly. The protection given up is small: `SyField`'s own `Esc` reverts an in-progress edit before the drawer sees the key, so a prompt would only have guarded a name while focus sat outside the field.

The hard rule — *"Never a modal for work that takes more than one decision"* — is satisfied either way: this is one decision. `SyDialog` stays reserved for the blocking decisions its contract names, which on this surface means delete alone, and delete is blocked.

`SyDrawer`'s `resizing` state remains **declared but inert**, exactly as D16's interim ruling already has it. This design adds no resize affordance and no new D16 exposure.

**What the author supplies: `name`, and nothing else.**

- `tags` exists on the Domain contract and is **not** author-facing here. No canonical source gives a Project tag a meaning, and exposing the field would be inventing a taxonomy.
- `schemaVersion` is supplied by the build, never by the author.
- **No location choice.** The Project is created in the workspace root (ADR-003 SR-04/SR-05). Choosing a location implies a multi-root or file-dialog model that SR-04/SR-05 do not describe — see §12.

**Field.** `SyField`, `text` variant, visible label always. Invalid renders border + icon + text, never colour alone, tied by `aria-describedby`.

**Copy.** Field label `Project name`. Invalid message: **"Give the project a name."** Confirm button: **`Create Project`** — a verb, per `SyButton`'s *"the label is the verb, never a generic confirmation"*.

**Title (B3).** The drawer's title is **`New Project`** — the label of the action that opens it, so no copy is added.

**Footer actions (B4, B13).** `Create Project` and **`Cancel`**. `Create Project` is the drawer's one primary action — P2 counts per surface, and the drawer is its own. `Cancel` is the visible control for `Esc`, which §10's *"every shortcut still has a visible control"* requires: a secondary `SyButton`, the label and tone `SyDialog`'s own dismiss uses.

**When the invalid message shows (B13).** When a submission — `Create Project` or `⌘Enter` — is refused for its name. It stays until the next submission's result replaces it. Nothing is validated while typing.

**A failed write (B2).** The drawer stays open and the typed name stays in its field. `SyStateBlock`'s `error` state renders in the drawer body, `panel` size, below the name field:

- Heading **"Can't create the project"**.
- The line names the location (ADR-003 SR-10).
- `Retry` re-runs Create with the name currently in the field.

Each failed write is its own occurrence with its own trace ID, recorded the same way as the list's (§6, ADR-003 SR-11). `Retry` takes focus, because the author's action caused the state. A write failure is never shown on the field: `SyField`'s invalid state belongs to the name alone.

**Creation opens the new Project immediately.** The recipe's own test asks whether there is exactly one primary action; the author's intent in creating is to start working. Requiring a second click to open would make one intent into two actions. Opening follows the same hand-off as §2, and what the author then sees is the shell's concern.

> **Temporary slice boundary (B1).** Until the Open slice, a successful create closes the drawer and the picker re-scans, so the new Project appears in the list by the `updatedAt` descending rule (§5). Opening it arrives with the Open slice, and nothing hands it off before then. Focus then returns to the control that opened the drawer while that control still exists (A07). When it does not — a create begun from first-run, which the list replaces — no other focus target is introduced until the Open slice (B14).

> **Not decided here — `Created → Active` has no trigger in any canonical source.** Domain Model §8 defers to §3 and §3 names none. This design shows no lifecycle state (recipe `columns`, finding ①), so it neither depends on that gap nor closes it.

### §4 — Open Project

Opening is by `ProjectId`, from the row. Three failure modes exist and each gets a distinct treatment, because they are distinct problems for the author.

| Failure | Treatment |
|---|---|
| **Newer schema version** (ADR-003 SR-07) | The row renders normally, with `Open` **disabled and a stated reason** — `SyButton`'s contract requires exactly that pairing. The Project is valid; this build simply cannot read it. Copy: **"Made by a newer version of Studio — this build reads schema 1, the file is schema 2."** Both versions named, as SR-07's error already does. |
| **Unreadable file** (`ProjectFileError`) | The row is replaced in place by `SyStateBlock`, `error` state, `inline row` variant, naming the file. Next action: `Retry`, which re-scans. The file path **is** shown: the author has to fix it outside Studio, and `ProjectFileError` already carries it. |
| **Not found** (`ProjectNotFoundError`) | Only reachable if the file vanished between the scan and the open. The list re-scans; the row is simply gone. The failure is announced in an **assertive** live region (A16 — assertive for errors). |

**Recovery is in place.** The picker is the top-level surface; there is nowhere to dismiss to.

### §5 — Listing and discovery

**Discovery model: root scan.** The only model the canonical persistence supports — ADR-003 SR-05 already scans an injected workspace root, and SR-04 makes a Project `<ProjectId>.sayva` inside it. A recents list would need a preferences store no source defines; a file-open model would contradict SR-04/SR-05.

**Row content:** `name`, then `updatedAt`. **Sort:** `updatedAt` descending, most recently edited first, client-side — no port change.

**`updatedAt` presentation (RB-3).** Compact relative time — the way the drawn Vocabulary grid shows its own `Updated` column, whose sample rows read `2h ago`, `1d ago` through `6d ago`, `1w ago` and `2w ago`. Minutes below an hour, hours below a day, days below a week, weeks from a week onward, each floored: `12m ago`, `5h ago`, `3d ago`, `2w ago`. The machine value stays in a `<time>` element's `datetime` attribute. The label is computed when the page renders and does not tick.

Two parts extend the drawn precedent, which shows only `h`, `d` and `w`, and are stated so they are not mistaken for it. The **minute** unit, so an edit made moments ago does not read `0h ago`. And **weeks with no larger unit above them**, so no month, year or absolute-date format is introduced — a Project last edited a year ago reads `52w ago`.

**A future `updatedAt`** (decision closure, 2026-09-28). An `updatedAt` later than the moment the page renders counts as zero elapsed time, so it reads `0m ago`.

**Row actions:** `Open` (secondary `SyButton`) and `Duplicate` (ghost `SyButton`). **No contextual menu, and no icons anywhere in this surface.** `SyMenu`'s trigger would be an icon-only button, which needs an icon set — **D6, open**. Two text-labelled verbs avoid that entirely, and R14's eight-group menu does not bind here (ADR-004 WS-04). `SyMenu`'s contract also draws its contents *"from the entity action registry, not per-screen code"*, and no such registry exists in Phase 2.

> If a third row action is ever needed, `SyMenu` becomes the right answer and **D6 must be ruled first**. Recorded so the next person does not rediscover it.

**No `filters`, `savedViews`, `selection` or `bulkActions`.** All four arrive with `SyCollection` in the seven workspaces; WS-03 does not force it here, selection exists only to enable bulk action, and bulk action would need R01's predicate model and a port that supports it. Revisit if real usage shows workspace roots large enough to need finding rather than scanning — deliberately without a threshold number, since the design flags its own guessed thresholds (O7, O8) as decisions owed to evidence.

**One unreadable file must not hide every other Project. This is a design requirement, and it is blocked.**

`findAll()` currently fails the whole call rather than skipping a bad file — correctly, since silently omitting a Project an author still has on disk is indistinguishable from deletion. But a picker where one corrupt file makes every Project unreachable is a worse failure than either. Showing the good rows *and* flagging the bad one needs per-file outcomes from the port, which ADR-003 records as undecided and notes would change a Domain port (ADR-002 DR-11).

- **Target behaviour:** good Projects list normally; each unreadable file appears as the `inline row` error of §4.
- **Interim behaviour, implementable today with no port change:** if `findAll()` throws, the whole list renders the `error` state naming the file from `ProjectFileError.path`, with `Retry`.

The interim degrades into the target when the port decision lands. **This design does not make that decision.**

### §6 — Empty, loading and error states

`SyStateBlock` is adopted as the vocabulary — heading (a real heading), explanatory line, one named next action. **R19 is followed, not claimed**: WS-04 places this surface outside R19's *"All seven"* scope, so the three states below are chosen rather than inherited.

| State | Applies | |
|---|---|---|
| `first-run` | **Yes** | The root is empty, or does not exist yet (the repository already treats a missing root as an empty workspace). Heading **"No projects yet"**; line **"Studio is looking in {root}. A project is one `.sayva` file."**; action `New Project`. The location is in the line because *"an empty list with no context reads as a broken screen."* |
| `loading` | **Yes** | While the scan is in flight. Skeleton, not spinner, per the contract. `SyCollection`'s remembered-row-count rule does not apply — there is no `SyCollection`. |
| `error` | **Yes** | The root cannot be read. Heading **"Can't read the projects folder"**; line names the path; action `Retry`. Also the `inline row` variant of §4. Errors are assertive live regions. |
| `filtered-empty` | **No** | There are no filters. |
| `no-permission` | **No** | v1 has no authentication — Domain Model §4 makes `createdBy` *"a reserved no-op in v1"*. |
| `offline` | **No** | Storage is the local filesystem (ADR-003 SR-01). There is no network to be offline from. |

The three exclusions are recorded rather than omitted, so a later reviewer can see they were considered.

**Loading's accessible name (RB-5)** is **"Studio is looking in {root}"** — the same sentence, because that is what the state is. It stays a skeleton, not a spinner; nothing visual is added.

**Temporary slice boundary (RB-6).** First-run renders its heading and line now; its `New Project` action arrives with the Create slice. The same holds for `New Project` in the header, since it is the same action. Until then neither location renders it, and nothing stands in its place — no substitute action and no disabled button — and first-run is never replaced by a bare empty list.

**Trace ID (RB-2).** `SyStateBlock`'s `error` state requires a trace ID (AC14), rendered after the component's visible **Trace ID** label. Each failure to read the list gets its own trace ID when it happens — an identifier for that one occurrence, never reused and never a category. The same value is written with the failure's details to the server's own diagnostic output, so the Trace ID on screen leads to the record of what went wrong. It is not the file path, not the framework's error digest, and not stored anywhere: it exists only in the page state and that one diagnostic line.

A stable diagnostic code was considered and rejected: under the component's visible **Trace ID** label it would name a kind of failure as if it were one occurrence of it.

### §7 — Duplicate and delete

**Duplicate — designed.** The action sits on the row (§5). It opens the same `SyDrawer` as create, with an **empty, required** name field.

Not prefilled with the source's name: names are not unique, so prefilling would quietly produce two identically-named Projects. Not auto-named either — a convention like `X (copy)` is copy plus a naming rule, and both would be inventions. Confirm label: **`Duplicate Project`**.

**The copy does not open.** Duplicating is an action performed *about* a Project, not an intent to start working in it — the opposite of create, and the distinction is deliberate. The list refreshes with the copy present and ordered first, since it has the newest `updatedAt`.

**Delete — not designed. Blocked, exactly as the commission requires.**

| Domain Model §8 (Frozen v1.1) | Design **R20** |
|---|---|
| *"Delete is explicit and destructive"* | *"**Soft delete by default.** Impact preview computed server-side from the graph and shown before confirmation."* |

No delete affordance appears anywhere in this design. `DeleteProject`, `ArchiveProject` and R20 are untouched, and **archive is not assumed to be the soft delete**. When the contradiction is ruled, delete arrives as the `Destructive` group of a row menu — which is the point at which **D6** must also be ruled (§5).

**`SaveProject` is not covered by this design, and the wording behind it is ambiguous.** Phase 2's freeze point lists "saved" among the operations a Project must support, and `SaveProject` exists as a use case. What "saved" entails on this surface — or whether it belongs on this surface at all — is stated by no canonical source, and the commission has no section for it.

**Recorded as ambiguous and deliberately left unresolved.** This design places no save affordance on the picker and rules nothing about where one belongs. In particular it does **not** read "saved" as rename: no canonical source establishes Rename as a Project operation, and resolving the ambiguity that way would be inventing a requirement the commission never raised.

### §8 — Responsive

One column at all four breakpoints. The canonical breakpoint *meanings* are written in shell-pane terms (`bp.md` = *"Rail + one pane; sidebar and inspector become overlays"*), and this surface has no panes, so only the ranges carry over.

| | |
|---|---|
| `bp.sm` `< 900px` | **Read and open only.** `New Project` and `Duplicate` are disabled with a stated reason, per `SyButton`'s contract. This follows the canonical `bp.sm` rule — *"Read and review only; editors disabled with an explanation"* — rather than carving out an exception because this happens to be the surface where creating lives. `New Project`'s reason reads **"Creating a project needs a window at least 900px wide."** (B6). The header's `New Project` stays visible and disabled. First-run renders **no** action, and nothing stands in for it: `SyStateBlock`'s action has no disabled form, and its frozen contract is not widened to add one. |
| `bp.md` `900–1279px` | Full behaviour. Right drawer. |
| `bp.lg` `1280–1727px` | Full behaviour. The design target. |
| `bp.xl` `≥ 1728px` | Full behaviour. One column still — the surface does not become multi-column at any width. |

`SyDrawer`'s `bottom sheet (narrow widths)` variant is **unused**: the widths narrow enough to want it are the widths where creating is disabled.

> **Content-column maximum width — NOT APPLICABLE.** Both candidate rules are scoped to the shell and neither reaches this surface. §15.10's *"1200px comfortable maximum"* governs **the shell's content column, and prose within it**; `bp.xl`'s *"extra width goes to the data view"* governs **shell panes**, and a picker is not a data view. No canonical maximum-width rule applies to a pre-shell surface, so none is needed and none is missing.
>
> This is therefore **not a blocker and not UNSPECIFIED BY DESIGN**. No max-width token or value is invented here, and none is requested: the column sizes from the existing spacing and sizing tokens like every other element on the surface.

### §9 — Components

**`SyButton` · `SyField` · `SyDrawer` · `SyStateBlock`.** Four primitives, no patterns, no icons.

Evaluated and **not** used, each for a stated reason:

| | Why not |
|---|---|
| `SyCollection` | WS-03. A two-column list of a handful of rows needs none of a grid, filter bar, saved views, bulk bar or pagination — and taking it would import **D4**/**C1** and **R16**/**R17**. |
| `SyEntityRef` | Finding ②. |
| `SyStatusBadge` | Finding ①. |
| `SyDialog` | Finding ③. Reserved for delete, which is blocked. |
| `SyMenu` | §5 — its trigger needs **D6**, and its contents need an entity action registry that does not exist. |
| `SyEntityHeader`, `SyInspector`, `SyAppShell`, `SyScopeBar` | Deferred patterns; WS-02. |
| `SyMetric`, `SyConfidence` | Nothing here measures or scores anything. |

> **Definition of Done §4 note, stated rather than assumed.** `SyCollection` is the design system's list pattern, so building a list from primitives instead is a decision, not a default. It is recorded here as one, with the reason above.

### §10 — Accessibility and keyboard

**Binds regardless of where the surface sits**, and is claimed here in full: the 2px accent focus ring at 2px offset, never removed, focus order following visual order; no mouse-only action; 44px touch targets; usable to 200% zoom and at OS large-text settings; status never carried by colour alone; `prefers-reduced-motion` collapsing transforms; A16's live-region policy — **assertive for errors** (§4, §6), polite otherwise.

**Landmarks.** *"Landmark regions per pane"* has nothing to bind to. The picker is a single `main` landmark with an accessible name. The list is a `list` / `listitem` structure — **not `role=grid`**, which belongs to `SyCollection`.

**Keyboard map.**

| | |
|---|---|
| `↑` `↓` | Move between rows |
| `J` `K` | Move between rows — R05's product-wide vocabulary, adopted so the picker teaches the same grammar the shell uses |
| `Enter` | Open the focused Project |
| `N` | New Project — following the drawn Vocabulary screen's `New sign N`. **Temporary slice boundary (B8):** arrives in a later slice, with its behaviour in editable fields and its hint treatment |
| `Esc` | Dismiss the topmost overlay, via the Phase 1 overlay substrate |
| `⌘Enter` | Submit the create/duplicate drawer, per `SyDrawer`'s contract |

**Not adopted, with reasons:** `⌥1…7` rail, `⌘L` scope, `⌘\` sidebar, `⌘/` inspector, `F6` pane cycle — all shell furniture with nothing here to act on. `X` select and `/` filter — no selection, no filter. `⌘Enter` as "side peek" — no side peek exists; the drawer's submit meaning is the contracted one on this surface.

**`⌘K` reaches nothing**, because `SyPalette` is a deferred pattern. The rule *"No shortcut is the only path to an action"* still holds: every shortcut above has a visible control. The rule *"any action reachable by mouse in two clicks must be reachable by keyboard in three keys or fewer"* is **claimed** — open is `↓`+`Enter`, create is `N` once `N` arrives (B8). Until then, create is reached through its visible controls.

**Why `N` is deferred (B8).** No canonical source settles two things. One is its hint: the drawn `New sign N` sets the hint in a monospace face with no token, and **D13** (no monospace family token) stays open and is not resolved here; `SyButton` also has no hint slot. The other is what the key does while an editable field has focus. Rather than invent either, `N` waits for a later slice.

### §11 — Route

**The picker has no route, and none is added to the URL contract.**

It occupies the application root, which is where an application with no workspace open necessarily starts. Every one of the canonical contract's eleven routes presupposes an open workspace; adding a twelfth is forbidden, and **this surface is explicitly not the missing twelfth route of recorded discrepancy #4**.

**No Project id appears in any URL.** A Project id only resolves on a machine whose workspace root holds that file, and ADR-003 SR-05 makes the root machine-local — so a Project URL would be a link that works for exactly one person. The URL-encoding rule for list state has nothing to encode: there are no filters, no saved views, and one fixed sort.

### §12 — Workspace root

**The author sees the root and cannot change it.**

**Sees it:** the header names the location being listed, and the `first-run` and `error` states repeat it in their explanatory lines. An author looking at an empty picker must be able to tell *where* Studio looked — otherwise the empty state is exactly the "broken screen" the design's own rule warns about. Rendered as plain text, **not** `SyField`'s `mono` variant: mono is the design's treatment for *"IDs, glosses, versions, timecodes and diffs"*, a filesystem path is none of those, and **D13** means no monospace family token exists to apply anyway.

**Cannot change it:** a root switcher implies multiple roots and a preferences store, and **where the root points is not decided** (ADR-003, still open).

**Cannot open a `.sayva` outside it:** that is a file-open model, and SR-04/SR-05 describe a scan model.

**Root conditions**, all three already matching the repository's behaviour:

| Root | |
|---|---|
| Missing | Treated as an empty workspace → `first-run`. Not an error. |
| Empty | `first-run`. |
| Unreadable | `error`, naming the path, with `Retry`. |

---

## New component contracts required

**None.**

The surface composes from four already-contracted primitives. The Project row — name, `updatedAt`, two buttons — is **screen-local composition**, which the design already has a category for: handoff §12 lists, per screen, what must stay local rather than being promoted into the system. A row used by one surface, with no second consumer, is exactly that.

If the Project row ever gains a second consumer, promoting it becomes a real question. It has one consumer today.

**`SyScopeBar` remains uncontracted**, per **O3** — *"Contracting a component before its workspace is designed produces a guess"* — and this design requires it nowhere.

---

## Blocked dependencies

Carried forward unresolved. None is decided by this design.

| | Blocker | Blocks here | Owner |
|---|---|---|---|
| 1 | **Tolerant list read.** One unreadable file currently fails the whole list; the picker needs per-file outcomes. Changes a Domain port. | §5's target behaviour. The interim behaviour ships without it. | Architecture |
| 2 | **Delete semantics** — Domain Model §8 vs R20. | All of delete. No affordance designed. | Domain Model owner + Design |
| 3 | **`ArchiveProject`** — absent from Blueprint §4 and Phase 2 scope; named in Phase 2's manual checklist. | Any archive affordance. | Architecture |
| 4 | **`Created → Active`** — no trigger in any source. | Any lifecycle display. Avoided by showing no state column. | Domain Model owner |
| 5 | **Workspace root path** — the mechanism is ruled (ADR-003 SR-09: `SAYVA_WORKSPACE_ROOT`, read only in the Composition Root); the directory it points at stays a deployment decision. | Nothing now — §12's displayed location comes from SR-09. | Deployment |
| 6 | **D6, the icon set.** | Nothing today — the design uses no icons. Blocks `SyMenu` if a third row action is ever needed. | Design owner |
| 7 | **`SaveProject` — "saved" is ambiguous.** No source says what a save does on this surface, or whether it belongs here. Recorded, **not** resolved, and specifically not resolved as Rename. | Nothing here — no save affordance is placed. | Design owner |

**Withdrawn from this table since the first draft:** the `bp.xl` content-column maximum width, which is **not applicable** to a pre-shell surface rather than missing from it (§8). And item 7 above is a restatement: the first draft resolved the "saved" ambiguity as Rename, which no canonical source supports; it is now recorded as ambiguous and left open. And the error state's trace ID, added as item 8 by readiness ruling RB-2 and resolved by it on 2026-09-24 — see §6.

The zero-Language entry state was never a dependency of this design and is not one now — it is a **separate shell design concern** (§2).

**Untouched throughout:** the vendored design sources, every `design-system` contract, **D4**, **D6** and all other open decisions, `DeleteProject`, `ArchiveProject`, the `Created → Active` transition, the workspace root implementation, `SyScopeBar`, `SyCollection`, and all application, domain and infrastructure code.
