// Client-safe: imported by the broker tab as well as the sync and reminder code.

// BrokerConnection.lastSyncStatus when IBKR rejects the stored token (rc 1052),
// typically because it passed its 1-year validity.
export const IBRIT_TOKEN_INVALID_STATUS = "TOKEN_INVALID";

// IBKR: a Web Service token is valid for one year per account, and the client
// renews it in the Portal. IBKR doesn't expose the expiry, so it's counted from
// when the token was connected here (BrokerConnection.tokenConnectedAt).
export function ibritTokenExpiresAt(connectedAt: Date): Date {
  const expiresAt = new Date(connectedAt);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
  // Feb 29 + 1 year rolls over to Mar 1; use Feb 28 so reminders aren't a day late.
  if (expiresAt.getUTCMonth() !== connectedAt.getUTCMonth()) expiresAt.setUTCDate(0);
  return expiresAt;
}
