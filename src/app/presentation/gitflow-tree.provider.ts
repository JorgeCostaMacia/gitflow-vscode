import * as vscode from 'vscode';

/**
 * A node in the GitFlow sidebar tree. Group nodes (feature/bugfix/release/hotfix)
 * are expandable and have no command; action nodes (Start/Finish) are leaves that
 * run a registered command when clicked.
 */
class GitflowNode extends vscode.TreeItem {
  constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState, icon: string, command?: string) {
    super(label, collapsibleState);
    this.iconPath = new vscode.ThemeIcon(icon);
    if (command) {
      this.command = { command, title: label };
    }
  }
}

/** Describes a branch-type group and the command ids of its Start/Finish actions. */
interface GroupSpec {
  label: string;
  icon: string;
  start: string;
  finish: string;
}

/**
 * Provides the static GitFlow action tree shown in the activity-bar view: four
 * branch-type groups, each with a Start and a Finish action that triggers the
 * corresponding command. Presentation only — it triggers existing commands and
 * knows nothing about git.
 */
export class GitflowTreeProvider implements vscode.TreeDataProvider<GitflowNode> {
  private static readonly groups: GroupSpec[] = [
    { label: 'Feature', icon: 'git-branch', start: 'gitflow.featureStart', finish: 'gitflow.featureFinish' },
    { label: 'Bugfix', icon: 'bug', start: 'gitflow.bugfixStart', finish: 'gitflow.bugfixFinish' },
    { label: 'Release', icon: 'rocket', start: 'gitflow.releaseStart', finish: 'gitflow.releaseFinish' },
    { label: 'Hotfix', icon: 'flame', start: 'gitflow.hotfixStart', finish: 'gitflow.hotfixFinish' },
  ];

  getTreeItem(element: GitflowNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: GitflowNode): GitflowNode[] {
    // Root level: an "Init" action plus the four branch-type groups.
    if (!element) {
      const init = new GitflowNode('Init', vscode.TreeItemCollapsibleState.None, 'settings-gear', 'gitflow.init');
      const groups = GitflowTreeProvider.groups.map(
        (g) => new GitflowNode(g.label, vscode.TreeItemCollapsibleState.Expanded, g.icon),
      );
      return [init, ...groups];
    }

    // Group level: the Start/Finish actions for that branch type.
    const group = GitflowTreeProvider.groups.find((g) => g.label === element.label);
    if (!group) {
      return [];
    }
    return [
      new GitflowNode('Start', vscode.TreeItemCollapsibleState.None, 'add', group.start),
      new GitflowNode('Finish', vscode.TreeItemCollapsibleState.None, 'check', group.finish),
    ];
  }
}
