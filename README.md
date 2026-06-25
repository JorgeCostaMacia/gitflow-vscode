# GitFlow JCM

[![Marketplace](https://img.shields.io/visual-studio-marketplace/v/JorgeCostaMacia.gitflow-vscode?label=marketplace)](https://marketplace.visualstudio.com/items?itemName=JorgeCostaMacia.gitflow-vscode)
[![GitHub release](https://img.shields.io/github/v/release/JorgeCostaMacia/gitflow-vscode)](https://github.com/JorgeCostaMacia/gitflow-vscode/releases/latest)
[![License: MIT](https://img.shields.io/github/license/JorgeCostaMacia/gitflow-vscode)](https://github.com/JorgeCostaMacia/gitflow-vscode/blob/master/LICENSE)
[![Release](https://github.com/JorgeCostaMacia/gitflow-vscode/actions/workflows/release.yml/badge.svg)](https://github.com/JorgeCostaMacia/gitflow-vscode/actions/workflows/release.yml)

Lightweight GitFlow extension for VS Code that runs **pure git** (no dependency on
`git-flow-avh`). Implements the Feature / Bugfix / Release / Hotfix workflow, with a
sidebar panel and command-palette actions.

## Commands

All actions are available from the **GitFlow panel** in the activity bar (a tree with
Init plus Start/Finish for each branch type), and from the Command Palette.

Open the palette (`Ctrl+Shift+P`) and type **GitFlow**, or press `Shift+Alt+G` to
open the palette already filtered by GitFlow commands:

| Command                        | Action                                                             |
| ------------------------------ | ------------------------------------------------------------------ |
| `GitFlow: Init`                | Detects/creates `main` (or `master`) and `develop`                 |
| `GitFlow: Feature Start`       | Creates `feature/<name>-<timestamp>` from develop and publishes it |
| `GitFlow: Feature Finish`      | Merges into develop (`--no-ff`), deletes local and remote branch   |
| `GitFlow: Bugfix Start/Finish` | Same as feature, with the `bugfix/` prefix                         |
| `GitFlow: Release Start`       | Creates `release/<version>` from develop and publishes it          |
| `GitFlow: Release Finish`      | Merges into develop and main, creates a tag, deletes branches      |
| `GitFlow: Hotfix Start`        | Creates `hotfix/<version>` from main and publishes it              |
| `GitFlow: Hotfix Finish`       | Merges into develop and main, creates a tag, deletes branches      |

## Behavior

- **Start**: creates the branch and publishes it (`push -u`) for instant backup and tracking.
- **Feature/bugfix finish**: `--no-ff` merge into develop, deletes local + remote branch.
- **Release/hotfix finish**: transactional — merges into develop first (safer against
  conflicts), then main, creates the tag, **atomic push** (`--atomic main develop --tags`,
  so the remote updates all refs or none) and deletes branches. The **tag is kept** on the remote.
- **Names**: feature/bugfix carry a timestamp suffix; release/hotfix use a clean SemVer version.

## Validation (reject, don't sanitize)

Input is **rejected** rather than silently transformed, so what you type is what you get:

- **Branch names** (feature/bugfix): lowercase letters/digits to start, then lowercase word
  characters and `.` `_` `-` `/`. Uppercase, spaces and accents are rejected, not rewritten.
- **Versions** (release/hotfix): strict 3-component SemVer (e.g. `1.0.0`, optionally `1.0.0-rc1`).
- **Tags**: built from the version with the conventional `v` prefix (`1.0.0` → `v1.0.0`).

Validation lives inside the value objects (`BranchName`, `BranchVersion`, `BranchTag`,
`BranchCommitMessage`), so a value that reaches git is always valid by construction.

## Domain model

The gitflow convention lives in a single place (`BranchType`): each branch type declares
which branch it starts from, whether it is tagged and whether it uses a timestamp. Services
read those rules instead of hardcoding them.

## Architecture

```
src/
  main.ts                       bootstrap (DI wiring + command registration)
  app/
    domain/
      branch/                   value objects + BranchType (the branch model)
      git/                      ports (git-repository, git-runner)
      gitflow/                  gitflow logic (service, merge, finish, defaults)
    application/                use cases (one service per use case)
    infrastructure/git/         git access (GitRunner, GitRepository implementations)
    presentation/              VS Code UI: command handlers + sidebar TreeView provider
      commands/                 one handler per command
    shared/                     cross-cutting helpers (ErrorHandler)
```

The domain depends only on ports (`IGitRepository`, `IGitRunner`); infrastructure provides
the concrete implementations. The use cases and presentation never touch git directly.

## Safety

- Uses `execFile` (no shell) → immune to shell injection from names with special characters.
- Option-injection guard: any argument starting with `-` must be an allow-listed git flag.
- Preconditions fail early with clear, actionable messages instead of cryptic git errors:
  the repo must have an initial commit, a remote named `origin` must exist, the working
  tree must be clean, and the branch being finished must exist.
- Guarded merge: on conflicts, aborts and **reverts** main/develop to their original state.

## Stack

- TypeScript 6 (`module: preserve`, full strict, explicit return types, no `any`)
- Build with **esbuild** (single bundle in `dist/`)
- ESLint 10 flat config (with `naming-convention`) + Prettier
- Package manager: **pnpm** (Node ≥ 26)

## Development

```bash
pnpm install
pnpm run typecheck    # type-check only (tsc --noEmit)
pnpm run compile      # typecheck + bundle with esbuild → dist/
pnpm run watch        # esbuild in watch mode
pnpm run lint         # eslint (src + test)
pnpm run format       # prettier
pnpm run package      # builds the .vsix
```

To debug: open the project in VS Code and press `F5`.

> On first install, pnpm will ask to approve the `esbuild` build (native binary).
> It is already allowed in `pnpm-workspace.yaml` (`allowBuilds: esbuild: true`).

> If you use pnpm's `minimumReleaseAge` policy and a freshly published dependency
> (e.g. a brand-new `@types/node`) is blocked, either wait until it ages past your
> threshold or install from the committed lockfile with `pnpm install --frozen-lockfile`.

## Testing

Tests with **Vitest** cover the domain logic (the layers worth testing):

```bash
pnpm test              # unit tests (fast, no git needed)
pnpm test:integration  # integration tests (real git against temp repos)
pnpm test:all          # both
```

Unit tests:

- value objects — `BranchName`, `BranchVersion`, `BranchTag`, `BranchCommitMessage` (validation)
- `BranchType` — convention rules and name building per branch type
- `GitflowMerge` — safe merge with abort on conflict
- `GitflowFinish` — the transactional finish and rollback, using a mocked repository
- `GitRunner` — the option-injection security guard

Integration tests run the real flows (start/finish for every type, plus rollback on conflict)
against throwaway temp repositories with a local + bare remote.

Handlers (VS Code UI) are not unit-tested; they would require the VS Code runtime.

## Install

### From the Marketplace (recommended)

Search for **GitFlow JCM** in the Extensions view (`Ctrl+Shift+X`), or install from the command line:

```bash
code --install-extension JorgeCostaMacia.gitflow-vscode
```

### From a .vsix

Download the `.vsix` from the [latest release](https://github.com/JorgeCostaMacia/gitflow-vscode/releases/latest) and install it:

```bash
code --install-extension gitflow-vscode-1.0.0.vsix
```

Or in VS Code: Extensions view → `...` → **Install from VSIX...**
