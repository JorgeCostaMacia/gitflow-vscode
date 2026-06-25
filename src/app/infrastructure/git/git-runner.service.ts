import * as cp from 'node:child_process';
import * as vscode from 'vscode';

import { IGitRunner } from '@domain/git/git-runner.port';

/**
 * Safely runs git commands (without a shell) and dumps the trace into a VS Code
 * OutputChannel. This is the only piece that talks to the git binary.
 *
 * Security model:
 *  - Uses execFile (no shell), so arguments are passed literally: no shell
 *    metacharacter injection is possible.
 *  - Guards against argument (option) injection: a data value that begins with
 *    '-' could be misread by git as an option. Callers pass known flags via the
 *    flags allow-list; any other argument that looks like an option is rejected.
 */
export class GitRunner implements IGitRunner {
  private readonly output: vscode.OutputChannel;

  constructor(
    private readonly cwd: string,
    output: vscode.OutputChannel,
  ) {
    this.output = output;
  }

  show(): void {
    this.output.show(true);
  }

  log(message: string): void {
    this.output.appendLine(message);
  }

  /**
   * Runs `git <args>` in the repo. Every argument is checked against option
   * injection: anything that starts with '-' must be an explicitly known git
   * flag, otherwise the call is rejected before reaching git.
   */
  run(...args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const offending = args.find((a) => a.startsWith('-') && !GitRunner.knownFlags.has(a));
      if (offending !== undefined) {
        reject(new Error(`Refusing to run git: argument '${offending}' looks like an option (possible injection).`));
        return;
      }

      this.output.appendLine(`> git ${args.join(' ')}`);

      cp.execFile('git', args, { cwd: this.cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (stdout) {
          this.output.appendLine(stdout);
        }
        if (stderr) {
          this.output.appendLine(stderr);
        }

        if (err) {
          reject(new Error(stderr.trim() || err.message));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  /** Git flags this extension is allowed to pass. Anything else starting with '-' is rejected. */
  private static readonly knownFlags = new Set<string>([
    '-a',
    '-b',
    '-d',
    '-m',
    '-u',
    '--no-ff',
    '--no-edit',
    '--hard',
    '--delete',
    '--tags',
    '--verify',
    '--quiet',
    '--show-current',
    '--list',
    '--porcelain',
    '--abort',
    '--atomic',
  ]);
}
