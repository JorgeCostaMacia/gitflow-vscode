import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FeatureStartService } from '@application/feature-start.service';
import { HotfixFinishService } from '@application/hotfix-finish.service';
import { HotfixStartService } from '@application/hotfix-start.service';
import { InitService } from '@application/init.service';
import { GitflowFinish } from '@domain/gitflow/gitflow-finish.service';
import { GitflowMerge } from '@domain/gitflow/gitflow-merge.service';
import { GitflowService } from '@domain/gitflow/gitflow-service';

import { GitSandbox } from '../helpers/git-sandbox';

describe('integration: edge cases and safety', () => {
  let sandbox: GitSandbox;
  let config: GitflowService;
  let merge: GitflowMerge;
  let gitflowFinishSvc: GitflowFinish;

  beforeEach(() => {
    sandbox = GitSandbox.create();
    config = new GitflowService(sandbox.repo);
    merge = new GitflowMerge(sandbox.repo);
    gitflowFinishSvc = new GitflowFinish(sandbox.repo, config, merge);
  });

  afterEach(() => sandbox.destroy());

  describe('InitService', () => {
    it('creates develop from main when it does not exist', async () => {
      const init = new InitService(sandbox.repo, config);

      expect(await init.findMainBranch()).toBe('main');
      expect(await init.developExistsLocally()).toBe(false);

      await init.createDevelopFrom('main');

      expect(await init.developExistsLocally()).toBe(true);
      expect(sandbox.remoteBranches()).toContain('develop');
    });

    it('detects develop already present on the remote', async () => {
      sandbox.initDevelop();
      // remove it locally to simulate a fresh clone that only has it on origin
      sandbox.git('checkout', '-q', 'main');
      sandbox.git('branch', '-D', 'develop');

      const init = new InitService(sandbox.repo, config);
      expect(await init.developExistsLocally()).toBe(false);
      expect(await init.developExistsRemotely()).toBe(true);

      await init.bringDevelopFromRemote();
      expect(await init.developExistsLocally()).toBe(true);
    });
  });

  describe('main branch resolution', () => {
    it('resolves master when there is no main', async () => {
      const sb = GitSandbox.createWithMaster();
      try {
        const cfg = new GitflowService(sb.repo);
        await expect(cfg.getMainBranch()).resolves.toBe('master');
      } finally {
        sb.destroy();
      }
    });
  });

  describe('clean tree guard', () => {
    it('blocks a feature start when there are uncommitted changes', async () => {
      sandbox.initDevelop();
      // dirty the tree
      sandbox.commitFileWithoutCommit('dirty.txt', 'uncommitted\n');

      const start = new FeatureStartService(sandbox.repo, config);
      await expect(start.execute('something')).rejects.toThrow(/uncommitted changes/i);
    });
  });

  describe('hotfix rollback', () => {
    it('conflict on develop leaves repo untouched (no tag, branches intact)', async () => {
      sandbox.initDevelop();

      // a hotfix that will conflict with develop on the same file
      sandbox.git('checkout', '-q', 'develop');
      sandbox.commitFile('shared.txt', 'develop content\n', 'Develop change');
      sandbox.git('push', '-q', 'origin', 'develop');

      const start = new HotfixStartService(sandbox.repo, config);
      await start.execute('9.9.9');
      sandbox.commitFile('shared.txt', 'hotfix content\n', 'Hotfix change');
      sandbox.git('push', '-q', 'origin', 'hotfix/9.9.9');

      sandbox.git('checkout', '-q', 'develop');
      sandbox.commitFile('shared.txt', 'develop changed again\n', 'Develop change 2');
      sandbox.git('push', '-q', 'origin', 'develop');

      const mainBefore = sandbox.git('rev-parse', 'main');
      const developBefore = sandbox.git('rev-parse', 'develop');

      const finish = new HotfixFinishService(config, gitflowFinishSvc);
      await expect(finish.execute('9.9.9')).rejects.toThrow();

      expect(sandbox.tags()).not.toContain('v9.9.9');
      expect(sandbox.git('rev-parse', 'main')).toBe(mainBefore);
      expect(sandbox.git('rev-parse', 'develop')).toBe(developBefore);
      expect(sandbox.localBranches()).toContain('hotfix/9.9.9');
    });
  });

  describe('init guard: repo without commits', () => {
    it('hasCommits is false and ensureHasCommits throws on an unborn repo', async () => {
      const empty = GitSandbox.createEmpty();
      try {
        expect(await empty.repo.hasCommits()).toBe(false);

        const initService = new InitService(empty.repo, new GitflowService(empty.repo));
        await expect(initService.ensureHasCommits()).rejects.toThrow(/no commits yet/);
      } finally {
        empty.destroy();
      }
    });

    it('hasCommits is true once the repo has a commit', async () => {
      expect(await sandbox.repo.hasCommits()).toBe(true);
    });
  });

  describe('origin guard: missing remote', () => {
    it('remoteExists reflects the configured remotes', async () => {
      expect(await sandbox.repo.remoteExists('origin')).toBe(true);
      expect(await sandbox.repo.remoteExists('upstream')).toBe(false);
    });

    it('ensureOriginExists throws an actionable message when origin is removed', async () => {
      sandbox.git('remote', 'remove', 'origin');
      expect(await sandbox.repo.remoteExists('origin')).toBe(false);

      await expect(config.ensureOriginExists()).rejects.toThrow(/git remote add origin/);
    });
  });

  describe('develop publishing and defensive pull', () => {
    it('init publishes develop when it exists locally but not on the remote', async () => {
      // Create develop locally only (not on the remote).
      sandbox.git('branch', 'develop');
      expect(await sandbox.repo.remoteBranchExists('develop')).toBe(false);

      const initService = new InitService(sandbox.repo, config);
      // Simulate the init handler's "exists locally but not remotely" path.
      if (await initService.developExistsLocally()) {
        if (!(await initService.developExistsRemotely())) {
          await initService.publishDevelop();
        }
      }

      sandbox.git('fetch', 'origin');
      expect(await sandbox.repo.remoteBranchExists('develop')).toBe(true);
    });

    it('pull is a no-op on a local-only branch (does not throw)', async () => {
      sandbox.git('branch', 'local-only');
      sandbox.git('checkout', '-q', 'local-only');
      // local-only is not on the remote → pull must not throw
      await expect(sandbox.repo.pull('local-only')).resolves.toBeUndefined();
    });
  });
});
