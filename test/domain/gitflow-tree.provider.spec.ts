import { describe, expect, it } from 'vitest';

import { GitflowTreeProvider } from '@presentation/gitflow-tree.provider';

describe('GitflowTreeProvider', () => {
  const provider = new GitflowTreeProvider();

  it('shows Init plus the four branch-type groups at the root', () => {
    const roots = provider.getChildren();
    const labels = roots.map((n) => n.label);
    expect(labels).toEqual(['Init', 'Feature', 'Bugfix', 'Release', 'Hotfix']);
  });

  it('wires the Init node to the gitflow.init command', () => {
    const init = provider.getChildren().find((n) => n.label === 'Init');
    expect(init?.command?.command).toBe('gitflow.init');
  });

  it('expands each group into Start and Finish actions', () => {
    const feature = provider.getChildren().find((n) => n.label === 'Feature');
    const actions = provider.getChildren(feature);
    expect(actions.map((a) => a.label)).toEqual(['Start', 'Finish']);
  });

  it('wires each group action to the matching command', () => {
    const cases = [
      { group: 'Feature', start: 'gitflow.featureStart', finish: 'gitflow.featureFinish' },
      { group: 'Bugfix', start: 'gitflow.bugfixStart', finish: 'gitflow.bugfixFinish' },
      { group: 'Release', start: 'gitflow.releaseStart', finish: 'gitflow.releaseFinish' },
      { group: 'Hotfix', start: 'gitflow.hotfixStart', finish: 'gitflow.hotfixFinish' },
    ];
    for (const c of cases) {
      const group = provider.getChildren().find((n) => n.label === c.group);
      const [start, finish] = provider.getChildren(group);
      expect(start.command?.command).toBe(c.start);
      expect(finish.command?.command).toBe(c.finish);
    }
  });

  it('getTreeItem returns the node itself', () => {
    const [node] = provider.getChildren();
    expect(provider.getTreeItem(node)).toBe(node);
  });

  it('returns no children for an unknown node', () => {
    const orphan = provider.getChildren().find((n) => n.label === 'Init');
    expect(provider.getChildren(orphan)).toEqual([]);
  });
});
