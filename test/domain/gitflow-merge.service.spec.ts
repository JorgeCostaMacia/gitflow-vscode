import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GitflowMerge } from '@domain/gitflow/gitflow-merge.service';
import { GitRepository } from '@infrastructure/git/git-repository.service';

function makeRepo(overrides: Partial<Record<keyof GitRepository, unknown>> = {}): GitRepository {
  const repo = {
    mergeNoFf: vi.fn(() => Promise.resolve()),
    abortMerge: vi.fn(() => Promise.resolve()),
    isMerging: vi.fn(() => Promise.resolve(false)),
    output: { log: vi.fn(), show: vi.fn() },
    ...overrides,
  };
  return repo as unknown as GitRepository;
}

describe('GitflowMerge.safeMerge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes through on a clean merge', async () => {
    const repo = makeRepo();
    const merge = new GitflowMerge(repo);
    await expect(merge.safeMerge('feature/x', 'develop')).resolves.toBeUndefined();
    expect(repo.abortMerge).not.toHaveBeenCalled();
  });

  it('aborts and throws a clear error on conflict', async () => {
    const repo = makeRepo({
      mergeNoFf: vi.fn(() => Promise.reject(new Error('CONFLICT'))),
      isMerging: vi.fn(() => Promise.resolve(true)),
    });
    const merge = new GitflowMerge(repo);

    await expect(merge.safeMerge('feature/x', 'develop')).rejects.toThrow(/Conflicts while merging/);
    expect(repo.abortMerge).toHaveBeenCalledOnce();
  });

  it('rethrows the original error if it was not a merge conflict', async () => {
    const repo = makeRepo({
      mergeNoFf: vi.fn(() => Promise.reject(new Error('network down'))),
      isMerging: vi.fn(() => Promise.resolve(false)),
    });
    const merge = new GitflowMerge(repo);

    await expect(merge.safeMerge('feature/x', 'develop')).rejects.toThrow(/network down/);
    expect(repo.abortMerge).not.toHaveBeenCalled();
  });
});
