import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GitRepository } from '@infrastructure/git/git-repository.service';
import { GitRunner } from '@infrastructure/git/git-runner.service';

/** A throwaway git repo (local + bare remote) under the OS temp dir. */
export class GitSandbox {
  readonly root: string;
  readonly localPath: string;
  readonly remotePath: string;
  readonly repo: GitRepository;

  private constructor(root: string) {
    this.root = root;
    this.localPath = join(root, 'local');
    this.remotePath = join(root, 'remote.git');

    // A GitRunner with a no-op output channel: runs real git, no VS Code needed.
    const output = { show: (): void => undefined, appendLine: (): void => undefined };
    const runner = new GitRunner(this.localPath, output as never);
    this.repo = new GitRepository(runner);
  }

  /** Creates the sandbox: bare remote + local repo with an initial commit on main. */
  static create(): GitSandbox {
    return GitSandbox.createOn('main');
  }

  /** Same as create() but the main branch is called 'master'. */
  static createWithMaster(): GitSandbox {
    return GitSandbox.createOn('master');
  }

  /** Creates a sandbox whose local repo has NO commits (unborn HEAD). */
  static createEmpty(): GitSandbox {
    const root = mkdtempSync(join(tmpdir(), 'gitflow-vscode-test-'));
    const sandbox = new GitSandbox(root);

    execFileSync('git', ['init', '--bare', '-q', sandbox.remotePath], { stdio: 'pipe' });
    execFileSync('git', ['init', '-q', '-b', 'main', sandbox.localPath], { stdio: 'pipe' });
    execFileSync('git', ['config', 'user.email', 'test@test.local'], { cwd: sandbox.localPath, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: sandbox.localPath, stdio: 'pipe' });
    execFileSync('git', ['remote', 'add', 'origin', sandbox.remotePath], { cwd: sandbox.localPath, stdio: 'pipe' });

    return sandbox;
  }

  private static createOn(mainBranch: string): GitSandbox {
    const root = mkdtempSync(join(tmpdir(), 'gitflow-vscode-test-'));
    const sandbox = new GitSandbox(root);

    const run = (cwd: string, ...args: string[]): void => {
      execFileSync('git', args, { cwd: cwd, stdio: 'pipe' });
    };

    // Bare remote
    execFileSync('git', ['init', '--bare', '-q', sandbox.remotePath], { stdio: 'pipe' });

    // Local repo on the chosen main branch
    execFileSync('git', ['init', '-q', '-b', mainBranch, sandbox.localPath], { stdio: 'pipe' });
    run(sandbox.localPath, 'config', 'user.email', 'test@test.local');
    run(sandbox.localPath, 'config', 'user.name', 'Test');
    run(sandbox.localPath, 'remote', 'add', 'origin', sandbox.remotePath);

    writeFileSync(join(sandbox.localPath, 'README.md'), '# Test\n');
    run(sandbox.localPath, 'add', 'README.md');
    run(sandbox.localPath, 'commit', '-q', '-m', 'Initial commit');
    run(sandbox.localPath, 'push', '-q', '-u', 'origin', mainBranch);

    return sandbox;
  }

  /** Runs a raw git command in the local repo and returns trimmed stdout. */
  git(...args: string[]): string {
    return execFileSync('git', args, { cwd: this.localPath, stdio: 'pipe' }).toString().trim();
  }

  /** Returns the currently checked-out branch name. */
  currentBranch(): string {
    return this.git('branch', '--show-current');
  }

  /** Creates develop from main and publishes it (equivalent to init). */
  initDevelop(): void {
    this.git('checkout', '-q', 'main');
    this.git('checkout', '-q', '-b', 'develop');
    this.git('push', '-q', '-u', 'origin', 'develop');
  }

  /** Makes a real commit on the current branch. */
  commitFile(name: string, content: string, message: string): void {
    writeFileSync(join(this.localPath, name), content);
    this.git('add', name);
    this.git('commit', '-q', '-m', message);
  }

  /** Writes and stages a file but does NOT commit, leaving the tree dirty. */
  commitFileWithoutCommit(name: string, content: string): void {
    writeFileSync(join(this.localPath, name), content);
    this.git('add', name);
  }

  localBranches(): string[] {
    return this.git('branch', '--format=%(refname:short)').split('\n').filter(Boolean);
  }

  remoteBranches(): string[] {
    return this.git('ls-remote', '--heads', 'origin')
      .split('\n')
      .filter(Boolean)
      .map((l) => l.replace(/.*refs\/heads\//, ''));
  }

  tags(): string[] {
    return this.git('tag').split('\n').filter(Boolean);
  }

  /** Removes the sandbox from disk. */
  destroy(): void {
    rmSync(this.root, { recursive: true, force: true });
  }
}
