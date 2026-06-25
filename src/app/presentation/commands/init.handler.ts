import * as vscode from 'vscode';

import { InitService } from '@application/init.service';
import { IGitRepository } from '@domain/git/git-repository.port';
import { CommandHandler } from '@presentation/command.handler';

/** Handler for the gitflow.init command: orchestrates the interactive init flow. */
export class InitHandler extends CommandHandler {
  constructor(
    repo: IGitRepository,
    private readonly service: InitService,
  ) {
    super(repo);
  }

  async handle(): Promise<void> {
    await this.service.ensureHasCommits();
    await this.service.ensureOriginExists();
    const main = await this.resolveMainBranch();
    if (!main) {
      return;
    }
    await this.ensureDevelop(main);
    this.info(`✅ GitFlow initialized — main branch: '${main}', develop ready`);
  }

  private async resolveMainBranch(): Promise<string | undefined> {
    const existing = await this.service.findMainBranch();
    if (existing) {
      return existing;
    }

    const picked = await vscode.window.showQuickPick([{ label: 'main' }, { label: 'master' }], {
      placeHolder: 'No main or master found. Which one do you want to use?',
    });
    if (!picked) {
      return undefined;
    }

    await this.withProgress(`Creating branch '${picked.label}'...`, async () => {
      await this.service.createMainBranch(picked.label);
    });
    return picked.label;
  }

  private async ensureDevelop(main: string): Promise<void> {
    if (await this.service.developExistsLocally()) {
      // develop exists locally; make sure it is also published, otherwise later
      // start/finish operations would fail when pulling it from origin.
      if (!(await this.service.developExistsRemotely())) {
        await this.withProgress('Publishing develop to origin...', async () => {
          await this.service.publishDevelop();
        });
      }
      return;
    }

    if (await this.service.developExistsRemotely()) {
      await this.withProgress('Fetching develop from origin...', async () => {
        await this.service.bringDevelopFromRemote();
      });
      return;
    }

    const ok = await this.confirm(`'develop' does not exist. Create it from '${main}'?`, '✅ Yes, create develop');
    if (!ok) {
      return;
    }

    await this.withProgress(`Creating develop from ${main}...`, async () => {
      await this.service.createDevelopFrom(main);
    });
  }
}
