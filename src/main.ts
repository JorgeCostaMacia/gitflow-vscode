import * as vscode from 'vscode';

import { BugfixFinishService } from '@application/bugfix-finish.service';
import { BugfixStartService } from '@application/bugfix-start.service';
import { FeatureFinishService } from '@application/feature-finish.service';
import { FeatureStartService } from '@application/feature-start.service';
import { HotfixFinishService } from '@application/hotfix-finish.service';
import { HotfixStartService } from '@application/hotfix-start.service';
import { InitService } from '@application/init.service';
import { ReleaseFinishService } from '@application/release-finish.service';
import { ReleaseStartService } from '@application/release-start.service';
import { GitflowFinish } from '@domain/gitflow/gitflow-finish.service';
import { GitflowMerge } from '@domain/gitflow/gitflow-merge.service';
import { GitflowService } from '@domain/gitflow/gitflow-service';
import { GitRepository } from '@infrastructure/git/git-repository.service';
import { GitRunner } from '@infrastructure/git/git-runner.service';
import { CommandHandler } from '@presentation/command.handler';
import { BugfixFinishHandler } from '@presentation/commands/bugfix-finish.handler';
import { BugfixStartHandler } from '@presentation/commands/bugfix-start.handler';
import { FeatureFinishHandler } from '@presentation/commands/feature-finish.handler';
import { FeatureStartHandler } from '@presentation/commands/feature-start.handler';
import { HotfixFinishHandler } from '@presentation/commands/hotfix-finish.handler';
import { HotfixStartHandler } from '@presentation/commands/hotfix-start.handler';
import { InitHandler } from '@presentation/commands/init.handler';
import { ReleaseFinishHandler } from '@presentation/commands/release-finish.handler';
import { ReleaseStartHandler } from '@presentation/commands/release-start.handler';
import { GitflowTreeProvider } from '@presentation/gitflow-tree.provider';
import { ErrorHandler } from '@shared/error-handler';

/** Wires the dependency graph and returns the handlers keyed by command id. */
function compose(output: vscode.OutputChannel): Record<string, CommandHandler> | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    vscode.window.showErrorMessage('GitFlow: No workspace is open');
    return undefined;
  }

  // Infrastructure
  const runner = new GitRunner(folders[0].uri.fsPath, output);
  const repo = new GitRepository(runner);

  // Domain
  const config = new GitflowService(repo);
  const merge = new GitflowMerge(repo);
  const finish = new GitflowFinish(repo, config, merge);

  // Application + Presentation
  return {
    'gitflow.init': new InitHandler(repo, new InitService(repo, config)),
    'gitflow.featureStart': new FeatureStartHandler(repo, new FeatureStartService(repo, config)),
    'gitflow.featureFinish': new FeatureFinishHandler(repo, new FeatureFinishService(repo, config, merge)),
    'gitflow.bugfixStart': new BugfixStartHandler(repo, new BugfixStartService(repo, config)),
    'gitflow.bugfixFinish': new BugfixFinishHandler(repo, new BugfixFinishService(repo, config, merge)),
    'gitflow.releaseStart': new ReleaseStartHandler(repo, new ReleaseStartService(repo, config)),
    'gitflow.releaseFinish': new ReleaseFinishHandler(repo, new ReleaseFinishService(config, finish)),
    'gitflow.hotfixStart': new HotfixStartHandler(repo, new HotfixStartService(repo, config)),
    'gitflow.hotfixFinish': new HotfixFinishHandler(repo, new HotfixFinishService(config, finish)),
  };
}

export function activate(context: vscode.ExtensionContext): void {
  // Created once and disposed by VS Code when the extension deactivates.
  const output = vscode.window.createOutputChannel('GitFlow');
  context.subscriptions.push(output);

  // Sidebar tree (activity-bar view): static Start/Finish actions per branch type.
  context.subscriptions.push(vscode.window.registerTreeDataProvider('gitflowActions', new GitflowTreeProvider()));

  const commandIds = [
    'gitflow.init',
    'gitflow.featureStart',
    'gitflow.featureFinish',
    'gitflow.bugfixStart',
    'gitflow.bugfixFinish',
    'gitflow.releaseStart',
    'gitflow.releaseFinish',
    'gitflow.hotfixStart',
    'gitflow.hotfixFinish',
  ];

  for (const commandId of commandIds) {
    context.subscriptions.push(
      vscode.commands.registerCommand(commandId, async () => {
        const handlers = compose(output);
        if (!handlers) {
          return;
        }
        try {
          await handlers[commandId].handle();
        } catch (err: unknown) {
          vscode.window.showErrorMessage(`GitFlow error: ${ErrorHandler.messageOf(err)}`);
        }
      }),
    );
  }
}

export function deactivate(): void {
  // Nothing to dispose manually: VS Code cleans up the subscriptions.
}
