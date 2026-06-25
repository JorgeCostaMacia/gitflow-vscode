import { ReleaseFinishService } from '@application/release-finish.service';
import { BranchType } from '@domain/branch/branch-type';
import { IGitRepository } from '@domain/git/git-repository.port';
import { CommandHandler } from '@presentation/command.handler';

/** Handler for the gitflow.releaseFinish command. */
export class ReleaseFinishHandler extends CommandHandler {
  constructor(
    repo: IGitRepository,
    private readonly service: ReleaseFinishService,
  ) {
    super(repo);
  }

  async handle(): Promise<void> {
    const branch = await this.pickBranch(BranchType.release.prefix);
    if (!branch) {
      return;
    }

    let main = '';
    await this.withProgress(`Finishing release '${branch}'...`, async () => {
      main = await this.service.execute(branch);
    });

    this.info(`✅ Release '${branch}' merged into ${main} and develop, tag created, branches deleted`);
  }
}
