/**
 * Value object for a branch name (feature/bugfix). Immutable and self-validating:
 * an instance can only exist if the value is valid, so a name reaching git is
 * always safe. Validation lives here (cohesive, single source of truth); the UI
 * uses the static `check` for live feedback without constructing the object.
 *
 * Rejects rather than sanitizes: lowercase letters/digits to start, then
 * lowercase word chars and . _ - / (so it can never be read as a git option).
 * It also enforces git's own ref rules (git check-ref-format) so a name that
 * passes here is always accepted by git.
 */
export class BranchName {
  private static readonly pattern = /^[a-z0-9][a-z0-9._/-]*$/;

  readonly value: string;

  constructor(value: string) {
    const failure = BranchName.check(value);
    if (failure) {
      throw new Error(failure);
    }
    this.value = value.trim();
  }

  /** Returns an error message, or undefined if valid. For UI feedback. */
  static check(value: string): string | undefined {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
      return 'Name cannot be empty';
    }
    if (!BranchName.pattern.test(trimmed)) {
      return 'Invalid name: use lowercase letters, numbers and . _ - / (must start with a letter or number)';
    }
    // Extra rules enforced by git itself (git check-ref-format). Rejecting them
    // here gives a clear message instead of a cryptic git error later.
    if (trimmed.includes('..')) {
      return "Invalid name: '..' is not allowed";
    }
    if (trimmed.includes('//')) {
      return "Invalid name: '//' is not allowed";
    }
    if (trimmed.endsWith('/')) {
      return "Invalid name: cannot end with '/'";
    }
    if (trimmed.endsWith('.')) {
      return "Invalid name: cannot end with '.'";
    }
    if (trimmed.endsWith('.lock')) {
      return "Invalid name: cannot end with '.lock'";
    }
    return undefined;
  }

  toString(): string {
    return this.value;
  }
}
