import { HotfixFinishService } from '@application/hotfix-finish.service';
import { BranchType } from '@domain/branch/branch-type';
import { IGitRepository } from '@domain/git/git-repository.port';
import { CommandHandler } from '@presentation/command.handler';

/** Handler for the gitflow.hotfixFinish command. */
export class HotfixFinishHandler extends CommandHandler {
  constructor(
    repo: IGitRepository,
    private readonly service: HotfixFinishService,
  ) {
    super(repo);
  }

  async handle(): Promise<void> {
    const branch = await this.pickBranch(BranchType.hotfix.prefix);
    if (!branch) {
      return;
    }

    let main = '';
    await this.withProgress(`Finishing hotfix '${branch}'...`, async () => {
      main = await this.service.execute(branch);
    });

    this.info(`✅ Hotfix '${branch}' merged into ${main} and develop, tag created, branches deleted`);
  }
}
