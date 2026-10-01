import { describe, it, expect, vi } from "vitest";
import { parseIbritActivityCsv, parseIbritTimestamp } from "../lib/ibkr/parse-ibrit-csv";

// IBKR's own IBRIT v1.994 sample Activity file (F000001_Activity_20211222.csv),
// as sent by reportingintegration. Account IDs are synthetic.
const SAMPLE_ACTIVITY = `H,F000001,Activity,20211223,12:38:54,20211222,1.994,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Type,AccountID,ConID,SecurityID,Symbol,BBTicker,FIGI,SecurityDescription,AssetType,Currency,BaseCurrency,TradeDate,DateTime,SettleDate,OrderTime,TransactionType,ImpactsCash,Quantity,UnitPrice,GrossAmount,SECFee,Commission,Tax,Net,NetInBase,RealizedPL,RealizedPLInBase,TradeID,TaxBasisElection,Description,FxRateToBase,ContraPartyName,ClrFirmID,Exchange,MasterAccountID,Van,AwayBrokerCommission,OrderID,ClientReference,TransactionID,ExecutionID,CostBasis,Flag,ActionID,LevelOfDetail,OrderType,OrderReference,BrokerageOrderID
D,U0000076,9769,US02209S1033,MO,MO,BBG000BP6LJ8,ALTRIA GROUP INC,STK,USD,USD,20211222,,20220110,,DIVACC,N,64.4427,0.9,58,0,0,0,58,58,0,0,,,DIVIDEND ACCRUAL POSTING,1,,,,F000001,U0000076-ABOR-ABOR,0,,,18845550493,,0,,,,,,
D,U0000012,9769,US02209S1033,MO,MO,BBG000BP6LJ8,ALTRIA GROUP INC,STK,USD,USD,20211222,,20220110,,DIVACC,N,114.2476,0.9,102.82,0,0,0,102.82,102.82,0,0,,,DIVIDEND ACCRUAL POSTING,1,,,,F000001,U0000012-ABOR-ABOR,0,,,18845545987,,0,,,,,,
D,U0000014,7890,US4062161017,HAL,HAL,BBG000BKTFN2,HALLIBURTON CO,STK,USD,USD,20211208,,20211222,,DIVACC,N,150,0.045,-6.75,0,0,0,-6.75,-6.75,0,0,,,DIVIDEND ACCRUAL REVERSAL,1,,,,F000001,U0000014-ABOR-ABOR,0,,,18863129656,,0,,,,,,
D,U0000014,7890,US4062161017,HAL,HAL,BBG000BKTFN2,HALLIBURTON CO,STK,USD,USD,20211222,,20211222,,DIV,Y,0,0,6.75,0,0,0,6.75,6.75,0,0,,,HAL(US4062161017) CASH DIVIDEND USD 0.045 PER SHARE (Ordinary Dividend),1,,,,F000001,U0000014-ABOR-ABOR,0,,,18863129659,,0,,123344495,,,,
D,U0000014,9831,US5658491064,MRO,MRO,BBG000C8H633,MARATHON OIL CORP,STK,USD,USD,20211222, 20211222 11:38:41 AM,20211227,20211214;14:55:45,SELL,Y,-175,16,2800,0,-1.035105,0,2798.964895,2798.964895,0,0,4343911926,FI,TRADE MARATHON OIL CORP,1,,,NYSE,F000001,U0000014-ABOR-ABOR,0,2212952001,,18864455690,00012dc6.61c32a11.01.01,-2162.5,,,EXECUTION,LMT,,0010d602.0001d812.67014ad.0001
T,8,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,`;

const SAMPLE_LINES = SAMPLE_ACTIVITY.split("\n");
const HEADER = SAMPLE_LINES[0];
const COLUMNS = SAMPLE_LINES[1];
const MRO_SELL = SAMPLE_LINES[6];
const COLUMN_NAMES = COLUMNS.split(",");

// Builds a trade data record from the sample MRO sell, overriding named columns.
function tradeRow(overrides: Record<string, string>): string {
  const fields = MRO_SELL.split(",");
  for (const [name, value] of Object.entries(overrides)) {
    const idx = COLUMN_NAMES.indexOf(name);
    if (idx === -1) throw new Error(`unknown column ${name}`);
    fields[idx] = value;
  }
  return fields.join(",");
}

// Wraps data records in header, column header and a matching trailer.
function activityFile(dataRows: string[]): string {
  const lines = [HEADER, COLUMNS, ...dataRows];
  return [...lines, `T,${lines.length + 1}`].join("\n");
}

describe("parseIbritActivityCsv", () => {
  it("extracts the single trade from IBKR's sample file and drops dividend rows", () => {
    const execs = parseIbritActivityCsv(SAMPLE_ACTIVITY);
    expect(execs).toHaveLength(1);
    expect(execs[0]).toEqual({
      brokerExecId: "00012dc6.61c32a11.01.01",
      brokerOrderId: "2212952001",
      brokerClientAccountId: "U0000014",
      ticker: "MRO",
      assetClass: "STK",
      side: "SELL",
      quantity: 175,
      price: 16,
      commission: 1.035105,
      // 11:38:41 AM US/Eastern in December (EST, UTC-5)
      executedAt: new Date("2021-12-22T16:38:41.000Z"),
      currency: "USD",
      orderType: "LMT",
      netCash: 2798.964895,
      commissionCurrency: "USD",
      // 14:55:45 US/Eastern, EST
      orderTimeIso: "2021-12-14T19:55:45.000Z",
      broker: "IBKR",
    });
  });

  it("maps transaction types to sides: BUY/COVER → BUY, SELL → SELL, SHORT → SSHORT", () => {
    const execs = parseIbritActivityCsv(
      activityFile([
        tradeRow({ TransactionType: "BUY", Quantity: "100", ExecutionID: "e1" }),
        tradeRow({ TransactionType: "COVER", Quantity: "100", ExecutionID: "e2" }),
        tradeRow({ TransactionType: "SELL", Quantity: "-100", ExecutionID: "e3" }),
        tradeRow({ TransactionType: "SHORT", Quantity: "-100", ExecutionID: "e4" }),
      ]),
    );
    expect(execs.map((e) => [e.brokerExecId, e.side, e.quantity])).toEqual([
      ["e1", "BUY", 100],
      ["e2", "BUY", 100],
      ["e3", "SELL", 100],
      ["e4", "SSHORT", 100],
    ]);
  });

  it("skips cancel (CA) and correct (CO) records", () => {
    const execs = parseIbritActivityCsv(
      activityFile([
        tradeRow({ TransactionType: "CA", ExecutionID: "e1" }),
        tradeRow({ TransactionType: "CO", ExecutionID: "e2" }),
      ]),
    );
    expect(execs).toEqual([]);
  });

  it("skips a trade row with no ExecutionID", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const execs = parseIbritActivityCsv(activityFile([tradeRow({ ExecutionID: "" })]));
    expect(execs).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("keeps a quoted field containing a comma inside one column", () => {
    const execs = parseIbritActivityCsv(
      activityFile([tradeRow({ SecurityDescription: '"APPLE INC, COMMON STOCK"', Symbol: "AAPL" })]),
    );
    expect(execs).toHaveLength(1);
    expect(execs[0].ticker).toBe("AAPL");
    expect(execs[0].price).toBe(16);
  });

  it("uses the base currency as commission currency for Forex (AssetType CASH)", () => {
    const execs = parseIbritActivityCsv(
      activityFile([tradeRow({ AssetType: "CASH", Currency: "EUR", BaseCurrency: "USD" })]),
    );
    expect(execs[0].currency).toBe("EUR");
    expect(execs[0].commissionCurrency).toBe("USD");
  });

  it("throws when the trailer record count doesn't match (truncated file)", () => {
    const truncated = SAMPLE_LINES.filter((_, i) => i !== 6).join("\n");
    expect(() => parseIbritActivityCsv(truncated)).toThrow(/trailer record count 8/);
  });

  it("accepts CRLF line endings", () => {
    expect(parseIbritActivityCsv(SAMPLE_ACTIVITY.replace(/\n/g, "\r\n"))).toHaveLength(1);
  });

  it("returns an empty list for an empty file", () => {
    expect(parseIbritActivityCsv("")).toEqual([]);
  });
});

describe("parseIbritTimestamp", () => {
  it("converts summer (EDT, UTC-4) wall-clock time", () => {
    expect(parseIbritTimestamp("20260715 09:30:00")?.toISOString()).toBe("2026-07-15T13:30:00.000Z");
  });

  it("converts winter (EST, UTC-5) wall-clock time", () => {
    expect(parseIbritTimestamp("20260115 09:30:00")?.toISOString()).toBe("2026-01-15T14:30:00.000Z");
  });

  it("handles the DST switch day (2026-03-08, clocks jump at 2:00 ET)", () => {
    expect(parseIbritTimestamp("20260308 09:30:00")?.toISOString()).toBe("2026-03-08T13:30:00.000Z");
  });

  it("handles 12 PM and 12 AM on the 12-hour clock", () => {
    expect(parseIbritTimestamp("20260715 12:05:00 PM")?.toISOString()).toBe("2026-07-15T16:05:00.000Z");
    expect(parseIbritTimestamp("20260715 12:05:00 AM")?.toISOString()).toBe("2026-07-15T04:05:00.000Z");
    expect(parseIbritTimestamp("20260715 03:05:00 PM")?.toISOString()).toBe("2026-07-15T19:05:00.000Z");
  });

  it("accepts the semicolon-separated OrderTime shape and a leading space", () => {
    expect(parseIbritTimestamp("20211214;14:55:45")?.toISOString()).toBe("2021-12-14T19:55:45.000Z");
    expect(parseIbritTimestamp(" 20211222 11:38:41 AM")?.toISOString()).toBe("2021-12-22T16:38:41.000Z");
  });

  it("returns null for empty, malformed or out-of-range input", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(parseIbritTimestamp("")).toBeNull();
    expect(parseIbritTimestamp(undefined)).toBeNull();
    expect(parseIbritTimestamp("22/12/2021;11:38:41 EST")).toBeNull();
    expect(parseIbritTimestamp("20211322 11:38:41")).toBeNull();
    expect(parseIbritTimestamp("20211222 13:38:41 PM")).toBeNull();
    err.mockRestore();
  });
});
