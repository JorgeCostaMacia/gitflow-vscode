/** Parameters to finish a branch that goes to main + develop with a tag. */
export interface GitflowFinishTaggedOptions {
  /** Branch prefix (e.g. 'release'). */
  prefix: string;
  /** Branch name without prefix (the version, e.g. '1.0.0'). Used for the branch. */
  name: string;
  /** The tag to create (e.g. 'v1.0.0'). Separate from name so the branch and tag can differ. */
  tag: string;
  /** Annotated tag message. */
  tagMessage: string;
}
