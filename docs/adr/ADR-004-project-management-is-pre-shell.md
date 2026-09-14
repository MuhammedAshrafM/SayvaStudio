# ADR-004 — Project Management Sits Before the Application Shell

**Status:** Approved
**Scope:** Where the Project management surface lives relative to `SyAppShell`, and which design rules therefore bind it.
Not the design of that surface — that is commissioned separately in [the Project picker design commission](../planning/phase-2-project-picker-design-commission.md). Not the delete-semantics contradiction, not D4, not D6, not the workspace root path.

## Contents

- [Context](#context)
- [Decision](#decision)
  - [Project management sits before the shell (WS-01)](#project-management-sits-before-the-shell-ws-01)
  - [The Project surface requires neither SyAppShell nor SyScopeBar (WS-02)](#the-project-surface-requires-neither-syappshell-nor-syscopebar-ws-02)
  - [SyCollection is not forced into the Project picker (WS-03)](#sycollection-is-not-forced-into-the-project-picker-ws-03)
  - [Which design rules bind, and which do not (WS-04)](#which-design-rules-bind-and-which-do-not-ws-04)
- [Alternatives Considered](#alternatives-considered)
- [Consequences](#consequences)
- [Explicitly not decided here](#explicitly-not-decided-here)
- [Status](#status)

---

## Context

Roadmap Phase 2's third scope bullet is "Project list / create / open screens". It could not be started, and the reason turned out to be more fundamental than a missing drawing.

**The design does not model Project at all.** A full-text search returns **zero** occurrences of "Project" in `sayva-studio-design-inventory.json`, and exactly one in `SAYVA_STUDIO_DESIGN_HANDOFF.md` — a sentence about the Claude Design *project* file, not the aggregate. There is no Projects screen among the design's sixteen, no Projects workspace among its eight recipes, and no Projects route in its URL contract.

The URL contract is what makes the shape of the gap legible. All eleven canonical routes presuppose that a workspace is already open:

```
/l/:lang/vocabulary   /l/:lang/signs/:id/:tab   /l/:lang/lessons/:id/edit   /l/:lang/validate
/data/assets   /models/:model/versions/:v   /publish/releases/:v   /health?scope=:lang
/jobs?state=running&actor=@me   /jobs/:id   /admin/audit
```

Every content route is scoped to a Language. The shell's own scope control is a **language** switcher (`⌘L`), and Foundations §04 records that the navigation frame explicitly **rejected** *"Language is the workspace."*

So the design assumes a workspace above Language and never names it. The Domain Model does name it: §32 defines a Project as *"One authoring workspace — a `.sayva` file."* ADR-003 SR-03 and SR-05 already persist exactly that — one file per Project, discovered by scanning a workspace root.

The question this ADR answers: is Project management a screen **inside** the shell, or a surface that comes **before** it?

It is not a stylistic question. It decides which body of canonical design rules binds the Project surface, and therefore which open decisions block it.

## Decision

### Project management sits before the shell (WS-01)

**Project selection, creation and opening are a pre-shell workspace picker, not a normal `SyAppShell` screen.**

Ruled by the project owner, 2026-09-14, on this reasoning:

> - Project is the authoring workspace / `.sayva` file.
> - Existing application routes assume a workspace is already open.
> - The design does not model Project as one of the shell's domains.
> - The design explicitly rejected "Language is the workspace."

The shell is what an author works *inside* once a Project is open. Choosing which Project to open is the step before that, the way opening a document precedes editing it.

### The Project surface requires neither `SyAppShell` nor `SyScopeBar` (WS-02)

Neither is a dependency of the Project surface.

`SyAppShell`'s anatomy is `rail 60 · scope bar · sidebar 208–360 · content · inspector 280–420`, and its rail's seven domains — Content, Data, Models, Validate, Publish, Health, Admin — are all places *within* an open workspace. A picker that chooses the workspace has nothing to put in them.

`SyScopeBar` stays **uncontracted**, which is the design's own instruction rather than a convenience. Open decision **O3** reads: *"Contracting a component before its workspace is designed produces a guess,"* with timing *"Each one before the screen that needs it."* `SyScopeBar`'s register entry repeats it: *"Contract alongside the screen that needs it, never before."* Under WS-01 the Project picker is not that screen.

### `SyCollection` is not forced into the Project picker (WS-03)

`SyCollection` is the design's list pattern for the seven workspaces. It is **not** required here, and is not to be pulled in by analogy because a picker happens to show a list.

This is what removes three blockers at once, and the removals are consequences rather than the motive:

- **D4** (`row.compact`, 28px vs 26px — the design's conflict C1) blocks `SyCollection`'s density modes by name. Not consumed here.
- `SyCollection`'s contract requires *"server-side sort, filter and count"* (**R16**, **R17**) and `aria-rowcount` over the full match count. `ProjectRepository` has none of those, and adding them would change a Domain port (ADR-002 DR-11). Not required here.
- **D6** (the icon set) blocks the rail's glyphs. No rail here.

If the commissioned design *does* call for `SyCollection`, that is a design decision to be recorded then, and it re-imports those constraints with it. Nothing here pre-empts that.

### Which design rules bind, and which do not (WS-04)

Several canonical rules declare their own scope as *"All seven"* — the seven workspaces — or name the shell in their definition. WS-01 places the Project picker outside that set, so their application has to be stated rather than assumed.

**Bind regardless**, because they are product-wide accessibility and quality rules, not screen rules: the 2px accent focus ring at 2px offset, never removed; 44px touch targets; usable to 200% zoom; colour is never the only signal (P5); **A16**'s live-region policy; and the design's **AC13** — any component, colour, shadow, radius or interaction pattern with no design source fails.

**Do not bind automatically**, and must be settled by the commissioned design: **R01** (selection as a predicate), **R14** (the eight-group contextual menu), **R16** (virtualisation), **R17** (server-side aggregation), **R19** (the six absence states, scoped *"All seven"*), **R20** (destructive actions). The parts of **R05**'s keyboard grammar that address shell furniture — `⌥1…7` rail, `⌘L` scope, `⌘\` sidebar, `⌘/` inspector, `F6` pane cycle — have nothing to act on here.

Not binding is not the same as not applying. Each is a question for the commission, not an omission.

## Alternatives Considered

### Project management as an `SyAppShell` screen — Rejected

The reading that Roadmap Phase 2's word "screens" implies the shell, supported by `SyAppShell`'s own reuse note, *"Every screen."*

Rejected because it requires the design to be extended in four places before anything can be built — an eighth rail domain or a non-`/l/` route, a `SyScopeBar` contract written against O3's explicit advice, a ruling on **D4**, and a Domain port amendment for server-side counts — and because it contradicts the frame the design already chose. The shell's scope control switches languages within a workspace; asking it to also switch workspaces re-opens the "Language is the workspace" question Foundations §04 settled by rejection.

### A Projects rail domain inside the existing shell — Rejected

Adding Projects as an eighth rail domain alongside Content · Data · Models · Validate · Publish · Health · Admin.

Rejected: the rail is explicitly seven domains bound to `⌥1…7`, and every one of them operates on content *inside* a workspace. A domain that replaces the workspace the other seven are reading would be a different kind of thing wearing the same affordance.

## Consequences

**Gained:**

- The Project surface can be designed and built without `SyAppShell`, `SyScopeBar` or `SyCollection`, and therefore without ruling D4 or D6 or amending a Domain port.
- `SyScopeBar` stays uncontracted, which is what O3 asks for.
- The frozen design sources need no edit to accommodate Project — a concept they never modelled stays outside the frame they did model.
- The ten Phase 1 primitives are available to the picker; whether they suffice is the commission's question.

**Cost:**

- The Project surface has no canonical design at all, so one must be commissioned before implementation. That is the point of the ruling rather than a side effect: it replaces four rulings and a port amendment with one design.
- Responsive behaviour has no owner here. `SyAppShell` *"owns responsive behaviour — no screen defines its own breakpoint handling"*, and the four breakpoint tokens define their meaning in terms of shell panes (`bp.md` = *"Rail + one pane; sidebar and inspector become overlays"*). The ranges are canonical; what happens in them outside the shell is not.
- Where opening a Project lands is now an explicit question. Every content route needs a `:lang`, and Phase 2's freeze point says a Project here is *"correctly still an empty shell — no Language yet"* — so a newly created Project has no language to route to.

## Explicitly not decided here

- **The picker's design.** Commissioned separately; this ADR fixes only where it sits.
- **Delete semantics.** Domain Model §8 says *"Delete is explicit and destructive"*; design **R20** says *"Soft delete by default."* Both canonical, recorded as contradicted, unresolved. `DeleteProject`, `ArchiveProject` and R20 are all unchanged, and **archive is not assumed to be the soft delete**.
- **`ArchiveProject`**, which appears in neither Architecture Blueprint §4 nor Phase 2's scope while Phase 2's manual checklist names archive.
- **D4**, **D6**, and every other open design decision.
- **The workspace root path** — ADR-003 SR-05 fixes only that it is injected.
- **Whether the picker has a route at all**, and what it is. The URL contract has no Projects route and one must not be invented.

## Status

**Approved**, on explicit ruling from the project owner, 2026-09-14.

No frozen document is changed or amended. This ADR records where a surface sits that the design never modelled; it adds nothing to the design's own frame and removes nothing from it.
