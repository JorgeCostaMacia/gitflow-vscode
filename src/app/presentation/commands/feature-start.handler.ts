import { FeatureStartService } from '@application/feature-start.service';
import { IGitRepository } from '@domain/git/git-repository.port';
import { CommandHandler } from '@presentation/command.handler';

/** Handler for the gitflow.featureStart command. */
export class FeatureStartHandler extends CommandHandler {
  constructor(
    repo: IGitRepository,
    private readonly service: FeatureStartService,
  ) {
    super(repo);
  }

  async handle(): Promise<void> {
    const name = await this.askName('Feature name', 'my-new-feature');
    if (!name) {
      return;
    }

    let branch = '';
    await this.withProgress(`Creating feature '${name}'...`, async () => {
      branch = await this.service.execute(name);
    });

    this.info(`✅ Feature '${branch}' created and published`);
  }
}
