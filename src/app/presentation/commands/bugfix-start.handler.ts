import { BugfixStartService } from '@application/bugfix-start.service';
import { IGitRepository } from '@domain/git/git-repository.port';
import { CommandHandler } from '@presentation/command.handler';

/** Handler for the gitflow.bugfixStart command. */
export class BugfixStartHandler extends CommandHandler {
  constructor(
    repo: IGitRepository,
    private readonly service: BugfixStartService,
  ) {
    super(repo);
  }

  async handle(): Promise<void> {
    const name = await this.askName('Bugfix name', 'my-bugfix');
    if (!name) {
      return;
    }

    let branch = '';
    await this.withProgress(`Creating bugfix '${name}'...`, async () => {
      branch = await this.service.execute(name);
    });

    this.info(`✅ Bugfix '${branch}' created and published`);
  }
}
