import { IGitRepository } from '@domain/git/git-repository.port';
import { GitflowDefaults } from '@domain/gitflow/gitflow-defaults';
import { GitflowFinishTaggedOptions } from '@domain/gitflow/gitflow-finish-tagged-options';
import { GitflowMerge } from '@domain/gitflow/gitflow-merge.service';
import { GitflowService } from '@domain/gitflow/gitflow-service';
import { ErrorHandler } from '@shared/error-handler';

/**
 * Transactional finish for release/hotfix branches: merges into develop first
 * (where conflicts are most likely), then into main, creates the tag and pushes
 * atomically. If anything fails, reverts main and develop to their original state.
 */
export class GitflowFinish {
  constructor(
    private readonly repo: IGitRepository,
    private readonly gitflow: GitflowService,
    private readonly merge: GitflowMerge,
  ) {}

  /** Finishes a release/hotfix transactionally. Returns the main branch used. */
  async finishTagged(options: GitflowFinishTaggedOptions): Promise<string> {
    const { prefix, name, tag, tagMessage } = options;
    const main = await this.gitflow.getMainBranch();
    const source = `${prefix}/${name}`;

    await this.repo.checkout(main);
    await this.repo.pull(main);
    await this.repo.checkout(GitflowDefaults.developBranch);
    await this.repo.pull(GitflowDefaults.developBranch);

    const mainSha = await this.repo.getSha(main);
    const developSha = await this.repo.getSha(GitflowDefaults.developBranch);

    try {
      // 1. Merge into develop first: if it fails, main has not been touched.
      await this.repo.checkout(GitflowDefaults.developBranch);
      await this.merge.safeMerge(source, GitflowDefaults.developBranch);

      // 2. Merge into main (conflicts here are rare on a finish).
      await this.repo.checkout(main);
      await this.merge.safeMerge(source, main);

      // 3. Both merges OK → tag on main and atomic push. --atomic guarantees the
      //    server updates all refs or none, so main and develop never diverge
      //    remotely if one ref is rejected.
      await this.repo.createTag(tag, tagMessage);
      await this.repo.push('--atomic', main, GitflowDefaults.developBranch, '--tags');

      // 4. Delete the remote branch first, then the local one. Deleting the
      //    remote first removes the upstream tracking ref, so `git branch -d`
      //    won't refuse the local branch for being "not merged to its upstream".
      await this.repo.deleteRemoteBranchSafe(source);
      await this.repo.deleteLocalBranch(source);

      // 5. Leave the user on develop, where day-to-day work continues (main is
      //    only touched by release/hotfix finishes). Matches feature/bugfix finish.
      await this.repo.checkout(GitflowDefaults.developBranch);
    } catch (err: unknown) {
      // rollback() throws if the recovery itself fails (inconsistent repo);
      // that error takes precedence. If rollback succeeds, surface the original
      // cause of the finish failure.
      await this.rollback(main, mainSha, developSha, tag);
      throw new Error(`Finish failed and was rolled back: ${ErrorHandler.messageOf(err)}`, { cause: err });
    }

    return main;
  }

  /** Reverts main and develop to the given SHAs and deletes the tag if it was created. */
  private async rollback(main: string, mainSha: string, developSha: string, tag: string): Promise<void> {
    try {
      if (await this.repo.isMerging()) {
        await this.repo.abortMerge();
      }
      try {
        await this.repo.deleteTag(tag);
      } catch {
        /* the tag was never created */
      }
      await this.repo.checkout(main);
      await this.repo.resetHard(mainSha);
      await this.repo.checkout(GitflowDefaults.developBranch);
      await this.repo.resetHard(developSha);
      this.repo.output.log('↩️  Rollback complete: main and develop reverted to their original state.');
    } catch (rollbackErr: unknown) {
      // The recovery itself failed: the repo may be in an inconsistent state.
      // Surface this loudly instead of only logging — throw so the caller shows
      // a visible error telling the user to check the repository manually.
      const detail = ErrorHandler.messageOf(rollbackErr);
      this.repo.output.log(`⚠️  Rollback FAILED: ${detail}`);
      throw new Error(
        `Finish failed and the automatic rollback could not complete (${detail}). ` +
          `The repository may be in an inconsistent state — check 'main' and 'develop' manually. ` +
          `Expected SHAs: ${main}=${mainSha}, ${GitflowDefaults.developBranch}=${developSha}.`,
        { cause: rollbackErr },
      );
    }
  }
}
