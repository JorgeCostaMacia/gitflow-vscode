import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GitRepository } from '@infrastructure/git/git-repository.service';
import { GitRunner } from '@infrastructure/git/git-runner.service';

/**
 * Unit tests for getLocalBranches output parsing. The raw `git branch --list`
 * output has quirks (the current branch is prefixed with '*', leading spaces,
 * trailing newline) that the parser must strip; the prefix must be removed.
 */
function makeRepo(rawOutput: string): GitRepository {
  const runner = { run: vi.fn(() => Promise.resolve(rawOutput)), show: vi.fn(), log: vi.fn() } as unknown as GitRunner;
  return new GitRepository(runner);
}

describe('GitRepository.getLocalBranches (parsing)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns an empty array when there is no output', async () => {
    expect(await makeRepo('').getLocalBranches('feature')).toEqual([]);
  });

  it('strips leading spaces and the prefix', async () => {
    const raw = '  feature/login\n  feature/logout';
    expect(await makeRepo(raw).getLocalBranches('feature')).toEqual(['login', 'logout']);
  });

  it("strips the '*' marker of the current branch", async () => {
    const raw = '* feature/active\n  feature/other';
    expect(await makeRepo(raw).getLocalBranches('feature')).toEqual(['active', 'other']);
  });

  it('keeps nested segments after the prefix', async () => {
    const raw = '  feature/sub/nested';
    expect(await makeRepo(raw).getLocalBranches('feature')).toEqual(['sub/nested']);
  });

  it('ignores blank lines', async () => {
    const raw = '  feature/a\n\n  feature/b\n';
    expect(await makeRepo(raw).getLocalBranches('feature')).toEqual(['a', 'b']);
  });
});
