/**
 * Default values of the gitflow convention that do not belong to a specific
 * branch type. Single place where they are exposed, in the style of a defaults
 * class: if they become configurable in the future, this is their factory origin.
 */
export class GitflowDefaults {
  /** Integration branch. */
  static readonly developBranch = 'develop';

  /** Main branch candidates, in order of preference. */
  static readonly mainBranchCandidates = ['main', 'master'] as const;

  /**
   * Marker for "the actual main branch" (main or master), resolved at runtime.
   * Used by types whose base branch is the main one (e.g. hotfix).
   */
  static readonly mainBranchPlaceholder = '@main';

  /** Remote this workflow publishes to. */
  static readonly originRemote = 'origin';
}
