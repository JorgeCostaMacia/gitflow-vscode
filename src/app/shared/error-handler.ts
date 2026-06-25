/** Cross-cutting helpers for handling errors of unknown type. */
export class ErrorHandler {
  /** Safely extracts the message from an error of `unknown` type. */
  static messageOf(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    return String(err);
  }
}
