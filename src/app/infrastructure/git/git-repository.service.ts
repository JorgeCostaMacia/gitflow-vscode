import { IGitRepository } from '@domain/git/git-repository.port';
import { IGitRunner } from '@domain/git/git-runner.port';
import { GitRunner } from '@infrastructure/git/git-runner.service';
import { ErrorHandler } from '@shared/error-handler';

/**
 * Low-level query and mutation operations over a git repository. Knows nothing
 * about gitflow; exposes reusable primitives on top of GitRunner. Implements the
 * domain's IGitRepository port.
 */
export class GitRepository implements IGitRepository {
  constructor(private readonly git: GitRunner) {}

  get output(): IGitRunner {
    return this.git;
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  async getCurrentBranch(): Promise<string> {
    return this.git.run('branch', '--show-current');
  }

  /** Lists local branches with a prefix, returning the name without the prefix. */
  async getLocalBranches(prefix: string): Promise<string[]> {
    const raw = await this.git.run('branch', '--list', `${prefix}/*`);
    if (!raw) {
      return [];
    }
    return raw
      .split('\n')
      .map((b: string) => b.replace('*', '').trim())
      .filter(Boolean)
      .map((b: string) => b.replace(`${prefix}/`, ''));
  }

  async localBranchExists(branch: string): Promise<boolean> {
    return this.refExists(`refs/heads/${branch}`);
  }

  async remoteBranchExists(branch: string): Promise<boolean> {
    return this.refExists(`refs/remotes/origin/${branch}`);
  }

  async getSha(ref: string): Promise<string> {
    return this.git.run('rev-parse', ref);
  }

  async isMerging(): Promise<boolean> {
    return this.refExists('MERGE_HEAD', false);
  }

  async hasUncommittedChanges(): Promise<boolean> {
    const status = await this.git.run('status', '--porcelain');
    return status.length > 0;
  }

  /** True if the repo has at least one commit (HEAD resolves to a revision). */
  async hasCommits(): Promise<boolean> {
    return this.refExists('HEAD', false);
  }

  /** True if a remote with the given name is configured. */
  async remoteExists(remote: string): Promise<boolean> {
    const raw = await this.git.run('remote');
    return raw
      .split('\n')
      .map((r: string) => r.trim())
      .includes(remote);
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async checkout(branch: string): Promise<void> {
    await this.git.run('checkout', branch);
  }

  async checkoutNew(branch: string, from?: string): Promise<void> {
    if (from) {
      await this.git.run('checkout', '-b', branch, from);
    } else {
      await this.git.run('checkout', '-b', branch);
    }
  }

  /**
   * Pulls a branch from origin. If the branch does not exist on the remote yet
   * (git: "couldn't find remote ref"), this is treated as a no-op so a local-only
   * branch does not break the flow. Any other failure (network, conflicts, auth)
   * is re-thrown unchanged.
   */
  async pull(branch: string): Promise<void> {
    try {
      await this.git.run('pull', 'origin', branch);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("couldn't find remote ref")) {
        return; // branch is local-only; nothing to pull
      }
      throw err;
    }
  }

  async pushNewBranch(branch: string): Promise<void> {
    await this.git.run('push', '-u', 'origin', branch);
  }

  async push(...refs: string[]): Promise<void> {
    await this.git.run('push', 'origin', ...refs);
  }

  async mergeNoFf(source: string): Promise<void> {
    await this.git.run('merge', '--no-ff', '--no-edit', source);
  }

  async abortMerge(): Promise<void> {
    await this.git.run('merge', '--abort');
  }

  async resetHard(sha: string): Promise<void> {
    await this.git.run('reset', '--hard', sha);
  }

  async createTag(name: string, message: string): Promise<void> {
    await this.git.run('tag', '-a', name, '-m', message);
  }

  async deleteTag(name: string): Promise<void> {
    await this.git.run('tag', '-d', name);
  }

  async deleteLocalBranch(branch: string): Promise<void> {
    await this.git.run('branch', '-d', branch);
  }

  /** Deletes a remote branch; if it fails (missing, no perms, no network) just warns. */
  async deleteRemoteBranchSafe(branch: string): Promise<void> {
    try {
      await this.git.run('push', 'origin', '--delete', branch);
    } catch (err: unknown) {
      this.git.log(`⚠️  Could not delete remote branch '${branch}': ${ErrorHandler.messageOf(err)}`);
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private async refExists(ref: string, quiet = true): Promise<boolean> {
    try {
      const args = quiet ? ['rev-parse', '--verify', '--quiet', ref] : ['rev-parse', '--verify', ref];
      await this.git.run(...args);
      return true;
    } catch {
      return false;
    }
  }
}
