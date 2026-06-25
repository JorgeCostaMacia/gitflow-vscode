import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BugfixFinishService } from '@application/bugfix-finish.service';
import { BugfixStartService } from '@application/bugfix-start.service';
import { FeatureFinishService } from '@application/feature-finish.service';
import { FeatureStartService } from '@application/feature-start.service';
import { HotfixFinishService } from '@application/hotfix-finish.service';
import { HotfixStartService } from '@application/hotfix-start.service';
import { ReleaseFinishService } from '@application/release-finish.service';
import { ReleaseStartService } from '@application/release-start.service';
import { GitflowFinish } from '@domain/gitflow/gitflow-finish.service';
import { GitflowMerge } from '@domain/gitflow/gitflow-merge.service';
import { GitflowService } from '@domain/gitflow/gitflow-service';

import { GitSandbox } from '../helpers/git-sandbox';

describe('integration: gitflow flows against a real temp repo', () => {
  let sandbox: GitSandbox;
  let config: GitflowService;
  let merge: GitflowMerge;
  let gitflowFinishSvc: GitflowFinish;

  beforeEach(() => {
    sandbox = GitSandbox.create();
    sandbox.initDevelop();
    config = new GitflowService(sandbox.repo);
    merge = new GitflowMerge(sandbox.repo);
    gitflowFinishSvc = new GitflowFinish(sandbox.repo, config, merge);
  });

  afterEach(() => {
    sandbox.destroy();
  });

  it('feature: start creates+publishes, finish merges to develop and deletes branches', async () => {
    const start = new FeatureStartService(sandbox.repo, config);
    const branch = await start.execute('login-oauth');

    expect(branch).toMatch(/^feature\/login-oauth-\d{12}$/);
    expect(sandbox.localBranches()).toContain(branch);
    expect(sandbox.remoteBranches()).toContain(branch);

    // real work on the feature
    sandbox.commitFile('login.ts', 'export const x = 1;\n', 'Implement login');

    const name = branch.replace('feature/', '');
    const finish = new FeatureFinishService(sandbox.repo, config, merge);
    await finish.execute(name);

    // merged into develop, branch gone locally and remotely
    expect(sandbox.localBranches()).not.toContain(branch);
    expect(sandbox.remoteBranches()).not.toContain(branch);
    const developLog = sandbox.git('log', '--oneline', 'develop');
    expect(developLog).toContain('Implement login');
    expect(developLog).toMatch(/Merge branch/);
  });

  it('bugfix: same lifecycle as feature', async () => {
    const start = new BugfixStartService(sandbox.repo, config);
    const branch = await start.execute('fix-modal');
    expect(branch).toMatch(/^bugfix\/fix-modal-\d{12}$/);

    sandbox.commitFile('fix.ts', '// fix\n', 'Fix modal');

    const finish = new BugfixFinishService(sandbox.repo, config, merge);
    await finish.execute(branch.replace('bugfix/', ''));

    expect(sandbox.localBranches()).not.toContain(branch);
    expect(sandbox.git('log', '--oneline', 'develop')).toContain('Fix modal');
  });

  it('release: finish merges to main+develop, tags, keeps tag and deletes branches', async () => {
    const start = new ReleaseStartService(sandbox.repo, config);
    const branch = await start.execute('1.0.0');
    expect(branch).toBe('release/1.0.0');

    sandbox.commitFile('version.txt', '1.0.0\n', 'Bump version');

    const finish = new ReleaseFinishService(config, gitflowFinishSvc);
    const main = await finish.execute('1.0.0');

    expect(main).toBe('main');
    expect(sandbox.tags()).toContain('v1.0.0');
    expect(sandbox.localBranches()).not.toContain('release/1.0.0');
    expect(sandbox.remoteBranches()).not.toContain('release/1.0.0');
    // both main and develop have the merge
    expect(sandbox.git('log', '--oneline', 'main')).toContain('Bump version');
    expect(sandbox.git('log', '--oneline', 'develop')).toContain('Bump version');
    // tag is kept on the remote
    expect(sandbox.git('ls-remote', '--tags', 'origin')).toContain('v1.0.0');
    // the user is left on develop (where work continues), not on main
    expect(sandbox.currentBranch()).toBe('develop');
  });

  it('hotfix: starts from main, finishes to main+develop with a clean version tag', async () => {
    const start = new HotfixStartService(sandbox.repo, config);
    const result = await start.execute('1.0.1');
    expect(result.branch).toBe('hotfix/1.0.1');
    expect(result.main).toBe('main');

    sandbox.commitFile('hotfix.ts', '// urgent\n', 'Urgent fix');

    const finish = new HotfixFinishService(config, gitflowFinishSvc);
    const main = await finish.execute('1.0.1');

    expect(main).toBe('main');
    expect(sandbox.tags()).toContain('v1.0.1');
    expect(sandbox.localBranches()).not.toContain('hotfix/1.0.1');
    expect(sandbox.git('log', '--oneline', 'main')).toContain('Urgent fix');
    expect(sandbox.git('log', '--oneline', 'develop')).toContain('Urgent fix');
    // the user is left on develop, not on main
    expect(sandbox.currentBranch()).toBe('develop');
  });

  it('release rollback: conflict on develop leaves repo untouched (no tag)', async () => {
    // create a conflict: develop and the release touch the same file differently
    sandbox.git('checkout', '-q', 'develop');
    sandbox.commitFile('conflict.txt', 'develop side\n', 'Develop change');
    sandbox.git('push', '-q', 'origin', 'develop');

    const start = new ReleaseStartService(sandbox.repo, config);
    await start.execute('2.0.0');
    sandbox.commitFile('conflict.txt', 'release side\n', 'Release change');
    sandbox.git('push', '-q', 'origin', 'release/2.0.0');

    // move develop further so the merge truly conflicts
    sandbox.git('checkout', '-q', 'develop');
    sandbox.commitFile('conflict.txt', 'develop changed again\n', 'Develop change 2');
    sandbox.git('push', '-q', 'origin', 'develop');

    const mainBefore = sandbox.git('rev-parse', 'main');
    const developBefore = sandbox.git('rev-parse', 'develop');

    const finish = new ReleaseFinishService(config, gitflowFinishSvc);
    await expect(finish.execute('2.0.0')).rejects.toThrow();

    // nothing changed: no tag, branches at their original SHAs, no merge in progress
    expect(sandbox.tags()).not.toContain('v2.0.0');
    expect(sandbox.git('rev-parse', 'main')).toBe(mainBefore);
    expect(sandbox.git('rev-parse', 'develop')).toBe(developBefore);
    expect(sandbox.localBranches()).toContain('release/2.0.0');
  });
});
