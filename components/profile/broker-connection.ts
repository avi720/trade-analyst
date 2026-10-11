// Shape returned by GET /api/ibkr/connection — never includes the token.
export interface ConnectionStatus {
  id?: string;
  brokerName?: string;
  flexQueryIdActivity?: string;
  pricePollingIntervalMin?: number;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncError?: string | null;
  tokenConnectedAt?: string | null;
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע'`;
  return new Date(iso).toLocaleDateString("he-IL");
}
