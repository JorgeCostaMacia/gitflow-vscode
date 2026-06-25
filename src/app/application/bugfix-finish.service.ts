import { BranchName } from '@domain/branch/branch-name';
import { BranchType } from '@domain/branch/branch-type';
import { IGitRepository } from '@domain/git/git-repository.port';
import { GitflowDefaults } from '@domain/gitflow/gitflow-defaults';
import { GitflowMerge } from '@domain/gitflow/gitflow-merge.service';
import { GitflowService } from '@domain/gitflow/gitflow-service';

/** Use case: finish a bugfix by merging it into develop. */
export class BugfixFinishService {
  private readonly type = BranchType.bugfix;

  constructor(
    private readonly repo: IGitRepository,
    private readonly gitflow: GitflowService,
    private readonly merge: GitflowMerge,
  ) {}

  /** Merges `bugfix/<name>` into develop and deletes the local and remote branch. */
  async execute(name: string): Promise<void> {
    const safeName = new BranchName(name);
    await this.gitflow.ensureCleanTree();

    const branch = this.type.branchFor(safeName.value);
    await this.gitflow.ensureBranch(branch);

    await this.repo.checkout(GitflowDefaults.developBranch);
    await this.repo.pull(GitflowDefaults.developBranch);
    await this.merge.safeMerge(branch, GitflowDefaults.developBranch);
    await this.repo.push(GitflowDefaults.developBranch);
    await this.repo.deleteRemoteBranchSafe(branch);
    await this.repo.deleteLocalBranch(branch);
  }
}
