/**
 * Value object for a commit/tag message. Immutable and self-validating: must not
 * be empty. Passed to git as a separate argument, so its content is safe.
 */
export class BranchCommitMessage {
  readonly value: string;

  constructor(value: string) {
    const failure = BranchCommitMessage.check(value);
    if (failure) {
      throw new Error(failure);
    }
    this.value = value.trim();
  }

  /** Returns an error message, or undefined if valid. */
  static check(value: string): string | undefined {
    if (!value?.trim()) {
      return 'Message cannot be empty';
    }
    return undefined;
  }

  toString(): string {
    return this.value;
  }
}
