# Design Commission — Pre-Shell Project Workspace Picker

**Status:** Commission · **answered 2026-09-14 by [the Project Picker design](./phase-2-project-picker-design.md)** (proposed, not yet ingested into Claude Design)
**For:** the Claude Design project — *Design foundations review* (`d9a9cd38-f02e-4baf-8fff-4ff9f808b422`)
**Raised by:** Roadmap Phase 2, third scope bullet — "Project list / create / open screens"
**Governed by:** [ADR-004](../adr/ADR-004-project-management-is-pre-shell.md) — the surface sits **before** `SyAppShell`

---

## What this document is, and is not

This is a **request to design**, not a design.

The design does not model Project. "Project" appears **zero** times in `sayva-studio-design-inventory.json` and once in `SAYVA_STUDIO_DESIGN_HANDOFF.md`, in a sentence about the Claude Design file rather than the aggregate. There is no Projects screen, workspace recipe, or route.

The repository cannot close that gap on its own. `docs/design-system/README.md` marks the vendored sources **"Do not edit"**; the handoff states *"**It will not fill a gap.** … Filling one from convention is a design change and **must go back to design**"*; and the design's own **AC13** fails any component, colour, shadow, radius or interaction pattern with no design source.

So every section below is in one of two states:

- **FIXED** — already determined by a canonical source, cited. Design confirms it rather than deciding it.
- **UNSPECIFIED BY DESIGN** — genuinely open. Design decides. Nothing here proposes a value.

No visual design, layout, copy, icon, density value or interaction detail is proposed anywhere in this document. Where one would be needed, the gap is named instead.

**Deliverable requested:** one workspace recipe in the design's own shape, plus whatever component contracts it turns out to require. The canonical recipe field list — taken from the Vocabulary entry — is `entity · template · status · source · url · goal · layout · scope · appBar · columns · filters · savedViews · selection · bulkActions · inspector · queues · jobs · states · responsive · components · screenSpecific`.

---

## 1. Purpose

**FIXED.** The surface lets an author reach a Project — the authoring workspace, one `.sayva` file (Domain Model §32) — so that the application shell has a workspace to operate inside.

Phase 2's freeze point fixes the operations it must eventually serve: *"A Project can be created, opened, saved, duplicated, and deleted end-to-end. Correctly still an empty shell — no Language yet."*

**UNSPECIFIED BY DESIGN** — the primary entity's one-word name as the design would state it, and the recipe's `goal` sentence. The workspace recipe's own test asks *"Can you name the primary entity in one word?"* and *"Is there exactly one primary action?"* — both are Design's to answer.

## 2. Entry and exit behaviour

**FIXED.** Entry is the application's starting point when no workspace is open — under ADR-004 WS-01 this surface precedes the shell. Exit, on opening a Project, is into the shell.

**UNSPECIFIED BY DESIGN, and this one is load-bearing:**

- **Where opening a Project lands.** Every content route in the URL contract requires a `:lang` (`/l/:lang/vocabulary`, `/l/:lang/validate`, …), and Phase 2's freeze point says a Project at this stage has **no Language yet**. A newly created Project therefore has nothing to route to. The design must say what the shell shows for a Project with zero Languages, or where the author is taken instead.
- **Whether the surface can be returned to** once a Project is open, and by what affordance. `SyAppShell` has no "close workspace" control, and its scope control switches languages.
- **Whether a Project reopens automatically** on next launch, and if so how that is shown.
- Any **exit confirmation** when leaving a Project.

## 3. Create Project

**FIXED — the data contract only.** The use case takes `{ name, schemaVersion, tags? }`. Domain enforces that **Name is required and non-empty** (Domain Model §3), and that `schemaVersion <= CURRENT_PROJECT_SCHEMA_VERSION` (ADR-003 SR-07). A created Project's lifecycle state is `Created`.

The overlay selection rule is available to Design as the criteria for choosing a surface: `SyMenu` — *"Pick an action"*; `SyDrawer` — *"Do work beside context"*; `SyDialog` — the remaining case. Applying it is Design's call.

**UNSPECIFIED BY DESIGN:**

- Which surface creates a Project — `SyDialog`, `SyDrawer`, a full view, or something else.
- What the author supplies beyond a name. `tags` exists on the Domain contract and no source says whether it is author-facing here.
- Whether the author chooses a **location** for the new `.sayva` file — see §12.
- Validation presentation. `SyField`'s contract already fixes that invalid is *"border + icon + text, never colour alone"*; what the empty-name message says is copy, and copy is Design's.
- Whether creation opens the new Project immediately.

> **Note for Design, not a request to decide it here.** `Created → Active` has **no trigger in any canonical source** — Domain Model §8 defers to §3, and §3 names none. If the picker is expected to show a Project's lifecycle state, this gap has to close first.

## 4. Open Project

**FIXED — the failure modes, which the design must have states for.** Opening is by `ProjectId`. Three distinct failures already exist in the implementation and each needs a presentation:

| Failure | Where it comes from |
|---|---|
| The Project is not there | `ProjectNotFoundError` |
| The file is unreadable — not JSON, malformed, an invariant violated | `ProjectFileError`, naming the file |
| The file was written by a **newer** Studio build | ADR-003 SR-07 — rejected with both version numbers |

**UNSPECIFIED BY DESIGN:** how each is shown and what the author can do next; whether a failed open is recoverable in place or dismisses; and the copy for all three.

## 5. Project listing and discovery

**FIXED — what is available to list.** `ListProjects` returns, per Project: `id`, `name`, `schemaVersion`, `state`, `createdAt`, `updatedAt`. Nothing else exists on a Project in this phase.

**UNSPECIFIED BY DESIGN:**

- Whether discovery is a **list of what is in the workspace root**, a **recents list**, an **explicit file-open**, or a combination.
- Which fields are shown, and in what order. `columns` in the recipe.
- Sort and grouping. Note that `ProjectRepository` offers no sort, filter, paging or count — ADR-004 WS-03 does not require them, and adding them would amend a Domain port (ADR-002 DR-11).
- Whether `filters`, `savedViews`, `selection` or `bulkActions` exist at all here. In the design's seven workspaces these come from `SyCollection`; **WS-03 does not force `SyCollection` into this surface**, so each is genuinely open.
- Whether a Project shows a lifecycle badge (`Created` / `Active` / `Archived`) — see the note in §3.

> **A behaviour Design should see before deciding.** `findAll()` currently **fails loudly** if any one `.sayva` file in the root is unreadable, rather than skipping it: the port returns `readonly Project[]` with no channel for partial failure, and silently omitting a Project an author still has on disk would be indistinguishable from deletion. ADR-003 records a tolerant read as **undecided**, and notes it would change the Domain port. If the picker needs to list the good Projects and flag the bad one, that is a design requirement which re-opens that decision.

## 6. Empty, loading and error states

**FIXED — the vocabulary exists.** `SyStateBlock` is contracted and implemented with exactly six states: `first-run`, `filtered-empty`, `loading`, `error`, `no-permission`, `offline`. Its variants are `pane`, `panel`, `inline row`, and its keyboard rule is *"Its action receives focus on appearance only when the user's action caused the state."*

**UNSPECIFIED BY DESIGN:**

- **Which of the six apply here.** `R19` declares them *"written as content, not built per screen"* but scopes itself to *"All seven"* workspaces; ADR-004 WS-04 places this surface outside that set, so adoption is Design's call rather than an assumption.
- `no-permission` and `offline` have no meaning yet — v1 is single-user, offline-first, with no auth (Domain Model §4: `createdBy` is *"a reserved no-op in v1"*).
- **First-run content**, which matters most here: the very first launch has no Projects at all, and the design's own rule is that *"an empty list with no context reads as a broken screen."*
- Error content, including whether the `ProjectFileError`'s file path is shown to the author.

## 7. Duplicate and delete

**Duplicate — FIXED, data contract only.** The copy is a new entity: a new `ProjectId` and its own timestamps, never the source's (Domain Model §5 forbids reusing an id). It **requires a name**.

**UNSPECIFIED BY DESIGN:** where the duplicate action lives, whether the author names the copy or a name is proposed (a proposed name is copy, and copy is Design's), and whether the copy opens on creation.

**Delete — BLOCKED, do not design yet.** Two canonical sources contradict each other:

| Source | Rule |
|---|---|
| Domain Model §8 (Frozen v1.1) | `Project \| Created → Active ⇄ Archived → Deleted \| `**`Delete is explicit and destructive`** |
| Design **R20** Destructive actions | **"Soft delete by default.** Impact preview computed server-side from the graph and shown before confirmation. The confirm button names the action and count, never OK." |

The implementation follows the Domain Model — `delete` removes the file. The contradiction is **recorded and unresolved**; `DeleteProject`, `ArchiveProject` and R20 are all unchanged, and **archive is not assumed to be the soft delete**.

**Design is asked not to resolve this.** If the picker needs a delete affordance, the contradiction must be ruled first by the owner of Domain Model §8 together with Design.

Related and also open: **`ArchiveProject` does not exist** in Architecture Blueprint §4's use-case table or in Phase 2's scope, while Phase 2's manual checklist names archive. `Created → Active ⇄ Archived` has no trigger in any source.

## 8. Responsive behaviour

**FIXED — the ranges.** Foundations §13 defines four breakpoints: `bp.sm` `< 900px`, `bp.md` `900–1279px`, `bp.lg` `1280–1727px` (*"the design target"*), `bp.xl` `≥ 1728px`.

**UNSPECIFIED BY DESIGN — what happens in them.** Each breakpoint's canonical *meaning* is written in terms of shell panes: `bp.md` is *"Rail + one pane; sidebar and inspector become overlays"*, `bp.xl` is *"All panes visible; extra width goes to the data view"*. This surface has no panes. Further, `SyAppShell` *"owns responsive behaviour — no screen defines its own breakpoint handling"* — and this surface is not inside `SyAppShell`, so **nothing currently owns its responsive behaviour**.

`bp.sm`'s rule — *"Read and review only; editors disabled with an explanation"* — is a particularly sharp question here, since creating a Project is an editor action and this may be the only surface available at that width.

## 9. Required components

**FIXED — what is available.** All ten Phase 1 primitives are implemented, frozen and previewable: `SyButton`, `SyField`, `SyStatusBadge`, `SyEntityRef`, `SyMetric`, `SyStateBlock`, `SyMenu`, `SyDrawer`, `SyDialog`, `SyConfidence`, plus the shared overlay substrate.

**FIXED — what is excluded, per ADR-004.** `SyAppShell` (WS-02), `SyScopeBar` (WS-02 — and **O3** requires it be contracted alongside the screen that needs it, never before), `SyCollection` (WS-03).

**UNSPECIFIED BY DESIGN:** the recipe's `components` list. If the design concludes that a pattern *is* required, that is a legitimate outcome — it must be stated explicitly, and it re-imports that pattern's constraints (for `SyCollection`, decision **D4** / conflict **C1**, and rules **R16**/**R17**).

> Design-system compliance note: Definition of Done §4 requires checking whether an existing component already covers a need before building a new one. `SyCollection` is the design's list pattern, so a list built from primitives instead is a decision to be stated, not a default.

## 10. Accessibility and keyboard behaviour

**FIXED — binds regardless of where the surface sits:** a 2px accent focus ring at 2px offset on every focusable element, never removed, with focus order following visual order; no mouse-only action anywhere; accessible names on every icon-only control; 44px touch targets; usable to 200% zoom and at OS large-text settings, with no fixed-height text containers; status carried by glyph + label, never colour alone; `prefers-reduced-motion` collapsing transforms with opacity capped at 80ms and nothing looping; **A16** — live regions polite for success, assertive for errors.

`Esc dismisses topmost` is fixed by the overlay substrate that Phase 1 already implements, and applies to any overlay this surface uses. `SyDialog` traps and restores focus; `SyMenu` and `SyDrawer` do not contain Tab (decision **D14**).

**UNSPECIFIED BY DESIGN:**

- The surface's own keyboard map. **R05**'s product-wide grammar is partly shell furniture — `⌥1…7` rail, `⌘L` scope, `⌘\` sidebar, `⌘/` inspector, `F6` pane cycle — and none of it has anything to act on here.
- Whether the collection half of R05 (`J`/`K` move, `Enter` open, `/` filter, `X` select) applies, which depends on §5.
- Whether `⌘K` reaches anything. `SyPalette` is a deferred pattern and is not implemented.
- Landmark structure. The design's rule is *"Landmark regions per pane"*, and this surface has no panes.
- Whether the product-wide rule *"any action reachable by mouse in two clicks must be reachable by keyboard in three keys or fewer"* is claimed here, and what the discovery surface is given that the palette does not exist.

## 11. Route and URL behaviour

**FIXED — what exists.** The canonical URL contract enumerates eleven routes, **none** of them a Projects route. Its rule is that *"Every list state (filters, sort, columns, page) is URL-encoded"* and *"Saved views are named URLs."*

**UNSPECIFIED BY DESIGN, and a missing route must not be invented:**

- **Whether this surface has a URL at all.** It may legitimately precede routing, since every existing route presupposes an open workspace.
- If it has one: what it is, and whether it sits outside the `/l/:lang/…` family as `/data/assets` and `/admin/audit` already do.
- Whether a Project id appears in any URL, and what that means for a link shared between machines where the workspace root differs.
- Whether the URL-encoding rule applies to this surface's list state, which depends on §5.

## 12. Interaction with the workspace root

**FIXED — the mechanism.** ADR-003 **SR-05**: the workspace root is supplied to the repository when it is constructed, has **no default**, and an empty root is refused rather than resolving to the process working directory. Projects are `<ProjectId>.sayva` files (SR-04) directly in that root; only `*.sayva` files are Projects, which is what lets a sibling `Assets/` directory coexist.

**UNSPECIFIED BY DESIGN — and dependent on a decision outside Design's hands:**

- **Where the workspace root points.** ADR-003 records this as explicitly not decided; it is the Composition Root's to choose, in the slice that builds one. Until it is ruled, the picker cannot state where it is looking.
- Whether the author can **see** the root, **change** it, or work with **more than one**.
- Whether creating a Project lets the author choose a location, or always writes to the root.
- Whether opening a `.sayva` file **outside** the root is possible — which would be a file-open model rather than a scan model, and would change what "discovery" means in §5.
- What is shown when the root is missing, unreadable, or empty. The repository currently treats a non-existent root as an **empty workspace**, not an error.

---

## Summary of what Design is asked to decide

| # | Question | Blocks |
|---|---|---|
| 1 | The workspace recipe for this surface — all 21 fields | Everything |
| 2 | Where opening a Project lands, given it has no Language yet | §2 |
| 3 | The create surface and what it collects | §3 |
| 4 | Presentation of the three open-failure modes | §4 |
| 5 | Discovery model — root scan, recents, or file-open | §5, §11, §12 |
| 6 | Which `SyStateBlock` states apply, and their first-run content | §6 |
| 7 | Duplicate affordance and naming | §7 |
| 8 | Responsive behaviour at four breakpoints, with no pane model | §8 |
| 9 | The `components` list, and any pattern it requires | §9 |
| 10 | The surface's keyboard map and landmark structure | §10 |
| 11 | Whether the surface has a route, and what it is | §11 |
| 12 | Whether the author can see, change, or choose the workspace root | §12 |

## Blocked — not for Design to resolve in this commission

| | Blocker | Owner |
|---|---|---|
| Delete semantics | Domain Model §8 *"explicit and destructive"* vs **R20** *"Soft delete by default"* | Domain Model owner + Design |
| `ArchiveProject` | Absent from Blueprint §4 and Phase 2 scope; named in Phase 2's manual checklist | Architecture owner |
| `Created → Active` | No trigger in any canonical source | Domain Model owner |
| Workspace root path | ADR-003, explicitly not decided | Architecture owner |
| `SyScopeBar` | Stays uncontracted per **O3** | Design, when its own screen is designed |
| **D4** / **C1**, **D6** | Untouched by this commission | Design owner |
