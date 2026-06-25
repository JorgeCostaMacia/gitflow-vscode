import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GitRepository } from '@infrastructure/git/git-repository.service';
import { GitRunner } from '@infrastructure/git/git-runner.service';

/**
 * Unit tests for the defensive pull: it must swallow ONLY the "couldn't find
 * remote ref" case (local-only branch) and re-throw everything else unchanged.
 */
function makeRepo(runImpl: (...args: string[]) => Promise<string>): GitRepository {
  const runner = { run: vi.fn(runImpl), show: vi.fn(), log: vi.fn() } as unknown as GitRunner;
  return new GitRepository(runner);
}

describe('GitRepository.pull (defensive)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('completes normally when the pull succeeds', async () => {
    const repo = makeRepo(() => Promise.resolve(''));
    await expect(repo.pull('develop')).resolves.toBeUndefined();
  });

  it('treats "couldn\'t find remote ref" as a no-op (local-only branch)', async () => {
    const repo = makeRepo(() => Promise.reject(new Error("fatal: couldn't find remote ref develop")));
    await expect(repo.pull('develop')).resolves.toBeUndefined();
  });

  it('re-throws any other error (network, conflict, auth)', async () => {
    const repo = makeRepo(() => Promise.reject(new Error('fatal: unable to access: Could not resolve host')));
    await expect(repo.pull('develop')).rejects.toThrow(/Could not resolve host/);
  });
});
