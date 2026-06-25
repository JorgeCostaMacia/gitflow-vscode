import { BugfixFinishService } from '@application/bugfix-finish.service';
import { BranchType } from '@domain/branch/branch-type';
import { IGitRepository } from '@domain/git/git-repository.port';
import { CommandHandler } from '@presentation/command.handler';

/** Handler for the gitflow.bugfixFinish command. */
export class BugfixFinishHandler extends CommandHandler {
  constructor(
    repo: IGitRepository,
    private readonly service: BugfixFinishService,
  ) {
    super(repo);
  }

  async handle(): Promise<void> {
    const branch = await this.pickBranch(BranchType.bugfix.prefix);
    if (!branch) {
      return;
    }

    await this.withProgress(`Finishing bugfix '${branch}'...`, async () => {
      await this.service.execute(branch);
    });

    this.info(`✅ Bugfix '${branch}' merged into develop, local and remote branches deleted`);
  }
}
