import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InitService } from '@application/init.service';
import { GitflowService } from '@domain/gitflow/gitflow-service';
import { GitRepository } from '@infrastructure/git/git-repository.service';

function makeRepo(overrides: Partial<Record<keyof GitRepository, unknown>> = {}): GitRepository {
  const repo = {
    hasCommits: vi.fn(() => Promise.resolve(true)),
    localBranchExists: vi.fn(() => Promise.resolve(false)),
    remoteBranchExists: vi.fn(() => Promise.resolve(false)),
    checkout: vi.fn(() => Promise.resolve()),
    checkoutNew: vi.fn(() => Promise.resolve()),
    pull: vi.fn(() => Promise.resolve()),
    pushNewBranch: vi.fn(() => Promise.resolve()),
    output: { log: vi.fn(), show: vi.fn() },
    ...overrides,
  };
  return repo as unknown as GitRepository;
}

function makeService(repo: GitRepository): InitService {
  return new InitService(repo, new GitflowService(repo));
}

describe('InitService.ensureHasCommits', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes when the repo has at least one commit', async () => {
    const repo = makeRepo({ hasCommits: vi.fn(() => Promise.resolve(true)) });
    await expect(makeService(repo).ensureHasCommits()).resolves.toBeUndefined();
  });

  it('throws a clear message when the repo has no commits', async () => {
    const repo = makeRepo({ hasCommits: vi.fn(() => Promise.resolve(false)) });
    await expect(makeService(repo).ensureHasCommits()).rejects.toThrow(/no commits yet/);
  });
});

describe('InitService.findMainBranch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns main when it exists', async () => {
    const repo = makeRepo({
      localBranchExists: vi.fn((b: string) => Promise.resolve(b === 'main')),
    });
    expect(await makeService(repo).findMainBranch()).toBe('main');
  });

  it('returns master when main is absent but master exists', async () => {
    const repo = makeRepo({
      localBranchExists: vi.fn((b: string) => Promise.resolve(b === 'master')),
    });
    expect(await makeService(repo).findMainBranch()).toBe('master');
  });

  it('returns undefined when neither exists', async () => {
    const repo = makeRepo({ localBranchExists: vi.fn(() => Promise.resolve(false)) });
    expect(await makeService(repo).findMainBranch()).toBeUndefined();
  });
});
