// Minimal 'vscode' stub for unit tests. Only what the imported classes touch.
export const window = {
  createOutputChannel: (): { show: () => void; appendLine: () => void } => ({
    show: (): void => undefined,
    appendLine: (): void => undefined,
  }),
};

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class ThemeIcon {
  constructor(public readonly id: string) {}
}

export class TreeItem {
  iconPath?: ThemeIcon;
  command?: { command: string; title: string };
  constructor(
    public readonly label: string,
    public readonly collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None,
  ) {}
}
