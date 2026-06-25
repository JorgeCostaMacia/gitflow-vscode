import { FeatureFinishService } from '@application/feature-finish.service';
import { BranchType } from '@domain/branch/branch-type';
import { IGitRepository } from '@domain/git/git-repository.port';
import { CommandHandler } from '@presentation/command.handler';

/** Handler for the gitflow.featureFinish command. */
export class FeatureFinishHandler extends CommandHandler {
  constructor(
    repo: IGitRepository,
    private readonly service: FeatureFinishService,
  ) {
    super(repo);
  }

  async handle(): Promise<void> {
    const branch = await this.pickBranch(BranchType.feature.prefix);
    if (!branch) {
      return;
    }

    await this.withProgress(`Finishing feature '${branch}'...`, async () => {
      await this.service.execute(branch);
    });

    this.info(`✅ Feature '${branch}' merged into develop, local and remote branches deleted`);
  }
}
