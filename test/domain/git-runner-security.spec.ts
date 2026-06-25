import { describe, expect, it } from 'vitest';

import { GitRunner } from '@infrastructure/git/git-runner.service';

/** A no-op output channel stub. */
const output = { show: () => undefined, appendLine: () => undefined } as never;

describe('GitRunner option-injection guard', () => {
  const runner = new GitRunner('/tmp/nowhere', output);

  it('rejects a positional argument that looks like a long option', async () => {
    await expect(runner.run('checkout', '--upload-pack=evil')).rejects.toThrow(/looks like an option/);
  });

  it('rejects a positional argument that looks like a short option', async () => {
    await expect(runner.run('branch', '-D')).rejects.toThrow(/looks like an option/);
  });

  it('rejects a branch name starting with a dash', async () => {
    await expect(runner.run('checkout', '-b', '-rf')).rejects.toThrow(/looks like an option/);
  });

  it('does not spawn git when an argument is rejected', async () => {
    // If it reached git, a non-existent cwd would throw a different (ENOENT-like)
    // error. We assert the guard message instead, proving git was never called.
    await expect(runner.run('merge', '--evil')).rejects.toThrow(/possible injection/);
  });

  it('allows known flags through the guard (will fail later at git, not at the guard)', async () => {
    // '--no-ff' is an allowed flag; the guard lets it pass. The call then fails
    // at git (bogus repo), but with a git error, not the guard error.
    await expect(runner.run('merge', '--no-ff', '--no-edit', 'develop')).rejects.not.toThrow(/looks like an option/);
  });
});
