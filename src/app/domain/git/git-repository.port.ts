import { IGitRunner } from '@domain/git/git-runner.port';

/**
 * Port describing everything the gitflow domain and use cases need from a git
 * repository. Infrastructure provides the concrete implementation; the domain
 * depends only on this abstraction (dependency-inversion).
 */
export interface IGitRepository {
  /** Access to the output channel for operation traces. */
  readonly output: IGitRunner;

  // Queries
  getCurrentBranch(): Promise<string>;
  getLocalBranches(prefix: string): Promise<string[]>;
  localBranchExists(branch: string): Promise<boolean>;
  remoteBranchExists(branch: string): Promise<boolean>;
  getSha(ref: string): Promise<string>;
  isMerging(): Promise<boolean>;
  hasUncommittedChanges(): Promise<boolean>;
  hasCommits(): Promise<boolean>;
  remoteExists(remote: string): Promise<boolean>;

  // Actions
  checkout(branch: string): Promise<void>;
  checkoutNew(branch: string, from?: string): Promise<void>;
  pull(branch: string): Promise<void>;
  pushNewBranch(branch: string): Promise<void>;
  push(...refs: string[]): Promise<void>;
  mergeNoFf(source: string): Promise<void>;
  abortMerge(): Promise<void>;
  resetHard(sha: string): Promise<void>;
  createTag(name: string, message: string): Promise<void>;
  deleteTag(name: string): Promise<void>;
  deleteLocalBranch(branch: string): Promise<void>;
  deleteRemoteBranchSafe(branch: string): Promise<void>;
}
