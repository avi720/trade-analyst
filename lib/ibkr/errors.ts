/**
 * Thrown when IBKR returns a transient "not ready yet" error.
 * The sync pipeline uses this to skip updating lastSyncAt so the next
 * scheduled fire retries without waiting the full polling interval.
 */
export class IbkrTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IbkrTransientError";
  }
}
