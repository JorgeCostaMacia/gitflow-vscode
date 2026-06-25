import { BranchType } from '@domain/branch/branch-type';
import { BranchVersion } from '@domain/branch/branch-version';
import { IGitRepository } from '@domain/git/git-repository.port';
import { GitflowService } from '@domain/gitflow/gitflow-service';

/** Use case: start a release branch from develop and publish it. */
export class ReleaseStartService {
  private readonly type = BranchType.release;

  constructor(
    private readonly repo: IGitRepository,
    private readonly gitflow: GitflowService,
  ) {}

  /** Creates `release/<version>` from develop. Returns the created branch. */
  async execute(version: string): Promise<string> {
    const safeVersion = new BranchVersion(version);

    const from = await this.gitflow.resolveStartsFrom(this.type.startsFrom);
    await this.gitflow.ensureBranch(from);
    await this.gitflow.ensureCleanTree();
    await this.gitflow.ensureOriginExists();

    const branch = this.type.branchFor(safeVersion.value);

    await this.repo.checkout(from);
    await this.repo.pull(from);
    await this.repo.checkoutNew(branch);
    await this.repo.pushNewBranch(branch);

    return branch;
  }
}
