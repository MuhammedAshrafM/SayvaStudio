# Design Commission — Temporary Pre-Shell Workspace Entry

**Status:** Commission · not yet answered
**For:** the Claude Design project — *Design foundations review* (`d9a9cd38-f02e-4baf-8fff-4ff9f808b422`)
**Raised by:** the Open decision closure, 2026-10-03 — OD-3, opening a Project leads to a temporary pre-shell Workspace Entry
**Governed by:** [ADR-004](../adr/ADR-004-project-management-is-pre-shell.md) **WS-05** — the surface sits **before** `SyAppShell` — and [ADR-005](../adr/ADR-005-opening-a-project-the-workspace-url.md), the workspace URL

---

## What this document is, and is not

This is a **request to design**, not a design.

Opening a Project from the Picker now has a destination: a temporary pre-shell **Workspace Entry**, reached at `/workspace/{projectId}`. Where it sits, what it excludes and how its URL behaves are ruled. What it looks like and says are not. The canonical design has no section for it, and the repository cannot close that gap on its own. `docs/design-system/README.md` marks the vendored sources **"Do not edit"**; the handoff states *"**It will not fill a gap.** … Filling one from convention is a design change and **must go back to design**"*; and the design's own **AC13** fails any component, colour, shadow, radius or interaction pattern with no design source.

Every section below is in one of two states, as in [the Project Picker commission](./phase-2-project-picker-design-commission.md):

- **FIXED** — already determined by a ruling or a canonical source, cited. Design confirms it rather than deciding it.
- **UNSPECIFIED BY DESIGN** — genuinely open. Design decides. Nothing here proposes a value.

No visual design, layout, copy, density value or interaction detail is proposed anywhere in this document. Where one is needed, the gap is named instead.

**Deliverables requested**, in the form Screens §04 already uses — a specified-not-drawn section, or an addition to §04:

1. The Workspace Entry's structure.
2. How the Project's identity, its name, is presented.
3. The zero-Language state.
4. The loading state and its accessible loading label.
5. The can't-read error state.
6. All copy the surface needs beyond the two strings already fixed.
7. Focus behaviour on arrival.
8. Responsive behaviour, within the temporary surface's boundaries.

Plus whatever component contracts it turns out to require — expected to be none.

---

## 1. Purpose

**FIXED.** The Workspace Entry shows the author that a Project is open, at its workspace URL, until the shell exists (ADR-004 WS-05). It is temporary: it is **replaced by the shell** when the shell is designed and built.

**UNSPECIFIED BY DESIGN** — anything it offers beyond showing that the Project is open. Section 9's exclusions bound the answer.

## 2. Entry and exit

**FIXED.**

- **Entry** is `/workspace/{projectId}` and nothing else (ADR-005 OP-01). It is reached by `Open` in the Picker once the Project has been read successfully (OP-08), and equally by a refresh, browser history, a bookmark, a copied URL or the browser restoring its tabs (OP-04). Each browser tab identifies its own Project (OP-03).
- The URL is resolved on every request. A request for a Project that is *not here* never renders this surface: it returns to `/`, where the Picker announces **"Can't find that project"** (OP-08).
- **Exit: no return control.** The Workspace Entry has **no Back to Projects button, link, menu item or keyboard shortcut** (OD-3). Returning to the Picker is by navigating to `/`, which always shows the Picker. No last-opened Project is remembered (OP-04).

**UNSPECIFIED BY DESIGN:** nothing in this section. Design is asked not to add a return affordance.

## 3. Structure

**FIXED — what it is not.** Not `SyAppShell`: no rail, no scope bar, no sidebar, no inspector, and no pane model (WS-05).

**UNSPECIFIED BY DESIGN:** the surface's structure — its landmarks and heading structure, what is shown, and in what order. The Picker's §10 precedent, a single named `main` landmark, is available as a precedent and not as a requirement.

## 4. Project identity

**FIXED.** It shows the opened Project's identity, its **name** (WS-05). The data available is `openProjectUseCase`'s `ProjectView`: `id`, `name`, `schemaVersion`, `state`, `createdAt`, `updatedAt`, `tags`, and `notes` when present. Screens §04 already records that a UUID *"is not author-facing"*, and that no lifecycle state is shown because `Created → Active` has no trigger.

**UNSPECIFIED BY DESIGN:**

- How the name is presented.
- Whether anything else from that data is shown. A lifecycle state is excluded (§9).

## 5. The zero-Language state

**FIXED.** A Project with zero Languages is **valid** (OD-2, ADR-005 OP-06), and in Phase 2 every Project has zero. The Workspace Entry **supports** that state (WS-05). It neither creates nor lists Languages.

**UNSPECIFIED BY DESIGN:**

- How the state is shown, and whether it uses one of `SyStateBlock`'s six states. Its contract says *"Every non-populated state, anywhere"*; whether this is one is for Design to say.
- Its copy.

Its action, if any, cannot create a Language and cannot return to the Picker.

## 6. Loading

**FIXED.** The Project is resolved on every request (OP-02). If a loading state is shown, `SyStateBlock`'s `loading` state is the contracted vocabulary, and it is a skeleton, not a spinner.

**UNSPECIFIED BY DESIGN:**

- Whether a loading state is shown.
- If one is, its **accessible loading label**. The Picker's label, "Studio is looking in {root}", names the Picker's own scan and is not assumed to carry over.

## 7. The can't-read error

**FIXED** (OD-6, OD-8; ADR-005 OP-07, OP-08; ADR-003 SR-10, SR-11):

- It is `SyStateBlock`'s frozen `error` state, with heading **"Can't open the project"**.
- The line names the location.
- It carries its own **Trace ID** for this occurrence, after the component's visible label.
- `Retry` re-runs the resolution.
- The contract's own rules apply: it is an assertive live region, and its action takes focus on appearance **only when the user's action caused the state**. A failed `Retry` is caused by the author's action; how an error present on arrival is treated belongs to §10.
- It covers corrupt JSON, invalid content, an id/file-name mismatch, a permission failure, and — temporarily — a newer schema version.

**UNSPECIFIED BY DESIGN:** its **size** — `pane`, `panel` or `inline row` — and where it sits on the surface.

## 8. Copy

**FIXED:** two strings, both owner-approved — **"Can't open the project"** (§7) and **"Can't find that project"**, which is the Picker's announcement and never appears here (§2).

**UNSPECIFIED BY DESIGN:** every other string, including the zero-Language state's copy and the loading label.

## 9. Components

**FIXED — what is available.** The ten Phase 1 primitives, implemented and frozen, plus the shared overlay substrate.

**FIXED — what is excluded** (WS-05):

- `SyAppShell`, and `SyScopeBar`, which stays uncontracted per **O3**.
- The rail and its icons, so **D6** is not needed.
- Pane persistence.
- `SyCollection`.
- Language creation or listing.
- Shell routes.
- Any lifecycle display.
- Any return control.

`SyToast` and `SyInlineBanner` are registered without a contract (O3) and cannot be used without one.

**UNSPECIFIED BY DESIGN:** the components list. Any pattern the design concludes it needs must be stated explicitly, and it re-imports that pattern's constraints.

## 10. Focus on arrival

**FIXED:**

- The 2px accent focus ring at 2px offset, never removed, with focus order following visual order.
- No mouse-only action.
- `SyStateBlock`'s rule for its own action (§7).

**UNSPECIFIED BY DESIGN:** where focus is when the surface arrives — from the Picker's `Open`, and from a URL opened directly.

## 11. Responsive behaviour

**FIXED — the ranges.** Foundations §13: `bp.sm` `< 900px`, `bp.md` `900–1279px`, `bp.lg` `1280–1727px`, `bp.xl` `≥ 1728px`. The `bp.sm` rule — *"Read and review only; editors disabled with an explanation"* — is canonical.

**FIXED — what does not own it.** `SyAppShell`'s *"owns responsive behaviour"* does not bind outside the shell (WS-05), and the breakpoint *meanings* are written in shell-pane terms that have no panes to act on here.

**UNSPECIFIED BY DESIGN:** what the surface does in each range.

## 12. Accessibility

**FIXED — binds regardless** (WS-05, following WS-04):

- 44px touch targets.
- Usable to 200% zoom.
- Colour is never the only signal (P5).
- **A16**'s live-region policy.
- **AC13**.
- The R05 shell-furniture keys — `⌥1…7`, `⌘L`, `⌘\`, `⌘/`, `F6` — have nothing to act on.

**UNSPECIFIED BY DESIGN:** landmark and heading structure (§3), and any keyboard map of the surface's own.

## 13. Route

**FIXED** (OD-1, OD-5; ADR-005 OP-01, OP-05):

- The URL is `/workspace/{projectId}`, a temporary pre-shell workspace URL, outside the URL contract's eleven routes.
- It is not route twelve, and not the missing twelfth route of recorded discrepancy #4.
- It identifies a Project within the configured projects folder. It grants no access, is not an authentication credential, and is not portable.

**UNSPECIFIED BY DESIGN:** nothing. Design is asked not to propose a different URL or a shell route.

---

## Summary of what Design is asked to decide

| # | Question | Section |
|---|---|---|
| 1 | The Workspace Entry's structure, landmarks and headings | §3, §12 |
| 2 | How the Project's name is presented, and whether anything else is shown | §4 |
| 3 | The zero-Language state: its form and its copy | §5 |
| 4 | Whether loading is shown, and its accessible loading label | §6 |
| 5 | The can't-read error's size and placement | §7 |
| 6 | All remaining copy | §8 |
| 7 | The components list | §9 |
| 8 | Focus on arrival | §10 |
| 9 | Responsive behaviour at the four breakpoints | §11 |

## Blocked — not for Design to resolve in this commission

| | Blocker | Owner |
|---|---|---|
| Not-found announcement transport | How "Can't find that project" reaches the Picker after a workspace URL returns to `/`. No existing mechanism carries it, and none is chosen (ADR-005 OP-08). | Project owner |
| Concurrent editing | The same Project open in two tabs. Not decided. | Project owner |
| Newer schema version | A distinct state waits until a newer version can be told apart from an unreadable file. Until then it is *can't read*. | Architecture |
| Tolerant repository reads | `findAll()` fails the whole list on one unreadable file. | Architecture |
| The shell's URLs | Whether the shell's routes carry the ProjectId. | Design owner + Architecture |
| `SyScopeBar`, **D6** | Untouched by this commission. | Design owner |
