# gitflow-vscode — working in this repo

The **GitFlow JCM** VS Code extension (publisher `JorgeCostaMacia`): nine commands — `gitflow.init` and start/finish for feature, bugfix, release and hotfix — and a tree view, over the user's own `git`. [README.md](README.md) holds what it does and how to use, build and install it (commands, behaviour, validation, domain model, architecture, safety, stack, testing); this file holds how to work here without repeating it.

## Layout

- `src/main.ts` activates the extension and wires the handlers. `src/app/` is layered, dependencies pointing inward:
  - `domain/` — the branch value objects (`branch/`: name, type, version, tag, commit message), the git **ports** (`git/`: `IGitRepository`, `IGitRunner`) and the GitFlow services (`gitflow/`: merge, finish, defaults).
  - `application/` — one service per command (`feature-start.service.ts`, `release-finish.service.ts`…).
  - `infrastructure/git/` — the adapters: `GitRepository` over `GitRunner`, which spawns `git`.
  - `presentation/` — the command handlers and the tree provider; `shared/` — the error handler.
- `test/domain/` — unit specs on vitest, one per unit, against the stub in `test/stubs/vscode.ts`. `test/integration/` — the flows and edge cases on **real repositories** built by `test/helpers/git-sandbox.ts`. `pnpm run test`, `pnpm run test:integration`, `pnpm run test:all`.

## Conventions

- **The git allow-list.** `GitRunner` rejects any argument that starts with `-` unless it is in its `knownFlags` set — the guard against injection through a branch name or a message. A new git option goes into that set (that is how `--cleanup=verbatim` arrived) with a case in `test/domain/git-runner-security.spec.ts`. Input is **rejected, never sanitized**.
- **A finish is transactional**: develop first, then main, the tag, one atomic push; on failure, main and develop go back to the SHAs captured before, and the tag is deleted only when this run created it. A tag that already exists, locally or on origin, stops a release or hotfix finish before anything is touched.
- TypeScript 6 strict with explicit return types and no `any`; ESLint 10 flat config with `naming-convention`; Prettier. `pnpm run typecheck`, `pnpm run lint` and `pnpm run format` before committing — CI runs the first two.
- **pnpm 12** as the `pnpm` skill prescribes: `packageManager` pins the exact pnpm and `devEngines.runtime` the Node 26 runtime (pnpm downloads both when missing), `pnpm-workspace.yaml` sets `minimumReleaseAge` to three days (strict) and allows build scripts for `esbuild` only, and CI installs with `--frozen-lockfile`. Moving the pnpm pin is a dependency update: pick a release at least three days old.
- Commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`), under the identity git already has in this repo, with no assistant trailers. Docs and messages in English.

## Releases

This repo follows the GitFlow it ships (the `gitflow` skill mirrors the same flow): `feature/<name>-<timestamp>` from `develop`, finished with `--no-ff --no-edit`; `release/<version>` from `develop`, where the **`version` in `package.json` is bumped** (`chore: release <version>`), then merged into `develop` and `main`, tagged `v<version>` on `main` (annotated, `--cleanup=verbatim`) and pushed atomically. `.github/workflows/release.yml` runs on a `v*` tag: it checks the tag equals `package.json`'s version, typechecks, lints, runs both suites, packages the VSIX and attaches it to the GitHub Release.

## Relevant skills

- **`gitflow`** — every branch, version or release step; this repo must keep doing what the skill says, since the skill describes this extension.
- **`pnpm`** — any dependency, tooling or CI change.
- **`clean-architecture`** — the layers above and the inward rule; ports in `domain/`, adapters in `infrastructure/`.
- **`solid`** — shaping services and handlers.
- **`testing`** — one spec per unit, real git over mocks in the integration suite, no sleeps.

No `-net` skill applies: this is TypeScript.
