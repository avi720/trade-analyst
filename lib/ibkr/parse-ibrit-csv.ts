import { wallClockToUtc } from "@/lib/trade/tz";
import type { NormalizedExecution } from "../../types/trade";

// Parser for the IBKR Reporting Integration (IBRIT) Activity file, as configured
// for the tradeanalyst-ws feed: comma-delimited CSV, column headers, header (H)
// and trailer (T) records, default yyyymmdd dates. Spec:
// https://www.interactivebrokers.com/campus/ibkr-reporting/reporting-integration/

// IBKR confirmed every IBRIT timestamp is US/Eastern; unlike Flex, the strings
// carry no zone abbreviation, so DST has to come from the zone database.
const IBRIT_TIMEZONE = "America/New_York";

// Trade transaction types. Everything else in the Activity file (dividends,
// accruals, interest, fees, transfers, corporate actions) is not an execution.
// CA (cancel) / CO (correct) are skipped too: reversing an already-persisted
// execution has no path in the FIFO pipeline, same as with Flex today.
const SIDE_BY_TRANSACTION_TYPE: Record<string, NormalizedExecution["side"]> = {
  BUY: "BUY",
  COVER: "BUY",
  SELL: "SELL",
  SHORT: "SSHORT",
};

// Splits one CSV record. IBRIT wraps a field in double quotes only when it
// contains the delimiter; "" inside a quoted field is a literal quote.
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parses an IBRIT timestamp (US/Eastern, no zone) into a UTC Date.
 *
 * The sample file shows two shapes that both differ from the spec's
 * "CCYYMMDD HH:mm:ss": DateTime as " 20211222 11:38:41 AM" (leading space,
 * 12-hour clock) and OrderTime as "20211214;14:55:45". Both are accepted.
 * Returns null on anything else — never throws.
 */
export function parseIbritTimestamp(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const match = /^(\d{4})(\d{2})(\d{2})[ ;](\d{1,2}):(\d{2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(raw.trim());
  if (!match) {
    if (raw.trim() !== "") console.error("[parseIbritTimestamp] unrecognized format:", raw);
    return null;
  }

  const [, yS, moS, dS, hS, miS, sS, meridiem] = match;
  const year = parseInt(yS, 10);
  const month = parseInt(moS, 10);
  const day = parseInt(dS, 10);
  let hours = parseInt(hS, 10);
  const minutes = parseInt(miS, 10);
  const seconds = parseInt(sS, 10);

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      console.error("[parseIbritTimestamp] out-of-range 12-hour value:", raw);
      return null;
    }
    const pm = meridiem.toUpperCase() === "PM";
    if (hours === 12) hours = pm ? 12 : 0;
    else if (pm) hours += 12;
  }

  if (
    month < 1 || month > 12 || day < 1 || day > 31 ||
    hours > 23 || minutes > 59 || seconds > 59
  ) {
    console.error("[parseIbritTimestamp] out-of-range date/time values:", raw);
    return null;
  }

  return wallClockToUtc(year, month, day, hours, minutes, seconds, IBRIT_TIMEZONE);
}

function toNumber(val: string | undefined): number | null {
  if (val === undefined || val.trim() === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function toOptionalString(val: string | undefined): string | undefined {
  const trimmed = val?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeRow(row: Record<string, string>, broker: string): NormalizedExecution | null {
  const side = SIDE_BY_TRANSACTION_TYPE[row["TransactionType"]?.trim().toUpperCase() ?? ""];
  if (!side) return null;

  // The spec spells the column "ExcecutionID"; the sample file has "ExecutionID".
  const execId = toOptionalString(row["ExecutionID"] ?? row["ExcecutionID"]);
  if (!execId) {
    console.warn("[parse-ibrit-csv] Skipping trade row: missing ExecutionID", row);
    return null;
  }

  const ticker = toOptionalString(row["Symbol"]);
  if (!ticker) {
    console.warn("[parse-ibrit-csv] Skipping trade row: missing Symbol", row);
    return null;
  }

  const quantity = toNumber(row["Quantity"]);
  if (quantity === null || quantity === 0) {
    console.warn("[parse-ibrit-csv] Skipping trade row: invalid Quantity", row);
    return null;
  }

  const price = toNumber(row["UnitPrice"]);
  if (price === null) {
    console.warn("[parse-ibrit-csv] Skipping trade row: invalid UnitPrice", row);
    return null;
  }

  const executedAt = parseIbritTimestamp(row["DateTime"]);
  if (!executedAt) {
    console.warn("[parse-ibrit-csv] Skipping trade row: unparseable DateTime", row["DateTime"], row);
    return null;
  }

  const assetClass = toOptionalString(row["AssetType"]);
  const currency = toOptionalString(row["Currency"]);
  // IBRIT has no commission-currency column. Per the spec, commission is in the
  // trade currency, except Forex (AssetType CASH), where it is in base currency.
  const commissionCurrency =
    (assetClass === "CASH" ? toOptionalString(row["BaseCurrency"]) : currency) ?? null;

  return {
    brokerExecId: execId,
    brokerOrderId: toOptionalString(row["OrderID"]),
    brokerClientAccountId: toOptionalString(row["AccountID"]),
    ticker,
    assetClass,
    side,
    // Signed in IBRIT (sell = negative quantity, charged commission = negative);
    // NormalizedExecution carries magnitudes, the side carries the direction.
    quantity: Math.abs(quantity),
    price: Math.abs(price),
    commission: Math.abs(toNumber(row["Commission"]) ?? 0),
    executedAt,
    currency,
    orderType: toOptionalString(row["OrderType"]),
    netCash: toNumber(row["Net"]),
    commissionCurrency,
    orderTimeIso: parseIbritTimestamp(row["OrderTime"])?.toISOString() ?? null,
    broker,
  };
}

/**
 * Parses an IBRIT Activity CSV into the trade executions it contains.
 * Non-trade rows are dropped; trade rows missing a required field are skipped
 * with a warning. Throws if the trailer's record count doesn't match the file,
 * since a truncated download must not be processed as if it were complete.
 */
export function parseIbritActivityCsv(csv: string, broker: string = "IBKR"): NormalizedExecution[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  let columns: string[] | null = null;
  let trailerCount: number | null = null;
  const rows: Record<string, string>[] = [];

  for (const line of lines) {
    const fields = splitCsvLine(line);
    const recordType = fields[0]?.trim();

    if (recordType === "Type") {
      columns = fields.map((f) => f.trim());
    } else if (recordType === "D") {
      if (!columns) throw new Error("IBRIT Activity: data record before the column header row");
      const row: Record<string, string> = {};
      columns.forEach((name, i) => {
        row[name] = fields[i] ?? "";
      });
      rows.push(row);
    } else if (recordType === "T") {
      trailerCount = toNumber(fields[1]);
    }
  }

  // The trailer's count covers every line in the file: header, column header, data and trailer.
  if (trailerCount !== null && trailerCount !== lines.length) {
    throw new Error(
      `IBRIT Activity: trailer record count ${trailerCount} does not match ${lines.length} lines (truncated file?)`,
    );
  }

  return rows.flatMap((row) => {
    const exec = normalizeRow(row, broker);
    return exec ? [exec] : [];
  });
}
