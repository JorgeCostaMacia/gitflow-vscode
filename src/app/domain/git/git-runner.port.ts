/** Contract for the low-level git runner: writing operation traces to the host. */
export interface IGitRunner {
  show(): void;
  log(message: string): void;
}
