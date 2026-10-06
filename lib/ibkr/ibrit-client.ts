import JSZip from "jszip";
import { IbkrTransientError } from "@/lib/ibkr/flex-client";

// IBKR Reporting Integration (IBRIT) Web Service, feed configured for Trade
// Analyst by reportingintegration@interactivebrokers.com. Unlike Flex there is
// no two-step request: one GET returns the files, or a JSON error.
const IBRIT_URL = "https://ndcdyn.interactivebrokers.com/Reporting/IBRITService";
const IBRIT_SERVICE_CODE = "tradeanalyst-ws";

// Observed on the live service: a wider fd/td range is rejected with rc 1059.
export const IBRIT_MAX_RANGE_DAYS = 365;

// IBKR's documented limit is 1 fetch per second and 10 per minute (rc 1018).
// Requests may overlap: a range takes ~10s to answer, so starts are what's limited.
const MIN_REQUEST_GAP_MS = 1_100;
const RATE_WINDOW_MS = 60_000;
export const IBRIT_MAX_REQUESTS_PER_MINUTE = 10;

// rc 1052: the user pasted a wrong token or query ID. Not retryable.
export class IbritCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IbritCredentialsError";
  }
}

const TRANSIENT_CODES = new Set([
  1018, // too many requests
  1019, // statement generation in progress
  1410, // "cannot be processed at this time" — seen when requests overlapped
]);
// "No statement for the account/dates requested". IBKR documents 1010; a
// date range before the account opened came back as 1600 on the live service.
const NO_DATA_CODES = new Set([1010, 1600]);
const BAD_CREDENTIALS_CODE = 1052;

// Start times claimed by this process, ascending; may include future slots.
const claimedStarts: number[] = [];

// Throttles every IBRIT request made by this process. The slot is claimed
// synchronously, so concurrent callers queue instead of racing.
async function waitForRequestSlot(): Promise<void> {
  const now = Date.now();
  while (claimedStarts.length > 0 && claimedStarts[0] <= now - RATE_WINDOW_MS) claimedStarts.shift();

  let slot = now;
  const last = claimedStarts.at(-1);
  if (last !== undefined) slot = Math.max(slot, last + MIN_REQUEST_GAP_MS);
  if (claimedStarts.length >= IBRIT_MAX_REQUESTS_PER_MINUTE) {
    const oldestInWindow = claimedStarts[claimedStarts.length - IBRIT_MAX_REQUESTS_PER_MINUTE];
    slot = Math.max(slot, oldestInWindow + RATE_WINDOW_MS);
  }
  claimedStarts.push(slot);

  if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
}

function isZip(buf: Uint8Array): boolean {
  return buf.length > 1 && buf[0] === 0x50 && buf[1] === 0x4b;
}

// Returns normally only for "no statement for these dates"; every other error code throws.
function handleErrorBody(text: string): void {
  let body: { rc?: unknown; msg?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`IBRIT: unexpected response: ${text.slice(0, 200)}`);
  }
  const rc = Number(body.rc);
  const msg = `IBRIT (${body.rc}): ${typeof body.msg === "string" ? body.msg : "unknown error"}`;
  if (NO_DATA_CODES.has(rc)) return;
  if (rc === BAD_CREDENTIALS_CODE) throw new IbritCredentialsError(msg);
  if (TRANSIENT_CODES.has(rc)) throw new IbkrTransientError(msg);
  throw new Error(msg);
}

/**
 * Fetches every report-date file between `from` and `to` (yyyymmdd, inclusive,
 * at most IBRIT_MAX_RANGE_DAYS apart). Each file is one report date and holds
 * the Position and Activity sections. Returns [] when IBKR has no statement
 * for the range, e.g. dates before the account was opened.
 */
export async function fetchIbritRange(
  token: string,
  queryId: string,
  from: string,
  to: string,
): Promise<string[]> {
  const params = new URLSearchParams({ t: token, q: queryId, s: IBRIT_SERVICE_CODE, fd: from, td: to });

  await waitForRequestSlot();
  console.log(`[ibrit] fetch fd=${from} td=${to}`);
  const res = await fetch(`${IBRIT_URL}?${params}`, { headers: { "User-Agent": "Java" } });
  if (!res.ok) throw new Error(`IBRIT HTTP error ${res.status}`);

  const buf = new Uint8Array(await res.arrayBuffer());
  if (!isZip(buf)) {
    const text = new TextDecoder().decode(buf);
    if (text.trimStart().startsWith("{")) {
      handleErrorBody(text);
      return [];
    }
    return [text];
  }

  const zip = await JSZip.loadAsync(buf);
  const entries = Object.values(zip.files)
    .filter((f) => !f.dir)
    .sort((a, b) => a.name.localeCompare(b.name));
  return Promise.all(entries.map((entry) => entry.async("string")));
}

const ET_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Report dates are US/Eastern calendar days, formatted yyyymmdd.
export function easternReportDate(instant: Date): string {
  return ET_DATE.format(instant).replaceAll("-", "");
}

export function addDaysToReportDate(reportDate: string, days: number): string {
  const y = Number(reportDate.slice(0, 4));
  const m = Number(reportDate.slice(4, 6));
  const d = Number(reportDate.slice(6, 8));
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10).replaceAll("-", "");
}
