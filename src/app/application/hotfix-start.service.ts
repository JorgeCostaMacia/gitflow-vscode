import { BranchType } from '@domain/branch/branch-type';
import { BranchVersion } from '@domain/branch/branch-version';
import { IGitRepository } from '@domain/git/git-repository.port';
import { GitflowService } from '@domain/gitflow/gitflow-service';

/** Use case: start a hotfix branch from main and publish it. */
export class HotfixStartService {
  private readonly type = BranchType.hotfix;

  constructor(
    private readonly repo: IGitRepository,
    private readonly gitflow: GitflowService,
  ) {}

  /** Creates `hotfix/<version>` from main. Returns the branch and the main branch. */
  async execute(version: string): Promise<{ branch: string; main: string }> {
    const safeVersion = new BranchVersion(version);

    const main = await this.gitflow.resolveStartsFrom(this.type.startsFrom);
    await this.gitflow.ensureCleanTree();
    await this.gitflow.ensureOriginExists();

    const branch = this.type.branchFor(safeVersion.value);

    await this.repo.checkout(main);
    await this.repo.pull(main);
    await this.repo.checkoutNew(branch);
    await this.repo.pushNewBranch(branch);

    return { branch, main };
  }
}
