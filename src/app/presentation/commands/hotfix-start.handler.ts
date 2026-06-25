import { HotfixStartService } from '@application/hotfix-start.service';
import { IGitRepository } from '@domain/git/git-repository.port';
import { CommandHandler } from '@presentation/command.handler';

/** Handler for the gitflow.hotfixStart command. */
export class HotfixStartHandler extends CommandHandler {
  constructor(
    repo: IGitRepository,
    private readonly service: HotfixStartService,
  ) {
    super(repo);
  }

  async handle(): Promise<void> {
    const version = await this.askVersion('Hotfix version', '1.0.1');
    if (!version) {
      return;
    }

    let result = { branch: '', main: '' };
    await this.withProgress(`Creating hotfix '${version}'...`, async () => {
      result = await this.service.execute(version);
    });

    this.info(`✅ Hotfix '${result.branch}' created from ${result.main} and published`);
  }
}
