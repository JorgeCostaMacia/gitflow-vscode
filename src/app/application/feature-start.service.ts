import { BranchName } from '@domain/branch/branch-name';
import { BranchType } from '@domain/branch/branch-type';
import { IGitRepository } from '@domain/git/git-repository.port';
import { GitflowService } from '@domain/gitflow/gitflow-service';

/** Use case: start a feature branch from develop and publish it. */
export class FeatureStartService {
  private readonly type = BranchType.feature;

  constructor(
    private readonly repo: IGitRepository,
    private readonly gitflow: GitflowService,
  ) {}

  /** Creates `feature/<name>-<timestamp>` from develop. Returns the created branch. */
  async execute(name: string): Promise<string> {
    const safeName = new BranchName(name); // validates or throws

    const from = await this.gitflow.resolveStartsFrom(this.type.startsFrom);
    await this.gitflow.ensureBranch(from);
    await this.gitflow.ensureCleanTree();
    await this.gitflow.ensureOriginExists();

    const branch = this.type.newBranchFor(safeName.value);

    await this.repo.checkout(from);
    await this.repo.pull(from);
    await this.repo.checkoutNew(branch);
    await this.repo.pushNewBranch(branch);

    return branch;
  }
}
