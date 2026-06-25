import { BranchCommitMessage } from '@domain/branch/branch-commit-message';
import { BranchTag } from '@domain/branch/branch-tag';
import { BranchType } from '@domain/branch/branch-type';
import { BranchVersion } from '@domain/branch/branch-version';
import { GitflowFinish } from '@domain/gitflow/gitflow-finish.service';
import { GitflowService } from '@domain/gitflow/gitflow-service';

/** Use case: finish a hotfix by merging it into develop + main with a tag. */
export class HotfixFinishService {
  private readonly type = BranchType.hotfix;

  constructor(
    private readonly gitflow: GitflowService,
    private readonly finish: GitflowFinish,
  ) {}

  /** Finishes the hotfix transactionally. Returns the main branch used. */
  async execute(version: string): Promise<string> {
    const safeVersion = new BranchVersion(version);
    await this.gitflow.ensureCleanTree();
    await this.gitflow.ensureBranch(this.type.branchFor(safeVersion.value));

    const tag = new BranchTag(safeVersion);
    const message = new BranchCommitMessage(`Hotfix ${tag.value}`);

    const main = await this.finish.finishTagged({
      prefix: this.type.prefix,
      name: safeVersion.value,
      tag: tag.value,
      tagMessage: message.value,
    });

    return main;
  }
}
