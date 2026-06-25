import { ReleaseStartService } from '@application/release-start.service';
import { IGitRepository } from '@domain/git/git-repository.port';
import { CommandHandler } from '@presentation/command.handler';

/** Handler for the gitflow.releaseStart command. */
export class ReleaseStartHandler extends CommandHandler {
  constructor(
    repo: IGitRepository,
    private readonly service: ReleaseStartService,
  ) {
    super(repo);
  }

  async handle(): Promise<void> {
    const version = await this.askVersion('Release version', '1.0.0');
    if (!version) {
      return;
    }

    let branch = '';
    await this.withProgress(`Creating release '${version}'...`, async () => {
      branch = await this.service.execute(version);
    });

    this.info(`✅ Release '${branch}' created and published`);
  }
}
