import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GitflowService } from '@domain/gitflow/gitflow-service';
import { GitRepository } from '@infrastructure/git/git-repository.service';

function makeRepo(overrides: Partial<Record<keyof GitRepository, unknown>> = {}): GitRepository {
  const repo = {
    localBranchExists: vi.fn(() => Promise.resolve(true)),
    hasUncommittedChanges: vi.fn(() => Promise.resolve(false)),
    remoteExists: vi.fn(() => Promise.resolve(true)),
    ...overrides,
  };
  return repo as unknown as GitRepository;
}

describe('GitflowService.getMainBranch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns main when it exists', async () => {
    const repo = makeRepo({ localBranchExists: vi.fn((b: string) => Promise.resolve(b === 'main')) });
    expect(await new GitflowService(repo).getMainBranch()).toBe('main');
  });

  it('falls back to master', async () => {
    const repo = makeRepo({ localBranchExists: vi.fn((b: string) => Promise.resolve(b === 'master')) });
    expect(await new GitflowService(repo).getMainBranch()).toBe('master');
  });

  it('throws when neither main nor master exists', async () => {
    const repo = makeRepo({ localBranchExists: vi.fn(() => Promise.resolve(false)) });
    await expect(new GitflowService(repo).getMainBranch()).rejects.toThrow(/No main branch/);
  });
});

describe('GitflowService.resolveStartsFrom', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves the main-branch placeholder to the actual main branch', async () => {
    const repo = makeRepo({ localBranchExists: vi.fn((b: string) => Promise.resolve(b === 'main')) });
    expect(await new GitflowService(repo).resolveStartsFrom('@main')).toBe('main');
  });

  it('returns a normal branch unchanged', async () => {
    expect(await new GitflowService(makeRepo()).resolveStartsFrom('develop')).toBe('develop');
  });
});

describe('GitflowService.ensureBranch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes when the branch exists', async () => {
    const repo = makeRepo({ localBranchExists: vi.fn(() => Promise.resolve(true)) });
    await expect(new GitflowService(repo).ensureBranch('develop')).resolves.toBeUndefined();
  });

  it('throws a clear message when the branch does not exist', async () => {
    const repo = makeRepo({ localBranchExists: vi.fn(() => Promise.resolve(false)) });
    await expect(new GitflowService(repo).ensureBranch('develop')).rejects.toThrow(/does not exist/);
  });
});

describe('GitflowService.ensureCleanTree', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes on a clean tree', async () => {
    const repo = makeRepo({ hasUncommittedChanges: vi.fn(() => Promise.resolve(false)) });
    await expect(new GitflowService(repo).ensureCleanTree()).resolves.toBeUndefined();
  });

  it('throws when there are uncommitted changes', async () => {
    const repo = makeRepo({ hasUncommittedChanges: vi.fn(() => Promise.resolve(true)) });
    await expect(new GitflowService(repo).ensureCleanTree()).rejects.toThrow(/uncommitted changes/);
  });
});

describe('GitflowService.ensureOriginExists', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes when origin is configured', async () => {
    const repo = makeRepo({ remoteExists: vi.fn(() => Promise.resolve(true)) });
    await expect(new GitflowService(repo).ensureOriginExists()).resolves.toBeUndefined();
  });

  it('throws a clear, actionable message when origin is missing', async () => {
    const repo = makeRepo({ remoteExists: vi.fn(() => Promise.resolve(false)) });
    await expect(new GitflowService(repo).ensureOriginExists()).rejects.toThrow(/git remote add origin/);
  });

  it('checks specifically for the origin remote', async () => {
    const remoteExists = vi.fn(() => Promise.resolve(true));
    await new GitflowService(makeRepo({ remoteExists })).ensureOriginExists();
    expect(remoteExists).toHaveBeenCalledWith('origin');
  });
});
