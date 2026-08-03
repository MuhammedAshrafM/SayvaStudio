# Changesets

## Why this exists

Sayva Studio is a Turborepo monorepo with six workspace packages (`domain`, `application`, `infrastructure`, `pack-schema`, `design-system`) plus the `studio` app. Every one of them is `"private": true` and none are published to npm — this is configured for **version tracking and changelog generation inside the repository only**. There is no `changeset publish` step wired anywhere (not in a script, not in CI), and none should be added without a deliberate decision to actually start publishing something — that would be its own ADR, not a quiet script addition.

A changeset is a small markdown file recording _what changed, in which package, and how significant the change is_ (major/minor/patch) at the time you make the change — not reconstructed later by guessing at commit history. `pnpm version-packages` (`changeset version`) consumes every pending changeset, bumps the affected packages' `version` fields, and writes their `CHANGELOG.md` entries.

## When to add a changeset

Run `pnpm changeset` for any change that alters a package's actual behavior or public surface:

- A new or changed Use Case, Domain entity, Repository interface, or Domain Service
- A new or changed `design-system` component or token
- A change to `pack-schema`'s types
- A bug fix to any of the above

## When not to

- Documentation-only changes (`docs/`, README updates)
- Internal tooling that isn't itself a workspace package's behavior — CI config, `.github/` templates, editor config
- Pure scaffolding with no behavior yet (most of Phase 0 falls here — there's nothing meaningful to version until a package does something)
- A change already covered by an existing pending changeset

If you're genuinely unsure, add one anyway — an unnecessary patch bump costs nothing; a real behavior change shipping with no changeset is the failure mode this exists to prevent.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, …) are the default commit style from here forward, so changeset summaries, commit history, and any future release automation stay readable together.
