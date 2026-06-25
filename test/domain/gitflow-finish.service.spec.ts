import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GitflowFinish } from '@domain/gitflow/gitflow-finish.service';
import { GitflowMerge } from '@domain/gitflow/gitflow-merge.service';
import { GitflowService } from '@domain/gitflow/gitflow-service';
import { GitRepository } from '@infrastructure/git/git-repository.service';

/**
 * Builds a GitRepository test double. Each git action is a spy that records the
 * call; queries return configurable values. `output.log` is stubbed so the
 * rollback path can write without a real output channel.
 */
function makeRepo(overrides: Partial<Record<keyof GitRepository, unknown>> = {}): GitRepository {
  const calls: string[] = [];
  const repo = {
    calls,
    checkout: vi.fn((b: string) => {
      calls.push(`checkout ${b}`);
      return Promise.resolve();
    }),
    pull: vi.fn((b: string) => {
      calls.push(`pull ${b}`);
      return Promise.resolve();
    }),
    getSha: vi.fn((ref: string) => Promise.resolve(`sha-${ref}`)),
    mergeNoFf: vi.fn((s: string) => {
      calls.push(`merge ${s}`);
      return Promise.resolve();
    }),
    abortMerge: vi.fn(() => {
      calls.push('abort');
      return Promise.resolve();
    }),
    resetHard: vi.fn((sha: string) => {
      calls.push(`reset ${sha}`);
      return Promise.resolve();
    }),
    createTag: vi.fn((n: string) => {
      calls.push(`tag ${n}`);
      return Promise.resolve();
    }),
    deleteTag: vi.fn(() => Promise.resolve()),
    push: vi.fn((...refs: string[]) => {
      calls.push(`push ${refs.join(' ')}`);
      return Promise.resolve();
    }),
    deleteLocalBranch: vi.fn((b: string) => {
      calls.push(`delete-local ${b}`);
      return Promise.resolve();
    }),
    deleteRemoteBranchSafe: vi.fn((b: string) => {
      calls.push(`delete-remote ${b}`);
      return Promise.resolve();
    }),
    isMerging: vi.fn(() => Promise.resolve(false)),
    localBranchExists: vi.fn(() => Promise.resolve(true)),
    output: { log: vi.fn(), show: vi.fn() },
    ...overrides,
  };
  return repo as unknown as GitRepository;
}

function makeFinish(repo: GitRepository, main = 'main'): GitflowFinish {
  const config = new GitflowService(repo);
  vi.spyOn(config, 'getMainBranch').mockResolvedValue(main);
  return new GitflowFinish(repo, config, new GitflowMerge(repo));
}

describe('GitflowFinish.finishTagged', () => {
  beforeEach(() => vi.clearAllMocks());

  it('happy path: merges develop first, then main, tags and pushes atomically', async () => {
    const repo = makeRepo();
    const finish = makeFinish(repo);

    const main = await finish.finishTagged({
      prefix: 'release',
      name: '1.0.0',
      tag: 'v1.0.0',
      tagMessage: 'Release v1.0.0',
    });

    expect(main).toBe('main');
    const calls = (repo as unknown as { calls: string[] }).calls;

    expect(calls.indexOf('merge release/1.0.0')).toBeGreaterThanOrEqual(0);
    expect(calls).toContain('tag v1.0.0');
    expect(calls).toContain('push --atomic main develop --tags');
    expect(calls).toContain('delete-local release/1.0.0');
    // remote branch is deleted before the local one (avoids upstream-not-merged)
    expect(calls.indexOf('delete-remote release/1.0.0')).toBeLessThan(calls.indexOf('delete-local release/1.0.0'));
    // the flow ends back on develop (the last checkout is develop, after delete)
    const checkouts = calls.filter((c) => c.startsWith('checkout '));
    expect(checkouts[checkouts.length - 1]).toBe('checkout develop');
  });

  it('merges into develop BEFORE main (order matters for safety)', async () => {
    const order: string[] = [];
    const repo = makeRepo({
      checkout: vi.fn((b: string) => {
        order.push(`checkout ${b}`);
        return Promise.resolve();
      }),
    });
    const finish = makeFinish(repo);

    await finish.finishTagged({ prefix: 'release', name: '2.0.0', tag: 'v2.0.0', tagMessage: 'Release v2.0.0' });

    const mergePhase = order.slice(order.findIndex((c, i) => c === 'checkout develop' && i > 1));
    expect(mergePhase[0]).toBe('checkout develop');
    expect(mergePhase).toContain('checkout main');
    expect(mergePhase.indexOf('checkout develop')).toBeLessThan(mergePhase.indexOf('checkout main'));
  });

  it('on develop conflict: aborts, rolls back both branches, no tag, rethrows', async () => {
    const repo = makeRepo({
      mergeNoFf: vi.fn(() => Promise.reject(new Error('CONFLICT'))),
      isMerging: vi.fn(() => Promise.resolve(true)),
    });
    const finish = makeFinish(repo);

    await expect(
      finish.finishTagged({ prefix: 'release', name: '3.0.0', tag: 'v3.0.0', tagMessage: 'Release v3.0.0' }),
    ).rejects.toThrow();

    expect(repo.createTag).not.toHaveBeenCalled();
    expect(repo.resetHard).toHaveBeenCalledWith('sha-main');
    expect(repo.resetHard).toHaveBeenCalledWith('sha-develop');
  });

  it('when the rollback itself fails, throws a visible "inconsistent state" error', async () => {
    const repo = makeRepo({
      // the finish fails at merge...
      mergeNoFf: vi.fn(() => Promise.reject(new Error('CONFLICT'))),
      isMerging: vi.fn(() => Promise.resolve(true)),
      // ...and the rollback fails too (reset --hard cannot run)
      resetHard: vi.fn(() => Promise.reject(new Error('reset failed'))),
    });
    const finish = makeFinish(repo);

    await expect(
      finish.finishTagged({ prefix: 'release', name: '4.0.0', tag: 'v4.0.0', tagMessage: 'Release v4.0.0' }),
    ).rejects.toThrow(/inconsistent state/);
  });
});
