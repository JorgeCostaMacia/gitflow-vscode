import { IGitRepository } from '@domain/git/git-repository.port';

/**
 * Safe merge primitive: merges with --no-ff and aborts on conflicts, leaving the
 * repository in its original state. Reused by feature/bugfix finish and by the
 * transactional GitflowFinish flow.
 */
export class GitflowMerge {
  constructor(private readonly repo: IGitRepository) {}

  /**
   * Merges Source into the current branch with --no-ff. On conflicts, aborts the
   * merge and throws a clear error, leaving the repo in its original state.
   */
  async safeMerge(source: string, into: string): Promise<void> {
    try {
      await this.repo.mergeNoFf(source);
    } catch (err: unknown) {
      if (await this.repo.isMerging()) {
        await this.repo.abortMerge();
        throw new Error(
          `Conflicts while merging '${source}' into '${into}'. ` +
            `The repository was left in its original state. ` +
            `Resolve the conflicts manually and try again.`,
          { cause: err },
        );
      }
      throw err;
    }
  }
}
