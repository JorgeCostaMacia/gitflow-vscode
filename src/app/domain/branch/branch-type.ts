import { GitflowDefaults } from '@domain/gitflow/gitflow-defaults';

/**
 * Models a gitflow branch type and its rules. Centralizes the convention: which
 * branch each type starts from, whether it produces a tag and whether its name
 * carries a timestamp. Services read these rules instead of hardcoding them.
 */
export class BranchType {
  private constructor(
    /** Branch prefix (e.g. 'feature'). */
    readonly prefix: string,
    /** Branch this type starts from. */
    readonly startsFrom: string,
    /** Whether finishing merges into main + develop and creates a tag. */
    readonly isTagged: boolean,
    /** Whether the branch name carries a timestamp suffix (vs. a version). */
    readonly usesTimestamp: boolean,
  ) {}

  static readonly feature = new BranchType('feature', GitflowDefaults.developBranch, false, true);
  static readonly bugfix = new BranchType('bugfix', GitflowDefaults.developBranch, false, true);
  static readonly release = new BranchType('release', GitflowDefaults.developBranch, true, false);
  static readonly hotfix = new BranchType('hotfix', GitflowDefaults.mainBranchPlaceholder, true, false);

  /** Builds the full name `prefix/<name>` for an existing branch (no timestamp added). */
  branchFor(name: string): string {
    return `${this.prefix}/${name}`;
  }

  /**
   * Builds the name for a NEW branch: like branchFor, but appends a timestamp
   * suffix when this type uses one (feature/bugfix), to avoid name collisions.
   */
  newBranchFor(name: string): string {
    const suffix = this.usesTimestamp ? `-${BranchType.timestamp()}` : '';
    return `${this.prefix}/${name}${suffix}`;
  }

  /** Timestamp suffix YYYYMMDDHHMM. */
  private static timestamp(now: Date = new Date()): string {
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${now.getFullYear()}${mm}${dd}${hh}${min}`;
  }
}
