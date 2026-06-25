import { BranchVersion } from '@domain/branch/branch-version';

/**
 * Value object for a git tag. Built from a version with the conventional 'v'
 * prefix (1.0.0 → v1.0.0). Immutable and self-validating through BranchVersion.
 */
export class BranchTag {
  readonly value: string;

  /** Builds a tag from a version (adds the conventional 'v' prefix). */
  constructor(version: BranchVersion) {
    this.value = `v${version.value}`;
  }

  toString(): string {
    return this.value;
  }
}
