/**
 * Value object for a release/hotfix version. Immutable and self-validating:
 * strict 3-component SemVer (MAJOR.MINOR.PATCH, optional -prerelease). Validation
 * lives here; the UI uses the static `check` for live feedback.
 */
export class BranchVersion {
  private static readonly pattern = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/;

  readonly value: string;

  constructor(value: string) {
    const failure = BranchVersion.check(value);
    if (failure) {
      throw new Error(failure);
    }
    this.value = value.trim();
  }

  /** Returns an error message, or undefined if valid. For UI feedback. */
  static check(value: string): string | undefined {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
      return 'Version cannot be empty';
    }
    if (!BranchVersion.pattern.test(trimmed)) {
      return 'Invalid version: use SemVer like 1.0.0 (optionally 1.0.0-rc1)';
    }
    return undefined;
  }

  toString(): string {
    return this.value;
  }
}
