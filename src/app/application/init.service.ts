import { IGitRepository } from '@domain/git/git-repository.port';
import { GitflowDefaults } from '@domain/gitflow/gitflow-defaults';
import { GitflowService } from '@domain/gitflow/gitflow-service';

/**
 * Use case: initialize gitflow. Exposes granular operations because the flow is
 * interactive (the main/master decision and the develop confirmation are handled
 * by the presentation handler).
 */
export class InitService {
  constructor(
    private readonly repo: IGitRepository,
    private readonly gitflow: GitflowService,
  ) {}

  /** Returns 'main' or 'master' if either exists; undefined if neither does. */
  async findMainBranch(): Promise<string | undefined> {
    for (const candidate of GitflowDefaults.mainBranchCandidates) {
      if (await this.repo.localBranchExists(candidate)) {
        return candidate;
      }
    }
    return undefined;
  }

  /**
   * Guard: branches cannot be created or published in a repo with no commits
   * (an unborn HEAD has nothing to push). Fails early with a clear message
   * instead of letting git report a cryptic "src refspec ... does not match any".
   */
  async ensureHasCommits(): Promise<void> {
    if (!(await this.repo.hasCommits())) {
      throw new Error('The repository has no commits yet. Make an initial commit before running GitFlow: Init.');
    }
  }

  /** Guard: the workflow publishes to 'origin'; delegates to the gitflow service. */
  async ensureOriginExists(): Promise<void> {
    await this.gitflow.ensureOriginExists();
  }

  async createMainBranch(name: string): Promise<void> {
    await this.repo.checkoutNew(name);
    await this.repo.pushNewBranch(name);
  }

  async developExistsLocally(): Promise<boolean> {
    return this.repo.localBranchExists(GitflowDefaults.developBranch);
  }

  async developExistsRemotely(): Promise<boolean> {
    return this.repo.remoteBranchExists(GitflowDefaults.developBranch);
  }

  /** Publishes a develop branch that already exists locally but not on the remote. */
  async publishDevelop(): Promise<void> {
    await this.repo.checkout(GitflowDefaults.developBranch);
    await this.repo.pushNewBranch(GitflowDefaults.developBranch);
  }

  async bringDevelopFromRemote(): Promise<void> {
    await this.repo.checkoutNew(GitflowDefaults.developBranch, `origin/${GitflowDefaults.developBranch}`);
  }

  async createDevelopFrom(main: string): Promise<void> {
    await this.gitflow.ensureBranch(main);
    await this.repo.checkout(main);
    await this.repo.pull(main);
    await this.repo.checkoutNew(GitflowDefaults.developBranch);
    await this.repo.pushNewBranch(GitflowDefaults.developBranch);
  }
}
