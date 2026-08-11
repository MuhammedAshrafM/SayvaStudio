# SAYVA STUDIO — DESIGN HANDOFF

**Status:** canonical · extraction-first
**Extracted:** 2026-08-09
**Source documents (authoritative, in this order):**

| # | Document | Version | Role |
|---|---|---|---|
| 1 | `Sayva Studio Foundations.dc.html` | v0.2 | Philosophy, IA, domain model, lifecycle, tokens, register, layout, accessibility |
| 2 | `Sayva Studio Design System.dc.html` | v0.2 | Component contracts (canonical naming authority), workspace recipe, screen briefs |
| 3 | `Sayva Studio Screens.dc.html` | canonical | Vocabulary + Sign Editor at full fidelity, design review |
| 4 | `Sayva Studio Scale Review.dc.html` | canonical | Amendments A1–A3, cardinality, optimistic boundary |
| 5 | `Sayva Studio Handoff Audit.dc.html` | v1.1 | Inventory, Phase 1 boundary, acceptance criteria |

**Conflict rule:** where documents disagree, the **Design System** wins on component naming; **Foundations** wins on tokens and IA; **Scale Review** wins on interaction at scale. Two live conflicts are recorded in §16 and are **not** resolved here.

**Extraction rule applied throughout:** every value below is copied from a source document. Nothing is inferred, normalised, or completed from general UI convention. Where the design has not decided, the entry reads **UNSPECIFIED BY DESIGN**.

---

## 1. CANVAS / INSPECTOR RULE

> **"Canvas authors, inspector reports."**

*Source: Scale Review Q3, amendment A1. Applied to canonical screens.*

| Plane | Owns | Test |
|---|---|---|
| **Canvas** | Values a human is responsible for writing. Gloss, description, phonology, media attachment, variants, lesson ordering. | *"If a reviewer could ask 'who wrote this and why', it belongs in the canvas."* |
| **Inspector** | Facts derived from the entity's place in the graph. State, validation, usage, history, model diagnostics. | *"If it is computed rather than typed, it belongs in the inspector."* |

**Binding constraints:**

- Information must **not** be duplicated between canvas and inspector.
- The rule was applied by **deleting** the Sign Editor's right-hand column (which held *Used by*, *Variants*, *Model view*). The canvas is now single-column and gained 300px.
- Reclassifications made under A1:
  - *Used by* → folded into Inspector **Usage** section (was pure duplication).
  - *Variants* → relies on its existing **Variants tab**; the tab keeps its count badge so the number stays visible from the Definition tab.
  - *Model view* → became an Inspector **type-specific section**, available on any entity a model has an opinion about (signs, assets, datasets), not a Sign-Editor special case.
- The Inspector is **never the only path to a value**. Anything editable there is also editable in the main canvas, because a collapsed pane must not hide functionality.

---

## 2. INSPECTOR STRUCTURE

*Source: Design System §Structure → SyInspector; Screens §02.*

**Four universal sections, fixed order, always first:**

1. **State**
2. **Validation**
3. **Usage**
4. **History** ← *History is the fourth universal section.*

**Type-specific sections are appended after the four universal sections and are never interleaved with them.**

> Verbatim from the SyInspector contract: *"Four universal sections come first, always in this order: State, Validation, Usage, History. Type-specific sections are appended after them, never interleaved — so the fourth section is History on every entity in the product, and a reviewer moving between a sign, an asset and a release finds the same information in the same place."*

**Type-specific sections currently defined:**

| Section | Appears on | Source |
|---|---|---|
| **Model view** | Any entity a model scores (signs, assets, datasets) | A1; drawn on Sign Editor as *"Model view — recognition-arsl 2.4.0"* |
| **Capture** | Assets | SyInspector contract, "REUSED IN" |
| **Compatibility** | Model versions | SyInspector contract, "REUSED IN" |

> **Note on the brief's wording.** The handoff request lists type-specific sections as *Usage, Variants, Model*. In the design, **Usage is a universal section (3rd)**, not type-specific; **Variants** is a canvas tab, not an inspector section (A1 explicitly moved it there); and the third is named **Model view**. The design's structure is preserved above as-is.

**Drawn Inspector content (Sign Editor, canonical):**

| Section | Rows |
|---|---|
| State | Lifecycle · Reviewer · Revision · Published as |
| Validation — 1 blocking, 2 advisory | `BLOCK` media.missing · `AI` sign.duplicate 0.78 · `AI` asset.quality_low |
| Usage | Lessons (4 — 2 published) · Courses (1) · Variants (3) · Packs |
| History | Reverse-chronological actor + action |
| Model view — recognition-arsl 2.4.0 | Confidence · Reading · Action |

**Variants (SyInspector):** `docked` · `overlay` (bp.md) · `peek` (⌘Enter from a reference)
**States:** populated, multi-select summary, no selection, loading, restricted
**Keyboard:** `⌘/` toggles · `F6` enters · sections collapse with Enter on the header
**Accessibility:** complementary landmark; section headers are real headings; collapse state announced
**Sizing:** 280–420px (Foundations §15). Drawn at 292px.

---

## 3. SCALE / CARDINALITY RULES

*Source: Scale Review Q1, Q2. These are thresholds the design states explicitly.*

| Concern | Threshold | Behaviour at/below | Behaviour above | Source |
|---|---|---|---|---|
| **Exact counts** | **10,000** | Exact count (`"318 of 4,812 match"`) | Approximate (`"~12,400 match"`), with a **Count precisely** action on demand | Q1 |
| **Group-by** | facet cardinality **~200** | Group-by offered | Field appears in the filter menu instead; the column picker states why | Q1 |
| **Queue / walk working set** | **~200** | Full queue | Working set of the first N of the ordering, shown as `"7 of 200 · ~12,400 remaining"`; finishing offers the next batch | Q1, A3 |
| **Full-set aggregates (inspector)** | **1,000 selected** | Aggregate computed (e.g. `"Mixed (2 values)"`) | Pane states counts and offers **Compute across selection** as an explicit action; layout identical either way | Q1 |
| **Virtualised window** | — | ~24 rows rendered regardless of match count | unchanged | Q1, Screens §01 |
| **Miscalibrated validation rule** | **30% of a scope** | Rule shown to editors | Flagged as miscalibrated to an Administrator rather than shown to every editor | Foundations §10 |

**Additional scale guardrails (stated as rules, not thresholds):**

- **Denormalised row columns** (media count, quality score, usage) are **materialised projections** on the entity record, updated by the same events that change the underlying data. *"Any column that cannot be materialised is not a default column."*
- **Sortability is declared per column** and indexed accordingly. Non-sortable columns **show no sort affordance at all** — *"better than an affordance that sometimes takes nine seconds."*
- **Usage count is not a default column.** Available as an opt-in materialised column; always present in the inspector for the focused entity, where it costs one query.
- **Duplicate detection while typing:** debounced, cancellable, and only after **three characters**. Advisory, so a slow or missing answer never blocks the save.
- **Pagination:** infinite scroll, **no page numbers**. The footer states matches, not pages.
- Above **~2,000 matched rows** the footer suggests narrowing.

**UNSPECIFIED BY DESIGN:**
- Virtualisation overscan count (only "~24 rows rendered" is stated).
- The precise ranking function for search results (ordering principles are stated in Foundations §11; weights are not).
- Debounce interval in milliseconds for duplicate detection.

---

## 4. SYNC VS JOB

*Source: Scale Review Q4, amendment A2.*

> **Canonical rule:** *"The dividing line is not the operation, it is the cardinality. The same bulk edit is synchronous over 12 entities and a job over 12,000, and the interface must not change shape between them — only the feedback does."*

| Operation | Sync limit | Behaviour above the limit | Undo |
|---|---|---|---|
| Inline single-field edit | always sync | Optimistic write, server confirm; conflict surfaces as a field-level diff | ⌘Z, local |
| Bulk edit | **≤ 50** | Becomes a job: drawer closes, tray shows progress, entities update as they are written. Grid usable throughout. | One token, whole batch |
| Bulk lifecycle transition | **≤ 50** | As bulk edit, but each entity is guard-checked individually. Result names how many succeeded and why the rest did not. | Per-batch, guarded |
| Select-all-filtered + action | **always job** | Predicate sent, not IDs. Server resolves and applies inside one transaction, **reporting a count first so the user can cancel before it starts.** | One token, whole batch |
| Bulk validation | **always job** | Rules run per scope and report as each completes, so short rules are not held up by long ones. Partial results shown as partial. | n/a — read-only |
| Auto-fix a rule | **≤ 20** | Confirm dialog states the exact count; runs as a job. Dialog always names what will change before it runs. | One token, whole batch |
| Pack build & publish | **always job** | Seven-stage pipeline, resumable; stage state stored on the release rather than the session. | Rollback, not undo |
| Import | **always job** | Staged: parse, validate, preview, commit. Nothing written until the preview is accepted; the preview is itself a collection view. | Import is one revision |
| Export / dataset manifest | **always job** | Produces an artefact with a URL and an expiry. User is notified; they need not wait on the screen. | n/a — read-only |
| Media ingest | **always job** | Per-file pipeline with per-stage failure and resume-from-stage. **One bad file never fails a batch.** | Delete the asset |

**Progress, completion and result presentation:**

- **Progress:** shown in the **Activity tray** in the scope bar (see §6). Per-job progress bar with a percentage as text.
- **Completion:** a finished job posts **one toast** carrying its **undo token**.
- **Failure:** a failed job **stays in the tray** with the entities it did not touch. Failure is a stage state, not a dead end — the record stays visible with its stage, error and a **retry that resumes rather than restarts**.
- **Partial success is the normal outcome** for bulk operations (Q5).
- **Closing the tray does not cancel anything.**
- Irreversible stages — signing, promotion — **say so before they run**.

---

## 5. OPTIMISTIC UPDATES

*Source: Scale Review Q5.*

> **One rule, no exceptions:** *"Optimistic only when the client can compute exactly what the server will decide. If a guard, a permission, a validation rule, another user's edit or a uniqueness constraint could change the outcome, the client cannot know it, and pretending otherwise means showing a state that never existed."*

**OPTIMISTIC — revert on failure (6):**

| Operation | Why permitted |
|---|---|
| Inline single-field edit | Client knows the new value and the field's format rule. Revert with an inline error if the server disagrees. |
| Selection, expand, collapse | Pure client state. Nothing to confirm. |
| Column, density, view preferences | User-scoped settings with no server-side consequence. |
| Accepting or rejecting a suggestion | The value is already known; accepting only changes its provenance. Write is confirmed behind the scenes. |
| Reordering within a lesson | Order is a local property of one entity the user already holds. |
| Star / unstar a saved view | Personal, reversible, consequence-free. |

**CONFIRMED — pending state until the server answers (6):**

| Operation | Why it cannot be optimistic |
|---|---|
| **Every lifecycle transition** | **Guards depend on validation state and permissions the client cannot evaluate. Optimistic approval is how an unapprovable entity appears approved.** |
| Create with a unique identifier | Gloss uniqueness within a language is a server constraint; duplicate detection is advisory, not authoritative. |
| Delete, deprecate, merge | Impact is computed from the graph. The preview is a server answer, and the action is confirmed against it. |
| Publish, promote, roll back | Affects people outside the room. Nothing about it is ever optimistic. |
| Dataset split assignment | Leakage guards run server-side over signer and augmentation lineage — exactly the thing a client cannot see. |
| Any bulk operation | Partial success is the normal outcome. Optimism would show a uniform result that did not happen. |

**Pending visual grammar (canonical, deliberately quiet):** the control **keeps its label**, gains `aria-busy`, and the row shows a subdued state. **No spinner overlay, no disabled screen.** *"A reviewer approving forty signs should never wait on a modal."*

---

## 6. JOBS

*Source: Scale Review A2; Foundations §03, §04 (added under F4).*

**A Job is an entity.** Domain-model rule, verbatim:

> *"Every operation too large to run synchronously becomes a Job with an ID, a state, an owner, a stage list and a deep link. It sits across the planes rather than inside one, because the same machinery runs a bulk edit, an import, a pack build and an ingest."*

**Plane:** listed under DISTRIBUTION in the §03 entity graph, annotated *"Cross-plane: owns a scope, a stage list and an actor."*

**Routes (Foundations §04 URL contract):**

```
/jobs?state=running&actor=@me     Job list. Same list template as any other collection.
/jobs/JOB-2291                    Job detail: scope, stages, failures, affected entities, undo token.
```

**Components — no new component:**
- Job **list** = `SyCollection`
- Job **detail** = `SyPipeline`
- Tray content = `SyCollection` in an overlay

**Activity tray (drawn on both canonical screens):**

- **Location:** scope bar, immediately left of the user avatar.
- **Drawn affordance:** `ACTIVITY` label · count · `⌘J`
- **Shortcut:** `⌘J`
- **Header:** `Activity` · `scope bar tray · ⌘J` · running count (e.g. *"3 running"*)
- **Row anatomy:** job label · progress bar with percentage as text · state
- **Drawn states:** running (with %), complete, failed, queued
- **Footer copy, verbatim:** *"Closing the tray does not cancel anything. A finished job posts one toast carrying its undo token; a failed job stays in the tray with the entities it did not touch."*

**Job stage states (from `SyPipeline`):** `pending`, `running`, `done`, `warning`, `failed`, `skipped`, `blocked` (waiting on approval)

**Interactions:** each stage is a link; every stage is deep-linkable and resumable after a reload.
**Accessibility:** ordered list semantics; current stage marked `aria-current`; progress announced politely.

**UNSPECIFIED BY DESIGN:** job retention period; tray maximum row count; whether jobs are cancellable mid-run (only *"closing the tray does not cancel anything"* is stated); notification behaviour when the user is on another screen beyond the single completion toast.

---

## 7. SELECTION → QUEUE

*Source: Scale Review A3, Q2; Screens §01.*

> **Canonical rule:** *"Any selection can become a queue."*

**Selection model — selection is a predicate, not an ID list:**

> *"The client holds the filter plus exceptions. Every bulk action sends the predicate, and the server resolves it once inside a transaction."*

`⌘A` selects **the filtered set**, not the rendered page.

**Bulk bar — two verbs (drawn):**

| Verb | Purpose | Shortcut |
|---|---|---|
| **Bulk edit** | Uniform changes across the selection | `⌘E` |
| **Walk selection** | Per-entity attention | `↵` |

**Bulk bar anatomy (drawn, Vocabulary):**

```
[3 selected] [⇧J extend · ⌘A all 318] | [Walk selection ↵] |
Assign reviewer A · Set category C · Request approval ⌘↵ ·
Add to lesson L · Validate ⌘⇧V · Export        …        Clear Esc
```

- The bulk bar **sits in the layout flow** (under the filter bar), **not as a floating toolbar** — *"so nothing shifts when it appears and the grid never jumps under the cursor."*

**Walk interaction model (three drawn states):**

| Stage | Behaviour |
|---|---|
| **SELECT** | The bulk bar offers two verbs, not one. |
| **WALK** | The editor's sidebar becomes that selection. Position is in the URL, so the walk survives a reload and can be handed to someone else. Header reads `Walking selection` / source view / `7 of 200 · ~12,400 remaining`. |
| **RETURN** | Finishing returns to the grid with the walked entities marked done and the rest still selected. *"Nothing is lost by leaving."* |

- Working set capped at **~200** with an explicit next batch.
- Navigation within a walk: `J` / `K`. Decide: `⌘⇧R`.
- **No new component:** *"it is `SyCollection` handing a cursor to `SyEntityHeader`, which the Sign editor already does with the review queue. It generalises to every list-to-detail pair in the product."*

**Bulk edit semantics (drawn, canonical):**

- *"Only fields you touch are applied. Untouched fields keep their per-entity values."*
- Mixed values render as `Mixed — unchanged` and are left alone unless explicitly set.
- Each touched field carries a checkbox indicating it will be applied.
- Confirm reads **`Apply to 3 ⌘↵`** — the count is in the label.
- Opens in a **`SyDrawer`**, so the grid stays visible. Never a modal.
- Completion toast: *"Category set on 3 signs"* + **`Undo ⌘Z`**.

**Multi-select inspector:** shows **common fields**, **validation across selection**, and **usage**, with the note *"Editing a field here applies to all 3 as one undoable batch."* and an impact line *"Deleting the selection would break 3 lesson references."*

---

## 8. DUPLICATE MERGE — IDENTIFIED MISSING WORKFLOW

*Source: Scale Review Q6 (status: **Missing**); Handoff Audit O1.*

**Status: DO NOT IMPLEMENT. Requires a linguistic/domain decision first.**

**Why it is needed, verbatim:**

> *"Deciding whether two signs are the same requires both glosses, both media sets and both usage graphs at once. This is the highest-value missing workflow in the product."*

**What is decided:**

- It would be an **L3 workbench** template: two entities, a **field-by-field survivor choice**, and a merge that **rewrites references**.
- It is **not** a generic CRUD operation.
- The `sign.duplicate` advisory rule currently states its resolution as *"Manual — merge or dismiss"* — **with no merge to point at.**

**What is NOT decided and must not be invented:**

- Which gloss survives — *"a linguistic decision, not a UI one."*
- What happens to the losing media set.
- Whether lesson references are **rewritten or redirected**.

**Who decides:** *"Sign language linguist plus data owner. Design follows the decision, not the other way round."*
**Timing:** before the Vocabulary workspace ships. **Does not block Phase 1.**

---

## 9. ACCESSIBILITY / VISUAL RULES

*Source: Foundations §16, §13; contrast corrections applied across all documents.*

### 9.1 The three contrast tokens (exact values — do not substitute)

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `control.disabled.bg` | **`#ebebeb`** | `#2b2e32` | Disabled control ground. **Never a dimmed version of the enabled fill.** |
| `control.disabled.fg` | **`#6b6b6b`** | `#8f9296` | Disabled control label. **4.6:1 on `control.disabled.bg`** — a disabled control must still be readable. |
| `icon.subtle` | **`#858585`** | `#8f9296` | Resting state of non-text affordances: row menus, unstarred views, chevrons. **3.3:1 on every surface — WCAG 1.4.11 floor for UI components.** |

### 9.2 §16 rules (complete, verbatim requirement text)

| Area | Requirement | Verification stated by design |
|---|---|---|
| **Contrast** | AA is the floor and AAA the target for body text. Disabled controls still meet 3:1 via `control.disabled.*`, and non-text affordances — row menus, chevrons, toggles — meet 3:1 via `icon.subtle`. *"A greyed-out control that cannot be read is not a state, it is a defect."* | CI asserts every semantic pairing in both themes; **a raw hex in a component fails review**. |
| **Focus visibility** | A **2px accent ring with a 2px offset** on every focusable element, **never removed**. Focus order follows the visual order. | Keyboard-only walkthrough per template |
| **Keyboard completeness** | No mouse-only action anywhere, **including drag reordering, which always has a `⌘↑↓` equivalent**. | Every register entry lists its keyboard support |
| **Screen readers** | Landmark regions per pane, live regions for async results, accessible names on every icon-only control. | NVDA + VoiceOver pass on the five templates |
| **Colour vision** | Status is **glyph + label**. The palette is verified against **protanopia, deuteranopia and tritanopia** simulations. | Simulation review on every new status colour |
| **Zoom & large text** | Usable to **200% zoom** and at OS large-text settings. Layout uses relative units; **no fixed-height text containers**. | 200% zoom test at `bp.lg` |
| **Reduced motion** | `prefers-reduced-motion` collapses all transforms; **opacity is capped at 80ms. Nothing loops.** | Motion audit on new components |
| **Input parity** | Mouse, trackpad, touch and pen. **44px hit areas on touch**; hover is never the only way to reveal an action. | Touch pass on tablet at `bp.md` |

### 9.3 Domain-specific accessibility requirement (§16, verbatim)

> *"Sign media is the primary content type, and it is silent and visual. Every clip in Studio therefore carries a written gloss, a plain-language description and an optional written translation as required metadata, not optional fields. Playback controls include frame-step, loop-region and a 0.25× speed floor, because reviewing a handshape transition is frame-level work. Media without a gloss fails pre-publish validation as a blocking error."*

### 9.4 Additional visual rules bearing on accessibility

- **Colour is never the only signal** (P5). Status carries a glyph and a label. Charts carry direct labels. **Forbids:** red/green-only status dots; legends that map colour to meaning alone.
- **Matrix cells** carry glyph + word. `untested` is **explicit, never a blank** — *"most matrices lie by leaving it blank, and a blank cell reads as safe."*
- **Metric deltas** carry sign and unit as text (`"+1.6 pts"`).
- **Confidence** is a number first, band label second; the bar is decorative and `aria-hidden`.
- **`viz.*` standing rule:** any bar built from the viz ramp **must state its number as text beside it**, because this is the only place colour is quantitative.
- **Disabled** is never used without an adjacent stated reason.
- **Motion:** nothing that blocks input animates longer than 150ms. **Layout-shifting animation is prohibited in data views.**
- **RTL:** all spacing uses logical properties (`inline-start`, not `left`) so RTL is a document attribute, not a stylesheet fork.

**UNSPECIFIED BY DESIGN:**
- Focus ring is described in prose (2px accent, 2px offset) but **is not tokenised** — there is no `focus.ring.color` / `.width` / `.offset` trio. Recorded as audit finding **F9**.
- Dark-theme rendering has never been drawn; the token table exists but is unexercised (audit finding **F10**).

---

## 10. DESIGN FOUNDATIONS — COMPLETE TOKEN EXTRACTION

*Source: Foundations §13. Three-tier model: **primitive → semantic → component**. Components may reference **only** semantic tokens. Naming convention: `category.role.variant.state`, read left to right, coarse to fine. No abbreviations, no numbers in semantic names, no hex value or platform word in a token name.*

**Triplet convention (canonical):** *"Any token naming a tinted ground carries `.fg`, `.bg` and `.border`. A component may use all three or only one, but it never invents the missing two."*

### 10.1 Colour — semantic layer, LIGHT theme (41 tokens)

| Token | Value | Semantic meaning / usage |
|---|---|---|
| `surface.canvas` | `#f4f4f4` | App background behind panes. |
| `surface.default` | `#ffffff` | Cards, tables, editors. |
| `surface.subtle` | `#fafafa` | Toolbars, table headers, footers. |
| `surface.selected` | `#eef3f0` | Selected rows, active nav. |
| `border.default` | `#e4e4e4` | Pane and card separation. |
| `border.strong` | `#cfcfcf` | Input borders, focusable edges. |
| `text.primary` | `#1a1a1a` | Body and headings. 15.3:1 on white. |
| `text.secondary` | `#4a4a4a` | Supporting prose. 8.9:1. |
| `text.tertiary` | `#6b6b6b` | Metadata and labels. 5.4:1 on white, 4.9:1 on subtle and selected surfaces — passes AA on every ground in the system. **Never for body copy.** |
| `accent.default` | `#2f6b52` | Primary action, focus ring, selection. |
| `accent.hover` | `#255744` | Pressed and hovered primary. |
| `accent.subtle` | `#eef3f0` | Accent-tinted grounds. **Same value as `surface.selected` by intent, not coincidence.** |
| `accent.border` | `#cfe0d8` | Border companion for accent grounds. |
| `accent.ai` | `#5b4b8a` | AI/ML domain only. Same lightness as accent. |
| `accent.ai.subtle` | `#f3f1f8` | Suggestion wrappers, ghost annotation lanes, advisory findings. |
| `accent.ai.border` | `#cfc6e0` | Border companion for the AI register. |
| `control.disabled.bg` | `#ebebeb` | Disabled control ground. Never a dimmed version of the enabled fill. |
| `control.disabled.fg` | `#6b6b6b` | Disabled control label. 4.6:1 on `control.disabled.bg`. |
| `icon.subtle` | `#858585` | Non-text affordances. 3.3:1 on every surface — WCAG 1.4.11 floor. |
| `status.neutral.fg` | `#4a4a4a` | Draft, deprecated, unset. |
| `status.neutral.bg` | `#f4f4f4` | — |
| `status.neutral.border` | `#dcdcdc` | — |
| `status.success.fg` | `#1f7a3d` | Approved, published, passed validation. |
| `status.success.bg` | `#eef7f1` | — |
| `status.success.border` | `#cfe6d8` | — |
| `status.warning.fg` | `#a05a1e` | Changes requested, non-blocking validation, degraded compatibility. |
| `status.warning.bg` | `#fdf6ec` | — |
| `status.warning.border` | `#eeddc2` | — |
| `status.danger.fg` | `#b91c1c` | Blocking errors, destructive actions, incompatible. |
| `status.danger.bg` | `#fdf2f2` | — |
| `status.danger.border` | `#f0d4d4` | — |
| `status.info.fg` | `#1e5a8a` | In review, informational, untested. |
| `status.info.bg` | `#eef4f9` | — |
| `status.info.border` | `#cfe0ee` | — |
| `viz.track` | `#f0f0f0` | Unfilled portion of any quantitative bar. The only neutral in the viz ramp. |
| `viz.fill.default` | `#cfe3d8` | At or above target — coverage, quality, rollout, budget. |
| `viz.fill.warning` | `#f0dcc0` | Below target, above floor. |
| `viz.fill.danger` | `#f0cccc` | Below floor — landmark gaps, critical coverage shortfall. |
| `viz.fill.ai` | `#efecf6` | Machine-produced spans: suggested annotation lanes. |
| `viz.stroke.default` | `#a9cbb9` | Segment edge on a filled span, so adjacent spans stay countable. |
| `viz.stroke.ai` | `#b6acd2` | Dashed segment edge on suggested spans. |

### 10.2 Colour — DARK theme (31 tokens)

*Design rule, verbatim: "Dark is not an inversion. Elevation is expressed by surface lightness rather than shadow, accent lightness rises to 0.72 to hold contrast on dark ground, and pure black is never used as a canvas — it makes long sessions harder and kills the elevation scale."*

| Token | Value |
|---|---|
| `surface.canvas` | `#17181a` |
| `surface.default` | `#1f2124` |
| `surface.subtle` | `#26282c` |
| `surface.selected` | `#1e3329` |
| `border.default` | `#33363a` |
| `border.strong` | `#4a4e54` |
| `text.primary` | `#eceded` |
| `text.secondary` | `#b9bcc0` |
| `text.tertiary` | `#8f9296` |
| `accent.default` | `#6ab894` |
| `accent.subtle` | `#1e3329` |
| `accent.ai` | `#a394d8` |
| `accent.ai.subtle` | `#241f33` |
| `control.disabled.bg` | `#2b2e32` |
| `control.disabled.fg` | `#8f9296` |
| `icon.subtle` | `#8f9296` |
| `status.neutral.fg` | `#b9bcc0` |
| `status.neutral.bg` | `#26282c` |
| `status.success.fg` | `#5fbd7d` |
| `status.success.bg` | `#1a2b21` |
| `status.warning.fg` | `#d99a4e` |
| `status.warning.bg` | `#2e2519` |
| `status.danger.fg` | `#e8736b` |
| `status.danger.bg` | `#2e1d1c` |
| `status.info.fg` | `#6aa8db` |
| `status.info.bg` | `#1a252e` |
| `viz.track` | `#2b2e32` |
| `viz.fill.default` | `#3d6b54` |
| `viz.fill.warning` | `#7a5a2e` |
| `viz.fill.danger` | `#7a3733` |
| `viz.fill.ai` | `#3a3352` |

**DARK COUNTERPARTS — UNSPECIFIED BY DESIGN (10 tokens).** These exist in light and have **no dark value**. Do not invent them:

`accent.hover` · `accent.border` · `accent.ai.border` · `status.neutral.border` · `status.success.border` · `status.warning.border` · `status.danger.border` · `status.info.border` · `viz.stroke.default` · `viz.stroke.ai`

### 10.3 Typography

**Families:** `Libre Franklin` (UI) · `IBM Plex Mono` (mono).
**Mono usage rule:** *"Mono carries IDs, glosses, versions, timecodes and diffs — never prose."*
**Numerics rule:** *"All numeric columns use `font-variant-numeric: tabular-nums`."*
**Body size rationale, verbatim:** *"Body is 13px, not 16px: at eight-hour dwell times, the win is lines-per-screen."*

| Token | Spec (size/line-height weight) | Sample usage |
|---|---|---|
| `display` | `28/1.15 700` | Page-level titles |
| `heading.lg` | `20/1.25 600` | Entity header titles |
| `heading.md` | `16/1.3 600` | Section headings |
| `heading.sm` | `14/1.35 600` | Panel headings |
| `body` | `13/1.55 400` | Default reading size across the app |
| `body.strong` | `13/1.55 600` | Emphasis inside body text |
| `caption` | `11.5/1.4 400` | Metadata, helper text, counts |
| `label` | `10.5/1.3 500` | Tracked uppercase section labels |
| `mono` | `11.5/1.5 400` | IDs, versions, timecodes |

### 10.4 Spacing — 4px base

| Token | Value |
|---|---|
| `space.050` | `2px` |
| `space.100` | `4px` |
| `space.200` | `8px` |
| `space.300` | `12px` |
| `space.400` | `16px` |
| `space.600` | `24px` |
| `space.800` | `32px` |
| `space.1200` | `48px` |

### 10.5 Radius

| Token | Value | Observed usage |
|---|---|---|
| `radius.xs` | `2px` | Checkboxes, small chips |
| `radius.sm` | `4px` | **Default for controls** |
| `radius.md` | `6px` | Palette, elevated cards |
| `radius.lg` | `10px` | **Defined, never drawn** — audit finding F8 |
| `radius.full` | `999px` | Avatar only; **not referenced by any component contract** — audit finding F8 |

### 10.6 Elevation

*Design rule, verbatim: "Four levels, and level 0 is the default. Elevation encodes **dismissibility**, not importance: if it can be escaped with `Esc`, it is raised."*

| Token | Value | Use |
|---|---|---|
| `elev.0` | `none` | Panes, tables, everything default |
| `elev.1` | `0 1px 2px rgba(0,0,0,0.07)` | Dropdowns, popovers, tooltips |
| `elev.2` | `0 6px 16px rgba(0,0,0,0.10)` | Drawers, sheets, side panels |
| `elev.3` | `0 14px 34px rgba(0,0,0,0.14)` | Modal dialogs, command palette |

**Dark theme:** elevation is expressed by **surface lightness rather than shadow**. Specific dark elevation values are **UNSPECIFIED BY DESIGN**.

### 10.7 Motion

| Token | Value | Use |
|---|---|---|
| `dur.instant` | `80ms` | Hover, focus, checkbox, toggle |
| `dur.fast` | `120ms` | Popover and menu entry, tab change |
| `dur.base` | `180ms` | Drawer and sheet slide, dialog scale |
| `ease.standard` | `cubic(.2,0,0,1)` | Entering elements |
| `ease.exit` | `cubic(.4,0,1,1)` | Leaving elements — **always faster** |

**Rules:** nothing that blocks input animates longer than **150ms**. Layout-shifting animation is **prohibited in data views**. Under `prefers-reduced-motion` all durations collapse to 0 except opacity, capped at **80ms**.

### 10.8 Sizing, density and layout

| Item | Value | Source |
|---|---|---|
| Row height — compact | **`28px`** (Foundations §15) / **`26px`** (Design System density prop) | ⚠ **CONFLICT — see §16** |
| Row height — default | `32px` | Both |
| Row height — relaxed | `40px` | Both |
| Rail width | `60px` | §15, drawn |
| Sidebar width | `208–360px`, resizable | §15 (drawn at 216px) |
| Inspector width | `280–420px`, resizable | §15 (drawn at 292px) |
| Content grid | 12-column fluid, 16px gutters, 1200px comfortable maximum for prose; data views full-bleed | §15 |
| Vertical rhythm | `4px` | §15 |
| Button heights | `28 / 32 / 40` (sm / md / lg) | SyButton contract |
| Minimum hit area | `32px`, **`44px` on touch** | SyButton contract, §16 |

**Icon sizing (§15):** stroke-based, **16px in dense contexts**, **20px in toolbars**, on a **24px grid** with **1.5px strokes**.

### 10.9 Breakpoints

| Token | Range | Behaviour |
|---|---|---|
| `bp.sm` | `< 900px` | **Read and review only.** Editors are disabled with an explanation, not a broken layout. |
| `bp.md` | `900–1279px` | Rail + one pane. Sidebar and inspector become overlays. |
| `bp.lg` | `1280–1727px` | Rail + sidebar + content. Inspector on demand. **The design target.** |
| `bp.xl` | `≥ 1728px` | All panes visible; content column caps and extra width goes to the data view. |

*Design position, verbatim: "Studio is a desktop tool and says so. Below 900px it degrades to a read-and-review surface rather than pretending to be an editor — an honest constraint beats a broken one."*

### 10.10 Validation severities

| Severity | Colour token | Rule |
|---|---|---|
| `BLOCKING` | `status.danger.*` | Deterministic. Stops publication. Overridable **only by an Administrator**, with a recorded reason. |
| `WARNING` | `status.warning.*` | Deterministic. Acknowledged with a note at release time; the acknowledgement is part of the record. |
| `ADVISORY (AI)` | `accent.ai` | Probabilistic. Carries a confidence figure. **Never blocks, never auto-fixes**, always dismissible with one click. |
| `INFO` | `status.info.*` | Facts worth knowing at publish time: pack size delta, entity counts, channel exposure. |

### 10.11 Focus / disabled / selected tokens

| Concern | Token(s) | Status |
|---|---|---|
| Focus | `accent.default` at 2px ring / 2px offset | **Described in prose; not tokenised.** UNSPECIFIED BY DESIGN as discrete tokens (F9). |
| Disabled | `control.disabled.bg`, `control.disabled.fg` | Specified. |
| Selected | `surface.selected` / `accent.subtle` (same value) + a checked control | Specified. Selection is **never colour alone**. |

---

## 11. COMPONENT CONTRACTS

**Naming authority:** the Design System. Foundations §14 is a **scope list, not an index of what is contracted** — seven contracted components have no register entry at all.

**Counts:** **22 named contracted components**, specified across **18 contract articles** (the four overlays share one article; `SyConfidence` is documented inside the `SySuggestion` article). Components sharing an article are **still separate modules**.

**Canonical renames (Foundations §14 → Design System):**

```
SyDataGrid            → SyCollection
SyEmptyState          → SyStateBlock
SyValidationList      → SyFindingList
SyAnnotationTimeline  → SyTimeline
SyCompatibilityMatrix ─┐
SyCoverageMatrix      ─┴→ SyMatrix
SyPackBuilder         ─┐
SyReleaseComposer     ─┴→ SyPipeline
```

**Reclassified as configurations, NOT components (5 — see conflict C2):**
- `SyPackBuilder` → configuration of `SyPipeline`
- `SyReleaseComposer` → configuration of `SyPipeline`
- `SyCoverageMatrix` → configuration of `SyMatrix`
- `SyRuleResult` → a row within `SyFindingList`
- `SyProvenanceTag` → `SySuggestion`'s provenance slot

*Rule: "A configuration that needs its own accessibility contract is a component in disguise and should be challenged."*

### Component contract table (22 contracted)

| # | Component | Class | Purpose | Variants | States | Keyboard | Accessibility | Composition / reuse |
|---|---|---|---|---|---|---|---|---|
| 1 | `SyButton` | primitive | Commits an action; the label is the verb, never a generic confirmation | primary · secondary · ghost · danger · icon-only (label required); sizes 28/32/40 | default, hover, active, focus-visible, disabled, loading (label persists, spinner replaces icon) | Enter / Space; never a tabindex trap; loading keeps focus | Native `button`; 32px hit area (44 touch); `aria-busy` when loading; disabled uses `control.disabled.*` and still clears 3:1; **always paired with a reason** | Every screen; inside SyDialog, bulk bar, SyStateBlock, SyFindingList |
| 2 | `SyField` | primitive | One labelled value of any type | text · mono · number · textarea · select · combobox · multi-facet · date | empty, filled, focus, invalid, warning, readonly, disabled, loading, suggested | Tab order = visual order; **Esc reverts an in-progress inline edit**; ⌘S saves the form | Visible label always; error tied by `aria-describedby`; **invalid = border + icon + text**, never colour alone | Every editor and inspector, SyFilterBar, SyDialog forms, inline grid editing |
| 3 | `SyStatusBadge` | primitive | Lifecycle state of any entity | inline (rows) · detail (header) · with modifier suffix | the six lifecycle states, plus `stale` / `blocked` modifiers | Not interactive by default; as a filter chip it is a toggle button | Glyph is `aria-hidden`; the label is the accessible name; actor and time on focus, never colour-only | Grid rows, entity headers, review queue, palette results, release composer |
| 4 | `SyEntityRef` | primitive | A pointer to any entity: type glyph, ID, name, state. **The single way one entity refers to another** | chip · row · inline text · with thumbnail (assets) | resolved, loading, deleted, no-permission, deprecated (with replacement) | Enter opens; **⌘Enter opens in a side peek** without losing the current context | Accessible name = type + name + ID; state announced; not a bare ID link | Lesson contents, validation results, audit log, palette, impact previews, dataset membership |
| 5 | `SyMetric` | primitive | A figure with its denominator, trend and target | lg · md with delta · sm inline · budget bar | ok, warning, error, no-data, loading, stale | Focusable when it links to its underlying list; Enter opens that list | Tabular figures; **the denominator is part of the accessible name**; bars are `aria-hidden` decoration | Health cards, model metric tables, coverage, pack size budget, quality scores |
| 6 | `SyAppShell` | pattern | Rail, scope bar, sidebar, content, inspector | two-pane · three-pane · focus (shell hidden, Esc restores) | ready, scope loading, scope restricted, offline, resizing | ⌥1…7 rail · ⌘L scope · ⌘\ toggle sidebar · ⌘/ toggle inspector · F6 cycles panes | Each pane is a landmark with a name; skip links to content and inspector; **scope changes announced assertively** | Every screen. Panes resizable, persisted per user |
| 7 | `SyEntityHeader` | pattern | The primary entity, stated: identity, state, version, actor, one primary action | detail · collection (entity type as subject) · multi-select (n selected) | ready, loading (title skeleton only), unsaved changes, locked, no-permission, deleted | Primary action has a named shortcut shown in the label; ⌘⌥C copies a deep link | The title is the document `h1`; breadcrumb is a nav landmark; state change is a live region | **Every workspace, without exception.** Owns the queue cursor (A3) |
| 8 | `SyTabSet` | pattern | Facet navigation within a single entity. **Each tab is a route segment**, so every facet is deep-linkable | with counts · without counts · overflowing (scrolls, never wraps to two rows) | default, active, with count, count-is-blocking, disabled with reason, loading count | 1…n jump to tab; ← → traverse when focused; Home / End to the ends. Never traps arrow keys once focus leaves the tablist | `tablist` / `tab` / `tabpanel`; **the active tab is the URL so back works**; a blocking count is in the accessible name, not conveyed by colour; disabled tabs keep their stated reason | Owns navigation only, never content. Tab names and order are **screen data**. Every L2 detail template |
| 9 | `SyInspector` | pattern | Computed context for the focused entity | docked · overlay (md) · peek (⌘Enter from a reference) | populated, multi-select summary, no selection, loading, restricted | ⌘/ toggles; F6 enters; sections collapse with Enter on the header | Complementary landmark; section headers are real headings; collapse state announced | All 7 workspaces. **Never the only path to a value** |
| 10 | `SyCollection` | pattern | Grid, filter bar, saved views, bulk bar and pagination **as one composed unit** | table · gallery (assets) · tree-table (lessons) · queue (review, validation) | populated, loading skeleton, first-run empty, filtered empty, partial error, offline, read-only | J/K move · X select · ⇧J extend · E edit · Enter open · / filter · ⌘A all in view | `role=grid`, arrow navigation, sort direction announced, selection count in a live region | Vocabulary, Media, Validation, Model registry, Release history, Job list |
| 11 | `SyStateBlock` | primitive | **Every non-populated state, anywhere** | first-run · filtered-empty · loading · error · no-permission · offline. Sizes: pane · panel · inline row | the six variants | Its action receives focus on appearance **only when the user's action caused the state** | Heading is real; errors are assertive live regions, empties polite; **no decorative illustration** | Every collection, inspector section, overlay, matrix and canvas in the product |
| 12 | `SyMatrix` | pattern | Any two-axis relationship with a small set of cell states | state cells (compatibility) · count cells (coverage) · boolean cells (permissions) | cell states: ok · degraded · blocked · **untested (explicit, never a blank)** | Arrow keys traverse; Enter opens cell detail; Home/End jump to axis ends | Glyph + word in every cell; headers associated both ways; **a table fallback for screen readers** | Release compatibility, dataset coverage, permissions, language completeness |
| 13 | `SyMenu` | primitive | Contextual actions. **Eight fixed groups in fixed order on every entity type** | elev.1 popover | open, loading, submitting, error-in-place | Esc closes; focus returns to trigger | `menu` role; destructive items last and labelled; shortcut shown per item. **Four overlays share one behavioural substrate (focus trap, Esc, stacking, focus restore) — that substrate is a hook, not a component** | Every row, every toolbar, every entity header ⋯. Contents from the **entity action registry** |
| 14 | `SyDrawer` | primitive | Work beside context, never on top of it | right drawer; bottom sheet at narrow widths. elev.2 | closed, open, resizing, **dirty (blocks close)**, stacked max 2 | Esc closes; ⌘Enter submits | `dialog` role; labelled by title; dirty state prompts before discard. Own module; shares the overlay substrate | Bulk edit, media picker, review threads, job detail |
| 15 | `SyDialog` | primitive | **Blocking decisions only.** Confirm button names the action and its count | default, destructive. elev.3 | default, destructive, loading, error-in-place | Esc cancels; focus trapped and restored | `alertdialog` for destructive; impact preview is text, not a warning icon alone. Own module; shares the overlay substrate | Delete, publish, promote, rollback, auto-fix, permission escalation |
| 16 | `SyPalette` | pattern | Find, act, jump. **The index of the product** | 6 modes: search · `>` actions · `@` people · `#` facets · `:` versions · `?` help. elev.3 | idle, typing, results, no results, recents, scoped-vs-global, executing | ⌘K scoped · ⇧⌘K global | `combobox` pattern, `aria-activedescendant` listbox, focus trapped and restored. Own module; shares the overlay substrate | Global |
| 17 | `SySuggestion` | pattern | Wraps any value a model produced | field · cell · segment · record · bulk (accept n at once, itemised) | suggested, accepted, corrected, rejected, **expired (model superseded)**, **conflicting (human edited meanwhile)** | ⌘⇧A accept · ⌘⇧X reject · **Tab moves to the next suggestion, not the next field** | Announced **as a suggestion** with its confidence; never focus-stealing; decisions confirmed politely | Sign editor, translation workbench, annotation timeline, import review, validation advisories |
| 18 | `SyConfidence` | primitive | Confidence figure with a band label and the threshold that applies | inline · column · detail | high, medium, low, unavailable, **stale (computed by an older model version)** | Not independently interactive | Numeric value always in the accessible name; the bar is decorative and `aria-hidden`. **Documented inside the SySuggestion article but independently usable — it appears in the asset grid with no suggestion present, so it is its own module** | Sign editor model view, asset grid, evaluation runs, AI advisories |
| 19 | `SyTimeline` | pattern | Frame-accurate lanes over a time-based asset | annotation lanes · quality lanes · comment anchors · read-only review | empty, extracting, annotated, suggestions pending, conflicting lanes, no track | `[` `]` frame step · `⇧[` `⇧]` segment step · `L` loop region · `Space` play · **0.25× floor** | Every segment focusable with a spoken time range and label; **lanes also render as a table** | Asset workspace, sign media tab, review with timecoded comments, dataset spot-checks |
| 20 | `SyPipeline` | pattern | Any ordered multi-stage process with per-stage state and a resumable failure | horizontal (status) · vertical step list (wizard) · inline row (grid cell) | pending, running, done, warning, failed, skipped, blocked (waiting on approval) | Each stage is a link; every stage is deep-linkable and resumable after a reload | Ordered list semantics; current stage marked `aria-current`; progress announced politely | Asset ingest, release composer, CSV import, evaluation runs, pack builds, **Job detail** |
| 21 | `SyFindingList` | pattern | Grouped rule outcomes with severity, count, affected entities and a resolution path | inline (inspector) · queue (workspace) · gate (pipeline step) · summary chip | clean, warnings, blocking, advisory, running, fixing, fixed, acknowledged, override requested | ⌘⇧V run on scope · Enter jumps to the offending field · A acknowledges with a note | **Severity is the first spoken token**; auto-fix states its scope before running; results are a landmark region | Validation workspace, sign inspector, dataset checks, release gate, import review |
| 22 | `SyVersionList` | pattern | Immutable versions of anything | model versions · releases · entity revisions · dataset snapshots | current, superseded, evaluating, deployed, yanked, rolled back, comparing two | X marks two versions, C compares them, Enter opens the version | Deltas carry sign and unit as text; metric column **always names its split or baseline** | Model registry, release history, entity History tab, dataset versioning |

### Dark-theme behaviour for components

**UNSPECIFIED BY DESIGN.** The dark token table exists; **no component or screen has been drawn in dark theme** (audit finding F10). Components inherit the remapped semantic tokens; no component-level dark overrides are defined.

### Loading behaviour — canonical patterns

- `SyCollection`: **skeleton matching the real row grid** at the remembered row count; *"nothing shifts on arrival."* Filter bar and saved view stay interactive.
- `SyEntityHeader`: **title skeleton only** — *"never a full-screen spinner; the entity identity is the first thing painted."*
- `SyStateBlock` loading variant: **skeleton, not spinner.**
- `SyButton` loading: **label persists**, spinner replaces the icon, `aria-busy` set, focus kept.
- `SyMatrix` / `SyMetric`: card keeps its title and denominator visible while its figure loads.

### Validation behaviour — canonical

- `SyField` invalid: **border + icon + text**, never colour alone; message tied via `aria-describedby`.
- `SyFindingList`: severity is the first spoken token; grouped **by rule, not by entity** (*"twelve signs missing media is one row with a count, not twelve rows"*).
- Blocking rules **cannot be overridden by an Editor**. An Administrator override is recorded in the audit log with a reason.

---

## 12. COMPONENT CLASSIFICATION

*Classified using reuse evidence from the designed screens. The design's own test: "At least two unrelated screens must want it. One caller means it belongs to that screen, not to the system."*

### Design System primitives (9)

`SyButton` · `SyField` · `SyStatusBadge` · `SyEntityRef` · `SyMetric` · `SyStateBlock` · `SyMenu` · `SyDrawer` · `SyDialog` · `SyConfidence`

### Design System patterns (12)

`SyAppShell` · `SyEntityHeader` · `SyTabSet` · `SyInspector` · `SyCollection` · `SyMatrix` · `SyPalette` · `SySuggestion` · `SyTimeline` · `SyPipeline` · `SyFindingList` · `SyVersionList`

### Workspace/application components — registered, NOT contracted (17)

*One-line register entries in Foundations §14. **Not implementable as written** — no specimen, no variants, no keyboard detail. Contract each one alongside the screen that needs it, never before.*

`SyTreeNav` · `SyScopeBar` · `SyMediaPlayer` · `SyMediaPicker` · `SyModelSelector` · `SyPoseInspector` · `SyQualityScore` · `SyDatasetSplitEditor` · `SyModelCard` · `SyMetricTable` · `SyRolloutControl` · `SyReviewPanel` · `SyDiffView` · `SyPinnedItems` · `SyHealthCard` · `SyToast` · `SyInlineBanner`

### Screen-specific — MUST NOT be promoted into shared components

| Screen | Screen-specific |
|---|---|
| Vocabulary | The nine-column default set and their order · category grouping semantics · the `318 / 4,812` count copy · which four saved views ship |
| Sign Editor | The five tab names and their order · which phonology fields exist for ArSL · the conflict dialog's per-field copy · the *"Model view"* section title |
| Media | Which capture metadata fields are mandatory · quality threshold defaults per language · gallery tile aspect ratio |
| Model Registry | Which metrics are headline vs detail · device tier names · the ML Studio registration payload contract · promotion gate wording |
| Validation Center | The 15-rule catalogue (product data, not UI) · rule wording · the 30% miscalibration threshold · which rules offer auto-fix |
| Release Composer | Channel names and promotion policy · signing key management · rollout percentage steps · the 250MB budget figure |
| Health | Which six figures · their thresholds · scope-following behaviour |

---

## 13. WORKSPACE RECIPES

### 13.0 The workspace recipe (canonical, applies to all)

*Source: Design System §Workspace recipe.*

| Part | Component | Role |
|---|---|---|
| 1 · **SUBJECT** | `SyEntityHeader` | Names the entity, its state, its last actor and the one primary action |
| 2 · **BODY** | `SyCollection` or canvas | Either many of the entity (grid, matrix, queue) or one of it (editor, timeline, card) |
| 3 · **CONTEXT** | `SyInspector` | State, validation, usage, history — in that fixed order, every time |
| 4 · **ABSENCE** | `SyStateBlock` | Six named states written as content, not built as screens |
| 5 · **REACH** | `SyPalette` + shortcuts | Every action on the screen is also an entry in the palette, with its shortcut shown |

**Six tests before any screen is designed:**
1. Can you name the primary entity in one word?
2. Can a user open, edit and publish that entity from here?
3. Does every secondary entity appear as a `SyEntityRef`, not a copy?
4. Is there exactly one primary action?
5. Does the screen introduce a component, or only assemble existing ones?
6. Would a professional spend an hour here without leaving?

**Layout templates (Foundations §15):**

| Template | Name | Panes |
|---|---|---|
| L1 | List / Data | rail · nav · grid + filter bar + footer |
| L2 | Detail / Editor | rail · nav · tabs + canvas · inspector |
| L3 | Workbench | rail · queue · source · target |
| L4 | Pipeline / Wizard | rail · steps · step body + validation · summary |
| L5 | Focus | toolbar + single subject, everything else dismissed |
| L6 | Health / Overview | rail · nav · health card grid + attention list |
| L7 | Matrix | rail · nav · matrix + legend + cell detail |

---

### 13.1 Vocabulary — **DRAWN, CANONICAL**

| Field | Value |
|---|---|
| **Primary entity** | `SIGN (many)` |
| **Template** | L1 · collection |
| **URL** | `/l/:lang/vocabulary` (drawn: `?status=review,changes&media=missing&group=category`) |
| **Goal** | Move a batch of signs toward publishable state: find what is incomplete, fix it or route it to someone who can |
| **Secondary entities** | Category, Media Asset (count + state), Reviewer, Lesson usage, Validation findings — **all as `SyEntityRef`, never duplicated data** |
| **Layout** | `SyAppShell` three-pane. Rail 60 · sidebar 216 · inspector 292. Shell minimum 1560px |
| **Scope / navigation** | Scope bar: language switcher (`⌘L`), palette (`⌘K`), blocking count, **Activity tray (`⌘J`)**, avatar. Rail: Content · Data · Models · Validate · Publish · Health · Admin (`⌥1–7`) |
| **AppBar / header** | `SyEntityHeader` collection variant: breadcrumb `ArSL / Vocabulary`; title **Vocabulary**; `4,812 signs · 318 shown`; actions **Import**, `⋯`, primary **New sign `N`** |
| **Sidebar** | Content tree with counts (Overview, Review queue 37, Courses 12, Lessons 184, **Vocabulary 4,812** + category children, Categories 48, Translations 9,140) · **Saved views** (Needs media ★ `⌘1`, My reviews `⌘2`, Blocked for release `⌘3`, Low quality media `⌘4`) · `⌘\ hide sidebar` |
| **Filters** | Filter input (`/`) · Status (In Review +1) · Media (Missing) · Updated (Last 7d) · Reviewer (@yusuf) · `+ Filter` · Group: Category · Columns · density toggle |
| **Table columns (9, drawn)** | checkbox · ID · Display name (sorted ↑) · Gloss · Status · Media · Quality (number + band word) · Updated · `⋯` |
| **Grouping** | Group-by category **inside the grid** with per-group counts and a warning count (e.g. *Greetings · 36 signs · 2 blocking*) |
| **Selection** | Selection bar **in the layout flow**, not floating. `3 selected` · `⇧J extend · ⌘A all 318` · **Walk selection ↵** |
| **Bulk actions** | Assign reviewer `A` · Set category `C` · Request approval `⌘↵` · Add to lesson `L` · Validate `⌘⇧V` · Export · Clear `Esc` |
| **Inspector** | Multi-select summary: **Common fields** (Category *Mixed (2 values)*, Reviewer) · **Validation across selection** (BLOCK/WARN/AI) · **Usage** (`SyEntityRef` chips + *"Deleting the selection would break 3 lesson references"*) · footer **Walk selection ↵** / **Bulk edit ⌘E** |
| **Inline editing** | Single field only. Green 1.5px border + focus glow, hint `↵ save · Esc revert` |
| **Contextual menu** | Open `↵` · Open in side peek `⌘↵` · Edit inline `E` ⁄ Add to lesson `L` · Attach media `M` · Request approval `⌘↵` ⁄ Validate `⌘⇧V` ⁄ Duplicate `⌘D` · Copy deep link `⌘⌥C` ⁄ Deprecate… · **Delete… `⌫`** |
| **Footer** | `318 of 4,812 match` · `exact — approximate above 10k` · infinite scroll, **no page numbers** · Density: Compact / **Default** / Relaxed |
| **Virtualisation** | Explicit boundary drawn: *"virtualised window · rows 1–24 of 318 rendered · server-side sort, filter and count"* |
| **Empty** | First-run: import CSV or create first sign. Filtered-empty: **names the active filters** and offers to clear them |
| **Loading** | Row skeleton matching the real grid at the remembered row count; filter bar and saved view stay interactive |
| **Error** | `SyStateBlock` in the grid area with trace ID, filters preserved, retry. Partial failure keeps loaded rows and marks the failed page |
| **Responsive** | ≥1280 three panes · 900–1279 inspector overlays · <900 read-only summary list, bulk actions hidden **with a stated reason** |
| **Accessibility** | `role=grid` with arrow navigation; selection count in a live region; status is glyph + label; sort direction announced; sticky headers do not trap focus |
| **Components** | `SyAppShell` · `SyEntityHeader` (collection) · `SyCollection` · `SyStatusBadge` · `SyEntityRef` · `SyField` (inline) · `SyMenu` · `SyDrawer` · `SyStateBlock` · `SyInspector` (multi-select) · `SyButton` · `SyMetric` |

---

### 13.2 Sign Editor — **DRAWN, CANONICAL**

| Field | Value |
|---|---|
| **Primary entity** | `SIGN (one)` — a single Sign, in a single language, at a specific revision |
| **Template** | L2 · detail |
| **URL** | `/l/:lang/signs/:id/:tab` (drawn: `/l/arsl/signs/SIGN-04812/definition`) |
| **Goal** | Bring one sign to a publishable standard: correct linguistic metadata, sound media, resolved review comments |
| **Secondary entities** | Media Assets + quality, Variants, Translations, Lessons that reference it, Review threads, Validation findings, AI suggestions |
| **Layout** | `SyAppShell` three-pane. **Canvas is single-column after A1.** Sidebar bound to a queue cursor |
| **Scope bar** | Language switcher · **QUEUE `7 of 37 in review` `J / K`** · Activity tray · avatar |
| **Sidebar** | **Walking selection** — source view · `7 of 200 · ~12,400 remaining` · entity list with lifecycle glyphs and positions · `J / K move · ⌘⇧R decide` |
| **Header** | Breadcrumb `ArSL / Vocabulary / Greetings / SIGN-04812` · title **Peace be upon you** · `SyStatusBadge` In Review · `rev 14 · @nadia · 2h ago` · actions **Request changes**, `⋯`, **Approve ⌘⇧R (disabled)** |
| **Blocked primary action** | Approve rendered with `control.disabled.*` + a banner: *"Approval is blocked: reference clip missing (`media.missing`)"* with a direct **Attach from library** fix link |
| **Tabs** | `SyTabSet`: Definition · Media `0` (danger) · Variants `3` · Usage `4` · History `14` · shortcut hint `1…5` |
| **Canvas — Definition** | Gloss (mono, required) · Display name (required) · **Description — ar-SA wrapped in `SySuggestion`** · Handshape / Movement / Location (mono selects) · **Reference media** panel (`required · none attached`, Upload / Pick from library, candidate clip with quality 48, `SyTimeline` with HUMAN / ✦ SUGG / LANDMARKS lanes, `[ ] frame · L loop · 0.25×`, gap note, **Request recapture**) |
| **AI suggestion (drawn)** | `✦ SUGGESTED` · `0.86 · thr 0.80 · translate-arsl 1.2.0` · **Accept ⌘⇧A** / Edit / **Reject ⌘⇧X** |
| **Inspector** | State · Validation — 1 blocking, 2 advisory · Usage · History · **Model view — recognition-arsl 2.4.0** (confidence 0.61 low; *"Either the clip is weak or the model has a gap. Diagnostic only, never a content error."*; **Add to capture worklist**) |
| **Save conflict** | **Field-level, not a lost-work dialog.** Per-field YOURS / THEIRS with **Keep mine** / **Take theirs**; *"nothing is discarded until you do"* |
| **Destructive** | Impact preview: soft delete, recoverable 30 days; lists lessons losing a reference (2 published), orphaned variants, media dropping to 0 usages, and that the released pack is unaffected. Actions: **Delete sign** / **Deprecate instead** / Cancel |
| **Empty** | New sign: only required fields, with duplicate detection running as the gloss is typed. Empty media tab states what a reference clip must show |
| **Loading** | Header title and status resolve first, then the active tab. **Never a full-screen spinner** |
| **Error** | Save conflict shows a field-level diff with keep-mine / take-theirs per field. Media failures are per-asset, not per-screen |
| **Bulk (within one sign)** | Accept all suggestions (itemised) · apply a variant across translations · replace an asset everywhere it is used |
| **Keyboard** | ⌘S save · ⌘↵ submit · ⌘⇧A / ⌘⇧X accept/reject suggestion · `[ ]` frame step · 1…5 switch tab · ⌘/ inspector · J/K next in queue |
| **Responsive** | Inspector docks ≥1280, overlays 900–1279, below 900 the editor is **read-only with review actions still available** |
| **Accessibility** | Media carries mandatory gloss and description; frame-step is keyboard-driven; suggestions announced as suggestions; unsaved state announced before navigation |
| **Components** | `SyEntityHeader` · `SyTabSet` · `SyField` · `SySuggestion` · `SyConfidence` · `SyTimeline` · `SyInspector` · `SyFindingList` (inline) · `SyEntityRef` · `SyDialog` · `SyButton` |

---

### 13.3 Media workspace — **BRIEF ONLY, NOT DRAWN**

| Field | Value |
|---|---|
| **Primary entity** | `ML ASSET` — clip, still or pose-only record with capture, quality and preprocessing state |
| **Template** | L1 / L5 · gallery + focus · `/data/assets` |
| **Goal** | Judge whether assets are usable — by a learner **and** by a model — and fix or replace the ones that are not |
| **Secondary entities** | Pose Track, Annotations, Signer, Capture device, Dataset splits, Signs and Lessons that use it, Augmentation lineage |
| **Workflow** | Filter by preprocessing state or quality threshold → open in focus view → frame-step the problem region → accept, correct or reject annotations → assign to a split or request recapture |
| **Empty** | First-run: upload or connect a capture session, **with the required metadata listed before upload begins**. Filtered-empty names the thresholds in play |
| **Loading** | Gallery tiles are placeholders at final aspect ratio; ingest stages stream in per asset **so the grid never reflows** |
| **Error** | Ingest failures are a **stage state on the asset**, with the failing stage, the error and a **resume-from-here** retry. Upload errors are per file, never per batch |
| **Bulk** | Re-extract landmarks · re-score quality · assign split · tag capture conditions · request recapture · export dataset manifest |
| **Keyboard** | Space play · `[ ]` frame · L loop region · X select · G group by signer or condition · ⌘⇧A accept all suggested annotations in view |
| **Responsive** | Gallery reflows by tile count; focus view unchanged at any width; below 900 playback and review only, no annotation editing |
| **Accessibility** | Landmark overlay **always has a table equivalent**; no autoplay; quality reasons are text rows; every clip requires gloss and description before use |
| **Components** | `SyCollection` (gallery) · `SyTimeline` · `SyPipeline` · `SyMetric` · `SySuggestion` · `SyInspector` · `SyStateBlock` · `SyMatrix` (coverage) · `SyMediaPlayer`\* · `SyPoseInspector`\* · `SyQualityScore`\* |

\* **uncontracted — this screen cannot be built without contracting them first.**

**Supporting model (Foundations §07) — the asset record, 5 field groups:**

| Group | Fields |
|---|---|
| IDENTITY | Asset ID (immutable) · Kind (clip/still/pose-only) · Language coverage (may be none — assets are cross-language) · Usage (signs, lessons, datasets) |
| TECHNICAL | Container, codec, duration, fps · Resolution, bitrate, colour range · Checksum, byte size · Derivative renditions and their status |
| CAPTURE | Signer ID (pseudonymous) + handedness · Capture device and lens · Lighting condition (studio / mixed / low) · Background type, camera angle, distance · Consent record and usage rights |
| ML | Pose track (2D/3D landmark series + producing model) · Hand landmark confidence, per-frame gaps · Annotations with provenance · Augmentation lineage (parent asset + transform chain) · **Split membership: train / val / test — mutually exclusive** |
| QUALITY | Frame quality (blur, exposure, occlusion, truncation) · Landmark completeness % · Composite score + reasons · Flags (hands leave frame, multiple people, cut mid-sign) |

**Ingest pipeline (7 stages):** Uploaded → Transcoded → Landmarks extracted → Quality scored → Auto-annotated *(optional; produces suggested annotations only)* → Indexed · **Failed** (any stage; asset stays visible with stage, error and a retry that **resumes rather than restarts**)

---

### 13.4 Model Registry — **BRIEF ONLY, NOT DRAWN**

| Field | Value |
|---|---|
| **Primary entity** | `MODEL VERSION` — immutable, with card, metrics, benchmarks and inference profile |
| **Template** | L2 / L7 · detail + matrix · `/models/:model/versions/:v` |
| **Goal** | Decide whether a model version is fit to ship, and to which channel and languages |
| **Secondary entities** | Model family, Evaluation runs, Dataset splits, Benchmarks, Device tiers, ML Packs, Releases, ML Studio experiment lineage |
| **Workflow** | Register from ML Studio → read the card → compare against the current baseline per split and per class → check inference on device tiers → qualify for languages → promote to a channel or yank |
| **Empty** | No versions: **explains the ML Studio registration contract** rather than offering an upload button Studio does not own |
| **Loading** | Card renders from metadata immediately; metric tables stream per split **with the split named while pending** |
| **Error** | A missing evaluation run is shown as **no-data with the run that would produce it, never as a zero**. Registration failures show the ML Studio payload error |
| **Bulk** | Compare n versions · run an evaluation across splits · qualify several languages at once · bulk-yank a prerelease line |
| **Keyboard** | X mark · C compare · Enter open · ⌘⇧E run evaluation · ⌘⇧P promote (guarded, names the channel) |
| **Responsive** | Metric tables scroll horizontally with a sticky version column; the matrix becomes a grouped list below 900px |
| **Accessibility** | Deltas carry sign and unit as text; per-class results are a **sortable table, not a heatmap only**; limitations section is required and is a real heading |
| **Components** | `SyEntityHeader` · `SyVersionList` · `SyMetric` · `SyMatrix` · `SyPipeline` (evaluation) · `SyInspector` · `SyStateBlock` · `SyDialog` · `SyModelCard`\* · `SyMetricTable`\* · `SyModelSelector`\* |

**Model card — mandatory sections (Foundations §08).** *A version with an empty limitations section **cannot be promoted past beta**. The gate is in the product, not in a review checklist.*

Intended use · Training data · Evaluation · Benchmarks · Inference profile · **Limitations & risks (mandatory, non-empty, human-written)** · Lineage

**Yank vs deprecate:** *"a yanked version is withdrawn from distribution but remains readable, because its evaluation numbers are still evidence. Nothing is ever deleted from the registry."*

---

### 13.5 Validation Center — **BRIEF ONLY, NOT DRAWN**

| Field | Value |
|---|---|
| **Primary entity** | `FINDING` — one rule outcome over one scope, **grouped by rule** |
| **Template** | L1 · queue · `/l/:lang/validate` |
| **Goal** | Get a scope to zero blocking findings, and keep warnings honest |
| **Secondary entities** | Rules, and the affected Signs, Assets, Lessons, Datasets and Releases **as references** |
| **Workflow** | Choose scope (language, pack, dataset, release) → run or read the last run → work blocking first → auto-fix where offered, jump-to-fix where not → acknowledge warnings with a note → re-run |
| **Empty** | Clean scope: **states what was checked, how many rules ran and when** — *"an empty list with no context reads as a broken screen"* |
| **Loading** | Rules report as they complete, so long checks never hold up short ones; each row shows its own running state |
| **Error** | A rule that times out is reported as **partial with the entities it did cover, never silently omitted** |
| **Bulk** | Auto-fix all instances of a rule (with a stated count) · acknowledge warnings with one note · assign a rule's findings to an owner · export |
| **Keyboard** | ⌘⇧V run · J/K between rules · Enter expands affected entities · A acknowledge · F auto-fix (confirms scope first) |
| **Responsive** | Rule groups collapse to a severity-ordered list below 1280; auto-fix stays available, jump-to-fix opens read-only below 900 |
| **Accessibility** | Severity is the first spoken token and never colour-only; auto-fix states what it will change before running; results region is a landmark |
| **Components** | `SyEntityHeader` (scope as subject) · `SyFindingList` · `SyEntityRef` · `SyStateBlock` · `SyDialog` (auto-fix confirm) · `SyMetric` |

**Rule catalogue (15, Foundations §10) — product data, not UI:**

| Rule ID | Severity | Scope | Detects | Resolution | AI |
|---|---|---|---|---|---|
| `media.missing` | BLOCKING | Sign | Published sign has no reference clip | Manual — capture or attach | |
| `media.gloss_missing` | BLOCKING | Asset | Clip has no written gloss or description | Manual — accessibility requirement | |
| `ref.broken` | BLOCKING | Lesson | Lesson references a deleted or unresolvable sign | Auto — remove or replace reference | |
| `ref.deprecated` | WARNING | Lesson | Reference points at a deprecated sign | Auto — swap to declared replacement | |
| `translation.missing` | WARNING | Sign | No translation for a locale the pack declares | AI draft, human accept | ✦ |
| `meta.invalid` | BLOCKING | Sign | Handshape or movement code outside the language's notation set | Manual — bounded choice | |
| `sign.orphan` | WARNING | Sign | Published sign referenced by no lesson and no category | Manual — categorise or deprecate | |
| `sign.duplicate` | ADVISORY | Sign | Near-duplicate by gloss, phonology or pose | Manual — merge or dismiss | ✦ |
| `asset.quality_low` | WARNING | Asset | Composite quality below the language threshold | Manual — recapture or override with note | ✦ |
| `asset.landmarks_gap` | WARNING | Asset | Landmark completeness under 90% or hands leave frame | Manual — recapture | ✦ |
| `dataset.split_leak` | BLOCKING | Dataset | Same signer or augmentation lineage in train and test | Auto — reassign split | |
| `dataset.coverage_gap` | ADVISORY | Dataset | Category or condition under-represented for the target model | Manual — capture worklist | ✦ |
| `model.incompatible` | BLOCKING | Release | Model version does not cover a language in the pack set | Manual — change pairing | |
| `pack.size_budget` | WARNING | Release | Pack exceeds the offline download budget | Manual — reduce scope or rendition | |
| `review.stale` | BLOCKING | Sign | Content changed after approval | Manual — re-review | |

**Anti-noise defences (canonical):** warnings must be acknowledgeable **in bulk with a note**; any rule producing results on **more than 30% of a scope** is flagged as **miscalibrated to an Administrator** rather than shown to every editor. *"A rule nobody can clear is worse than no rule."*

---

### 13.6 Release Composer — **BRIEF ONLY, NOT DRAWN**

| Field | Value |
|---|---|
| **Primary entity** | `RELEASE` — a pack set, a channel, a compatibility range and a rollout |
| **Template** | L4 · pipeline · `/publish/releases/:v` |
| **Goal** | Ship a known-good pack set to a channel, **and be able to undo it in one action** |
| **Secondary entities** | Language Packs, ML Packs, Model Versions, Validation findings, Signing keys, Device populations, Previous releases |
| **Seven steps** | 01 **Compose** (diff against last release shown continuously, not at the end) · 02 **Validate** (blocking stops here; advisories acknowledged with a note) · 03 **Build** (deterministic, reproducible; size budget enforced) · 04 **Sign** (unsigned artefacts cannot reach beta or stable) · 05 **Stage** (compatibility re-checked against live device populations) · 06 **Roll out** (percentage with a hold; health signals on the same screen) · 07 **Roll back** (one action, always available, no rebuild) |
| **Empty** | No releases yet: explains channels and what a first release requires, with a link to the validation state that would allow it |
| **Loading** | Each stage reports its own progress; **resumable after a reload because stage state lives in the release, not the session** |
| **Error** | A failed stage keeps the release, names the stage, offers resume-from-here. **Signing failures never leave a half-signed artefact in a channel** |
| **Bulk** | Include/exclude whole categories, languages or model versions · acknowledge all warnings with one note · promote several channels in a controlled order |
| **Keyboard** | ⌘⇧B build · ⌘⇧P promote · ⌘⇧H hold · ⌘⇧Z roll back (all guarded by a dialog naming the release and exposure) |
| **Responsive** | Step list becomes a horizontal stepper below 1280; rollout controls are desktop-only, **with an explicit note rather than a broken control** |
| **Accessibility** | Irreversible stages state so before the action; rollback is a **labelled destructive button, never an icon**; rollout percentage is text plus a decorative bar |
| **Components** | `SyEntityHeader` · `SyPipeline` · `SyFindingList` (gate) · `SyMatrix` (compatibility) · `SyVersionList` (history) · `SyMetric` (size budget) · `SyDialog` · `SyRolloutControl`\* · `SyToast`\* · `SyModelSelector`\* |

**Channels (4):**

| Channel | Audience | Promotion | Signing |
|---|---|---|---|
| `dev` | Internal builds only | Automatic on every successful pack build | Unsigned, device must be enrolled |
| `beta` | Opt-in testers | Manual from dev; requires zero blocking validation | Signed with the beta key |
| `stable` | All users | Manual from beta; requires an approved release record and a staged rollout | Signed with the production key |
| `lts` | Institutional deployments | Explicit designation; content updates but **not** model major versions | Signed, extended support window |

**Compatibility matrix cell states (4):** `compatible` ✓ · `degraded` ! · `incompatible` ✕ · **`untested` ?** — *"Untested is the important one — most matrices lie by leaving it blank, and a blank cell reads as safe."*

---

### 13.7 Operational Health — **BRIEF ONLY, NOT DRAWN**

| Field | Value |
|---|---|
| **Primary entity** | `OPERATIONAL STATUS` of a scope — *"the one screen whose subject is a state rather than a record, which is why it is capped at six figures"* |
| **Template** | L6 · overview · `/health?scope=:lang` |
| **Goal** | Answer one question in under a minute: is this scope in a shippable state, and if not, what is the next action |
| **Workflow** | Read six cards → open the one that is red → land in that workspace **already filtered** → fix → return and watch the figure move |
| **Six cards (canonical)** | Dataset coverage · Validation health · Pending reviews · Content completeness · Model readiness · Publishing health |
| **Card anatomy** | Title · state dot · figure · sub-line **with denominator** · trend · **the one action that would move it**, as the card's link target |
| **Rules** | Every figure carries its denominator (*"78% alone is a rumour; 78% of 62 categories is a fact"*) · every card names one action · scope follows the scope bar · no trend line without a labelled axis, no colour without a word · **six cards is the cap** |
| **Bulk** | **None. This screen commands nothing directly — it routes.** |
| **Empty** | New scope: cards render with a no-data state naming what must exist before a figure is meaningful. **Never a zero that reads as a failure** |
| **Loading** | Cards resolve independently, each keeping its title and denominator visible while its figure loads |
| **Error** | A card that cannot compute says so with a retry, and **does not fall back to a stale number without labelling it stale** |
| **Keyboard** | 1…6 open a card's underlying list · R refresh · ⌘L change scope |
| **Responsive** | Three columns → two → one, in priority order. **Works fully below 900px because it is read-and-route only** |
| **Accessibility** | Every figure carries its denominator in the accessible name; each card is a link with a descriptive name; no colour-only status; trends stated in words |
| **Components** | `SyEntityHeader` (scope) · `SyMetric` · `SyStateBlock` · `SyEntityRef` · `SyPalette` · `SyHealthCard`\* |

**Learner analytics:** explicitly deferred to a **second tab** in this domain, joined to a release identifier. *"A team deciding whether to publish should not be reading engagement charts."*

---

### 13.8 Global Search / Command Palette — **PARTIALLY DRAWN** (specimen in Foundations §11 and Design System §Overlays)

| Field | Value |
|---|---|
| **Component** | `SyPalette` |
| **Rationale** | *"At a few hundred entities, navigation is enough. At fifty thousand across a hundred languages, search **is** the navigation."* |
| **Invocation** | `⌘K` scoped · `⇧⌘K` global (all languages) |
| **Six modes** | — search (fuzzy over entities in scope) · `>` actions · `@` people · `#` categories & datasets · `:` versions · `?` help & rules |
| **Sections drawn** | ACTIONS · PINNED (`⌘1`, `⌘2`) · RECENT |
| **Empty query** | Shows **pinned items then recents** — *"the palette is useful before a keystroke"* |
| **Ranking rules** | Scoped results first, cross-language below a **labelled divider**, never silently mixed · **your own recent edits outrank global popularity** · destructive and approval-gated actions are labelled and **never the default highlighted row** · actions the current role cannot perform are **shown but disabled with the reason** |
| **States** | idle, typing, results, no results, recents, scoped-vs-global, executing |
| **Accessibility** | `combobox` pattern; `aria-activedescendant` listbox; focus trapped and restored on close |
| **Footer copy** | `⌘K scoped · ⇧⌘K all languages · > actions · @ people · # facets · : versions` |
| **Related** | `SyPinnedItems`\* (registered, uncontracted) supplies pinned entities and saved views |

---

## 14. HIGH-FIDELITY SCREEN INVENTORY

| # | Screen | Workspace | Status | Purpose | Layout hierarchy | Components | Screen-specific behaviour |
|---|---|---|---|---|---|---|---|
| 1 | **Vocabulary** | Content | **DRAWN — CANONICAL** | Move a batch of signs toward publishable state | ScopeBar → [Rail 60 · Sidebar 216 · Content · Inspector 292]; Content = EntityHeader → FilterBar → BulkBar → GridHeader → Groups → Footer | `SyAppShell` `SyEntityHeader` `SyCollection` `SyStatusBadge` `SyEntityRef` `SyField` `SyMenu` `SyDrawer` `SyStateBlock` `SyInspector` `SyButton` `SyMetric` | 9-column default set; category grouping semantics; count copy; four saved views |
| 2 | **Sign Editor** | Content | **DRAWN — CANONICAL** | Bring one sign to a publishable standard | ScopeBar → [Rail 60 · Queue sidebar 216 · Canvas (single column) · Inspector 292]; Canvas = EntityHeader → BlockBanner → TabSet → Fields → Suggestion → Media panel | `SyEntityHeader` `SyTabSet` `SyField` `SySuggestion` `SyConfidence` `SyTimeline` `SyInspector` `SyFindingList` `SyEntityRef` `SyDialog` `SyButton` | Five tab names + order; ArSL phonology fields; conflict dialog copy; "Model view" title |
| 3 | Contextual menu | shared | DRAWN (specimen) | One menu, every entity | `SyMenu`, 8 groups, fixed order | `SyMenu` | none — contents come from the entity action registry |
| 4 | Bulk edit drawer | shared | DRAWN (specimen) | Uniform change across a selection | `SyDrawer` → checkboxed fields → Apply to n | `SyDrawer` `SyField` `SyButton` | mixed-value copy |
| 5 | Completion toast | shared | DRAWN (specimen) | Report a completed batch with undo | inline banner + `Undo ⌘Z` | `SyToast`\* | none |
| 6 | Save conflict | Sign Editor | DRAWN (specimen) | Resolve a concurrent edit per field | `SyDialog` → per-field YOURS/THEIRS | `SyDialog` `SyButton` | per-field copy |
| 7 | Impact preview | shared | DRAWN (specimen) | State consequences before destruction | `SyDialog` → IMPACT block → 3 actions | `SyDialog` `SyEntityRef` `SyButton` | none |
| 8 | Command palette | Global | DRAWN (specimen) | Find, act, jump | `SyPalette` → ACTIONS / PINNED / RECENT | `SyPalette` | none |
| 9 | Activity tray | Global | DRAWN (specimen) | Watch long operations from anywhere | scope-bar tray → job rows with progress | `SyCollection` in overlay | none |
| 10 | Validation panel | Validation | DRAWN (specimen) | Pre-publish gate | `SyFindingList` gate variant | `SyFindingList` | rule wording |
| 11 | Asset inspector | Media | DRAWN (specimen) | Judge an asset's ML usability | quality score + reasons + capture metadata + 3 actions | `SyMetric` `SyInspector` | quality reason names |
| 12 | Coverage view | Media | DRAWN (specimen) | Find capture gaps | labelled bars with counts → capture worklist | `SyMatrix` `SyMetric` | target-per-category |
| 13 | Model version list | Model Registry | DRAWN (specimen) | Compare versions on one split | `SyVersionList` table | `SyVersionList` `SyMetric` | metric column choice |
| 14 | Compatibility matrix | Release | DRAWN (specimen) | LP × ML pack states | `SyMatrix`, 4 cell states | `SyMatrix` | axis labels |
| 15 | Rollout control | Release | DRAWN (specimen) | Ramp, hold, roll back | bar + % + Hold + Roll back | `SyRolloutControl`\* `SyMetric` | percentage steps |
| 16 | Health cards | Health | DRAWN (specimen) | Route to the work | 6-card grid | `SyMetric` `SyHealthCard`\* | which six figures |

**Screens 3–16 are component specimens drawn inside the Foundations/Design System documents, not full workspace screens.** Only **Vocabulary** and **Sign Editor** are complete, canonical, full-fidelity workspaces.

---

## 15. DESIGN RULES

### 15.1 Product philosophy — 7 tenets (each with its stated cost)

| # | Tenet | Cost accepted |
|---|---|---|
| T1 | **The content model is the product** — every screen is a view onto the model, and the model is designed before any view | Slower to add ad-hoc features that do not fit the graph |
| T2 | **Authoring is a session, not a visit** — optimise for the second hour: keyboard paths, bulk operations, resumable state, no modal dead-ends | First-time users need real documentation, not a tour |
| T3 | **Nothing ships unreviewed** — draft, review, approval and publish are states of the model itself | Every write path carries versioning overhead from v1 |
| T4 | **Content and models evolve separately** — a retrained model must never require a content republish | Compatibility ranges must be expressed and tested explicitly |
| T5 | **Accessibility is a domain requirement** — keyboard, contrast, captioning and reduced motion are acceptance criteria | Some dense visual shortcuts are unavailable to us |
| T6 | **AI proposes, a human disposes** — AI never writes to the model unattended; every machine-originated value carries provenance and confidence, and is reversible | Suggestion review is real work, so accepting and rejecting must be almost free |
| T7 | **Media is training data** — a clip is a dataset record judged on whether a model can learn from it | Upload is a pipeline with failure states, not a file copy |

**Explicit non-goals:** not an admin dashboard · not a consumer surface · not a replacement for ML Studio · not a general CMS.

### 15.2 Design principles P1–P10 (with what each forbids)

| # | Principle | Forbids |
|---|---|---|
| P1 | Density with air where it counts | Oversized cards, 24px paddings in data views, hero sections inside the app |
| P2 | One primary action per surface | Two filled buttons in one toolbar; ambiguous verb pairs like Save and Apply |
| P3 | Show state, always | Lists that show only a name; edits with no indication of what is unsaved |
| P4 | Destruction is reversible or explained | "Are you sure?" dialogs with no information in them |
| P5 | **Colour is never the only signal** | Red/green-only status dots; legends that map colour to meaning alone |
| P6 | The keyboard is a first-class input | Drag-only reordering; hover-only affordances; unreachable focus traps |
| P7 | The system absorbs new features | Bespoke page layouts; one-off components that duplicate an existing pattern |
| P8 | **Machine output is labelled and reversible** | Silent AI writes; confidence as a colour bar with no number; suggestions that cannot be undone |
| P9 | **Screens are workspaces, not pages** | Dashboard pages that summarise several unrelated things; screens whose title is a noun nobody can open, edit or publish |
| P10 | **Every metric is a door** | Dashboard tiles that cannot be clicked; percentages with no denominator; charts nobody can act on |

### 15.3 Editorial lifecycle — 6 states

`Draft` → `In Review` → `Changes Requested` → `Approved` → `Published` → `Deprecated`

| State | Glyph | Actor | Meaning |
|---|---|---|---|
| Draft | `○` | Editor | Private to the workspace. Incomplete by definition; validation runs but never blocks |
| In Review | `◐` | Reviewer | Assigned and locked to the author for structural edits. Comments open |
| Changes Requested | `↩` | Editor | Carries the reviewer's unresolved threads. Returning to review requires each resolved |
| Approved | `✓` | Reviewer | Publishable. Editing an approved entity moves it back to Draft and records why |
| Published | `●` | Publisher | Included in at least one released pack. **Immutable in that pack forever** |
| Deprecated | `—` | Publisher | Still resolvable by old releases, excluded from new packs, replacement recorded |

**Transitions with guards (9):**

| From | To | Actor | Guard | Effect |
|---|---|---|---|---|
| Draft | In Review | Editor | Required fields present; no blocking validation | Assigns a reviewer, opens a review record, freezes structural edits |
| In Review | Changes Requested | Reviewer | At least one comment thread | Notifies author; threads must be resolved to resubmit |
| In Review | Approved | Reviewer | **Zero blocking validation results at decision time** | Stamps approver and revision; entity becomes pack-eligible |
| Changes Requested | In Review | Editor | All threads resolved | Same reviewer by default; re-runs validation |
| Approved | Published | Publisher | Included in a signed release that passed pack validation | Records pack version; entity revision frozen in that pack |
| Approved | Draft | Editor | **Reason required** | Approval is voided, not hidden. Prior approval stays in history |
| Published | Draft | Editor | Creates a new revision; the published revision is untouched | Entity shows both a live and a working revision |
| Published | Deprecated | Publisher | Replacement declared or explicitly none | Excluded from future packs; references flagged in validation |
| any | **Stale review** | System | Content changed after a review decision | **Not a state — a badge on the review record.** Forces re-review before publish |

**Rules that hold everywhere:** a published revision is never mutated · approval is bound to a **revision**, not an entity · bulk transitions are permitted, logged individually, with a single undo for the batch · **state is per language**.

**Why not a configurable workflow engine (verbatim):** *"Configurable workflows are the most requested and most regretted feature in tools of this class: every screen must then handle arbitrary states, so nothing can be designed precisely… If a customer genuinely needs a seventh state, it is added to the system — deliberately, once, for everyone."*

### 15.4 AI rules — 4, non-negotiable

| Rule | Statement |
|---|---|
| **RULE 1** | **Never a silent write.** Model output enters as a suggestion. A human decision turns it into content. No exceptions, including bulk operations |
| **RULE 2** | **Always attributed.** Every machine-touched value records the model version, the confidence at the time, and who accepted it |
| **RULE 3** | **Confidence is a number.** Shown numerically with its threshold and its reasons. Never a bare colour, never a vague "high" |
| **RULE 4** | **AI cannot block.** Probabilistic findings are advisory. **Only deterministic rules can stop a publish** |

**AI is not a rail entry.** *"It appears inside the work… A separate 'AI' section would be the wrong architecture: it would put the assistance somewhere other than where the work happens."*

**Provenance — a field on every value (4 levels):**

| Level | Glyph | Meaning |
|---|---|---|
| Human | `◆` | Authored by a person. The default and the only state needing no annotation |
| Suggested | `✦` | Model output awaiting a decision. **Never counted as content; excluded from packs and from training sets** |
| Accepted | `✦✓` | Model output a human approved unchanged. Records model version and confidence at accept time |
| Corrected | `✦✎` | Model output a human edited. **The most valuable training signal in the system — the delta is retained** |

**Seven AI capability surfaces:** assisted annotation · AI validation · quality scoring · coverage analysis · recognition confidence · translation drafting · duplicate detection.

### 15.5 Domain model — four planes

`CONTENT` (authored per language; versioned as Language Packs) · `DATA` (media, pose, annotations, datasets, splits; cross-language) · `MODELS` (trained in ML Studio, registered and evaluated here) · `DISTRIBUTION` (releases bind a pack set to a channel with a compatibility range and a rollout)

**Plus `Job`** — cross-plane.

**Model rules:**
- **1:N scoped** — everything in Content is scoped to exactly one Language. Nothing is global except Media Assets and Model Packs
- **Reference, not ownership** — Lessons *reference* Signs. Deleting a Sign never silently deletes lesson content; it surfaces an impact list
- **Categories are facets** — a Sign can carry several. *"Modelling them as a single folder tree is the classic CMS trap"*
- **Media is deduplicated** — usage count is shown before any destructive action
- **Versioning is per entity and per pack** — history for authors, snapshots for devices
- **Assets carry ML metadata**
- **Annotations are attributed**
- **Models never point at content** — pairing happens only in a Release
- **A Job is an entity**

**Challenged assumption (verbatim):** *"The brief implies Lessons contain Signs. Modelling that as ownership is the mistake that forces a redesign in year three… Lessons therefore hold ordered references to signs plus lesson-local pedagogy. Consequence to accept: deleting a sign is a graph operation with an impact preview, never a row delete."*

### 15.6 Navigation

**Chosen frame:** product rail + scope bar + contextual sidebar. Two alternatives were considered and **rejected** (flat sidebar with language as a filter; language-as-workspace).

**Rail domains (7):** Content · Data · Models · Validate · Publish · Health · Admin

**URL contract (12 routes):** every list state (filters, sort, columns, page) is URL-encoded so a view can be pasted into a review comment. **Saved views are named URLs.**

**Keyboard model — the product-wide grammar:**

`⌘K` palette · `⇧⌘K` global search · `⌘L` scope · `G then V` go to · `J`/`K` move · `X` select · `⇧J` extend · `E` edit · `⌘S` save · `⌘↵` submit · `/` filter · `?` shortcuts · `Esc` dismiss topmost · `⌥1…7` rail · `⌘⇧A` accept suggestion · `⌘⇧X` reject · `⌘P` pin · `⌘⇧V` validate · `[` `]` frame-step · `⌘⇧R` review decision · `⌘J` activity tray · `⌘\` sidebar · `⌘/` inspector · `F6` cycle panes

**Rule:** *"any action reachable by mouse in two clicks must be reachable by keyboard in three keys or fewer, and the command palette is the discovery surface for all of them. **No shortcut is the only path to an action.**"*

### 15.7 Interaction rules (20, each implemented once and shared)

Selection is a predicate · Bulk edit semantics · Walk selection · Queue continuity · Keyboard grammar · Inline editing · Inspector ownership · Lifecycle transitions · Cardinality decides sync vs job · Job is an entity · Optimistic boundary · Validation blocking · AI provenance · Contextual menu · Command palette · Virtualisation · Server-side aggregation · Group-by constraint · Absence states · Destructive actions

*Full definitions and screen dependencies: Handoff Audit §05.*

### 15.8 Contextual menu — eight groups, one fixed order

`Open` → `Edit` → `Relate` → `Lifecycle` → `Validate` → `Duplicate` → `Copy link` → **`Destructive` (last)**

Applied identically to signs, assets, lessons, releases and datasets. *"Contents come from the entity's action registry, so a new action appears in the menu, the palette and the bulk bar at once. No per-screen menu code to drift."*

### 15.9 Overlay selection rule

| Overlay | When |
|---|---|
| `SyMenu` | Pick an action |
| `SyDrawer` | Do work beside context |
| `SyDialog` | A decision that must not be missed |
| `SyPalette` | Reach anything |

**Hard rule:** *"Never a modal for work that takes more than one decision — that is a drawer or a workspace."* Maximum overlay stack depth: **2**.

### 15.10 Layout and grid

- Shell panes are fixed-width and resizable, **persisted per user**
- Content column: 12-column fluid grid, 16px gutters, 1200px comfortable maximum for prose; **data views are full-bleed**
- Vertical rhythm 4px
- **All spacing uses logical properties** (`inline-start`, not `left`) so RTL is a document attribute, not a stylesheet fork

---

## 16. UNSPECIFIED BY DESIGN

*Nothing in this section may be filled from general UI convention.*

### 16.1 Live conflicts between canonical documents — DESIGN MUST DECIDE

| # | Conflict | Document A | Document B | Impact |
|---|---|---|---|---|
| **C1** | **Compact row height** | Foundations §15: `28px` | Design System density prop: `26px` | Blocks `SyCollection` density modes |
| **C2** | **Reclassified component count** | Audit §03 and this document: **4** | Enumerating them yields **5**: `SyPackBuilder` · `SyReleaseComposer` · `SyCoverageMatrix` · `SyRuleResult` · `SyProvenanceTag` | Counts only. No implementation impact |

*Not resolved here. Both documents are canonical; the design owner must pick one. C2 was discovered while generating the JSON inventory — the likely cause is that `SyPackBuilder` and `SyReleaseComposer` were counted as one line because both map to `SyPipeline`.*

### 16.2 Tokens

- **Dark counterparts for 10 light tokens:** `accent.hover` · `accent.border` · `accent.ai.border` · `status.neutral.border` · `status.success.border` · `status.warning.border` · `status.danger.border` · `status.info.border` · `viz.stroke.default` · `viz.stroke.ai`
- **Focus ring tokens** — the rule is stated in prose (2px accent ring, 2px offset) but there is no `focus.ring.color` / `.width` / `.offset` trio *(audit F9)*
- **Dark elevation values** — dark expresses elevation by surface lightness, but no values are given
- **`radius.lg`** — defined, never drawn *(audit F8)*
- **`radius.full`** — appears once on an avatar, not referenced by any component contract *(audit F8)*
- **Motion applied** — the five motion tokens are defined and **never exercised** on any drawn component *(audit F10)*
- **Dark theme rendering** — the token table exists; **no component or screen has been drawn in dark** *(audit F10)*
- **Primitive tier** — the three-tier model names `primitive → semantic → component`, but **no primitive ramp is enumerated**; only the semantic layer is defined

### 16.3 Components

- **17 registered components have no contract**: `SyTreeNav` `SyScopeBar` `SyMediaPlayer` `SyMediaPicker` `SyModelSelector` `SyPoseInspector` `SyQualityScore` `SyDatasetSplitEditor` `SyModelCard` `SyMetricTable` `SyRolloutControl` `SyReviewPanel` `SyDiffView` `SyPinnedItems` `SyHealthCard` `SyToast` `SyInlineBanner`
- **Dark-theme behaviour** for every component
- **Component tokens tier** — the naming convention allows `table.header.fg`-style component tokens; **none are enumerated**

### 16.4 Screens

- **Five workspaces exist as briefs only** and have never been drawn: Media, Model Registry, Validation Center, Release Composer, Health. *A brief is not a design.*
- **Duplicate merge** — see §8. No UI exists and none may be invented
- **Variant comparison** — *"Partly covered by SyMediaPlayer's side-by-side mode. Needs the shared transport to be specified."*

### 16.5 Behaviour

- **Job retention period**, tray maximum row count, mid-run cancellation
- **Approximate count threshold (10,000)** — stated, but flagged as *"currently a guess"*; needs a real dataset *(open decision O7)*
- **Walk working-set cap (~200)** — stated, but *"should come from how many decisions a reviewer actually makes in a sitting"* *(open decision O8)*
- **Sign variants** — modelled as children of a sign; *"If variants turn out to need independent lifecycles and review, this becomes a peer relationship. Needs a linguist to settle before build."*
- **Cross-language work** — the scope bar's *All languages* mode is the escape hatch, *"but it is untested"*
- **Permissions** — sketched at role level only. *"Field-level permissions, if required, will pressure the inspector's layout."*
- **Search ranking weights** — ordering principles stated; weights are not
- **Debounce interval** for duplicate detection
- **Virtualisation overscan**

### 16.6 Documentation debt

- **F11 — the documents still paint raw hex.** The 27 tokens added to close F3/F3b/F5 exist in §13, but the drawn specimens still use the literals they were drawn with. *"The token table is the source of truth and the drawings are illustrations of it, not proof."*

---

## 17. MACHINE-READABLE INVENTORY

See **`sayva-studio-design-inventory.json`** alongside this file.

Requested shape, delivered with four additional keys the extraction required:

```json
{
  "$meta": { "authoritativeSources": [], "conflictRule": "…", "counts": {} },
  "foundations": [],                        // 16
  "tokens": [],                             // 93
  "components": [],                         // 22 contracted
  "componentsRegisteredNotContracted": [],  // 17  ← added
  "componentsReclassified": [],             // 5   ← added
  "patterns": [],                           // 8
  "principles": [],                         // 10  ← added
  "workspaceRecipes": [],                   // 8
  "screens": [],                            // 16 (2 canonical, 14 specimens)
  "rules": [],                              // 20
  "accessibility": [],                      // 27
  "openDecisions": [],                      // 9 (incl. 2 conflicts)
  "unspecifiedByDesign": []                 // 18  ← added
}
```

**Why four keys were added.** Collapsing registered-but-uncontracted components into `components` would imply they are implementable; they are not. Collapsing reclassified entries would lose the record that `SyPackBuilder` is not a component. `principles` (P1–P10) are constraints a reviewer holds a PR against, distinct from `rules`, which are interaction behaviours implemented once and shared. `unspecifiedByDesign` is the machine-readable form of §16 and is the most important key for a planner: **it is the list of things that must not be filled from convention.**

Every entry carries a `source` field naming the document and section it was extracted from, and `status` where applicable (`canonical` · `canonical-drawn` · `brief-only` · `component-specimen` · `registered-not-contracted` · `unspecified` · `conflict`).

---

## 18. FINAL HANDOFF RULE

This document is **extraction-first**. Every value, rule and phrase above is copied from a canonical Sayva Studio design document. Where a `⟨from design⟩` placeholder exists in a Phase 1 plan, it can be replaced with evidence from here.

**Three things this handoff will not do:**

1. **It will not fill a gap.** Anything the design has not decided appears in §16 as UNSPECIFIED BY DESIGN. Filling one from convention is a design change and must go back to design.
2. **It will not resolve a conflict.** C1 (row height 28 vs 26) is recorded, not decided.
3. **It will not promote screen-specific behaviour into the system.** §12 lists, per screen, what must stay local.

**The Claude Design project remains authoritative.** If this document and a source document disagree, the source document wins and this document is wrong.

---

### Status summary

| Area | State |
|---|---|
| Design foundation | **Stable** — Foundations v0.2, 17 sections |
| Tokens | **85** — 41 light colour, 31 dark colour, plus type, spacing, radius, elevation, motion, breakpoints |
| Component contracts | **22 of 39 named** — 22 contracted across 18 articles, 17 registered without contracts, 5 reclassified as configurations (C2) |
| High-fidelity screens | **2 of 7** — Vocabulary and Sign Editor canonical; five briefs |
| Accessibility | **Specified** — 26 checklist items with verification methods; RTL, dark and motion unverified |
| Open decisions | **9 total** — 4 named (O1, O3, O7, O8), 3 carried from Foundations §17 (variants modelling, cross-language, field-level permissions), 2 conflicts (C1, C2). None blocks Phase 1 except C1 |
| Live conflicts | **2** — C1 compact row height (blocking), C2 reclassified count (housekeeping) |
| Ready for Phase 1 reconciliation | **Yes**, for the scope in Handoff Audit §08 |
