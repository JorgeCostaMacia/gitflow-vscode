import { IGitRepository } from '@domain/git/git-repository.port';
import { GitflowDefaults } from '@domain/gitflow/gitflow-defaults';

/**
 * Resolves the repo's branch convention: which is the main branch (`main` or
 * `master`) and validates preconditions (branch existence, clean tree).
 */
export class GitflowService {
  constructor(private readonly repo: IGitRepository) {}

  /** Returns the first existing main branch among the candidates. */
  async getMainBranch(): Promise<string> {
    for (const candidate of GitflowDefaults.mainBranchCandidates) {
      if (await this.repo.localBranchExists(candidate)) {
        return candidate;
      }
    }
    throw new Error("No main branch found ('main' or 'master'). Run 'GitFlow: Init' first.");
  }

  /**
   * Resolves a type's base branch: if it is the main-branch marker, returns the
   * actual main branch; otherwise returns the branch as-is.
   */
  async resolveStartsFrom(startsFrom: string): Promise<string> {
    if (startsFrom === GitflowDefaults.mainBranchPlaceholder) {
      return this.getMainBranch();
    }
    return startsFrom;
  }

  async ensureBranch(branch: string): Promise<void> {
    if (!(await this.repo.localBranchExists(branch))) {
      throw new Error(`Branch '${branch}' does not exist. Run 'GitFlow: Init' first.`);
    }
  }

  async ensureCleanTree(): Promise<void> {
    if (await this.repo.hasUncommittedChanges()) {
      throw new Error('You have uncommitted changes. Commit or stash them before continuing.');
    }
  }

  /** Guard: the workflow publishes to 'origin', so that remote must be configured. */
  async ensureOriginExists(): Promise<void> {
    if (!(await this.repo.remoteExists(GitflowDefaults.originRemote))) {
      throw new Error(
        `GitFlow publishes to a remote named '${GitflowDefaults.originRemote}', but none is configured. ` +
          `Add one with: git remote add ${GitflowDefaults.originRemote} <url>`,
      );
    }
  }
}
