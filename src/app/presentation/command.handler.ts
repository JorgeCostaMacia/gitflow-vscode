import * as vscode from 'vscode';

import { BranchName } from '@domain/branch/branch-name';
import { BranchVersion } from '@domain/branch/branch-version';
import { IGitRepository } from '@domain/git/git-repository.port';

/**
 * Base class for VS Code command handlers. Concentrates user interaction (inputs,
 * quick picks, progress, notifications). The use cases (application) receive
 * already-resolved data and know nothing about VS Code.
 *
 * NOTE: in the next iteration this UI will be extracted into adapters with ports
 * so the handlers become testable without VS Code.
 */
export abstract class CommandHandler {
  protected constructor(protected readonly repo: IGitRepository) {}

  /** Handler entry point (invoked by the VS Code command). */
  abstract handle(): Promise<void>;

  // ─── UI ──────────────────────────────────────────────────────────────────────

  protected async askName(prompt: string, placeholder: string): Promise<string | undefined> {
    const raw = await vscode.window.showInputBox({
      prompt: prompt,
      placeHolder: placeholder,
      // Live feedback via the value object's rule (single source of truth). The
      // service re-validates by constructing the VO, so this is feedback only.
      validateInput: (v) => BranchName.check(v),
    });
    return raw === undefined ? undefined : raw.trim();
  }

  protected async askVersion(prompt: string, placeholder: string): Promise<string | undefined> {
    const raw = await vscode.window.showInputBox({
      prompt: prompt,
      placeHolder: placeholder,
      validateInput: (v) => BranchVersion.check(v),
    });
    return raw === undefined ? undefined : raw.trim();
  }

  /** Selects a branch of a type; shortcut if we are on one or if there is only one. */
  protected async pickBranch(prefix: string): Promise<string | undefined> {
    const current = await this.repo.getCurrentBranch();
    const branches = await this.repo.getLocalBranches(prefix);

    if (!branches.length) {
      vscode.window.showWarningMessage(`No local ${prefix}/* branches`);
      return undefined;
    }

    if (current.startsWith(`${prefix}/`)) {
      const currentName = current.replace(`${prefix}/`, '');
      const seeAll = '$(list-unordered) See all...';
      const confirm = await vscode.window.showQuickPick(
        [
          { label: currentName, description: '← current branch' },
          { label: seeAll, description: `${branches.length} ${prefix} branch(es)` },
        ],
        { placeHolder: `Finish ${prefix}` },
      );
      if (!confirm) {
        return undefined;
      }
      if (confirm.label !== seeAll) {
        return currentName;
      }
    } else if (branches.length === 1) {
      return branches[0];
    }

    const items = branches.map((b) => ({
      label: b,
      description: current === `${prefix}/${b}` ? '← current branch' : '',
    }));
    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: `Select the ${prefix} branch to finish`,
    });
    return picked?.label;
  }

  protected async withProgress(title: string, task: () => Promise<void>): Promise<void> {
    this.repo.output.show();
    this.repo.output.log(`\n──────────────────────────────`);
    this.repo.output.log(title);
    this.repo.output.log(`──────────────────────────────`);

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: title, cancellable: false },
      task,
    );
  }

  protected info(message: string): void {
    vscode.window.showInformationMessage(message);
  }

  protected async confirm(question: string, yesLabel: string): Promise<boolean> {
    const picked = await vscode.window.showQuickPick([{ label: yesLabel }, { label: '❌ Cancel' }], {
      placeHolder: question,
    });
    return picked?.label === yesLabel;
  }
}
