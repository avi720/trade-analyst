import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import JSZip from "jszip";

// The module keeps a process-wide request throttle; a fresh import per test
// makes each test's first request go out immediately.
async function loadClient() {
  vi.resetModules();
  return import("../lib/ibkr/ibrit-client");
}

function mockFetchOnce(body: BodyInit, contentType: string) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status: 200, headers: { "content-type": contentType } }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("fetchIbritRange", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends token, query ID, service code and the date range", async () => {
    const { fetchIbritRange } = await loadClient();
    const fetchMock = mockFetchOnce('{"msg":"No statement","rc":1010}', "application/json");
    await fetchIbritRange("tok", "123", "20260101", "20260131");
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("t")).toBe("tok");
    expect(url.searchParams.get("q")).toBe("123");
    expect(url.searchParams.get("s")).toBe("tradeanalyst-ws");
    expect(url.searchParams.get("fd")).toBe("20260101");
    expect(url.searchParams.get("td")).toBe("20260131");
  });

  it("returns the zip's files sorted by name (one per report date)", async () => {
    const { fetchIbritRange } = await loadClient();
    const zip = new JSZip();
    zip.file("U1_20260102.txt", "day two");
    zip.file("U1_20260101.txt", "day one");
    const buf = await zip.generateAsync({ type: "uint8array" });
    mockFetchOnce(buf as BodyInit, "application/zip");
    expect(await fetchIbritRange("t", "q", "20260101", "20260102")).toEqual(["day one", "day two"]);
  });

  it("returns a plain-text response as a single file", async () => {
    const { fetchIbritRange } = await loadClient();
    mockFetchOnce("H,U1,Activity,...", "text/plain");
    expect(await fetchIbritRange("t", "q", "20260101", "20260101")).toEqual(["H,U1,Activity,..."]);
  });

  it("returns [] when IBKR has no statement for the range (1010)", async () => {
    const { fetchIbritRange } = await loadClient();
    mockFetchOnce('{"msg":"There is no statement","rc":1010}', "application/json");
    expect(await fetchIbritRange("t", "q", "20200101", "20201231")).toEqual([]);
  });

  it("returns [] for the 1600 'no statement' code the live service sends for ranges", async () => {
    const { fetchIbritRange } = await loadClient();
    mockFetchOnce(
      '{"msg":"There is no statement available for the account(s) and date(s) selected.","rc":1600}',
      "application/json",
    );
    expect(await fetchIbritRange("t", "q", "20231007", "20241005")).toEqual([]);
  });

  it("throws IbritCredentialsError on a bad token or query ID (1052)", async () => {
    const { fetchIbritRange, IbritCredentialsError } = await loadClient();
    mockFetchOnce('{"msg":"Token or query ID is invalid","rc":1052}', "application/json");
    await expect(fetchIbritRange("t", "q", "20260101", "20260101")).rejects.toBeInstanceOf(IbritCredentialsError);
  });

  it("throws IbkrTransientError on generation in progress (1019) without retrying", async () => {
    const { fetchIbritRange } = await loadClient();
    const { IbkrTransientError } = await import("../lib/ibkr/flex-client");
    const fetchMock = mockFetchOnce('{"msg":"busy","rc":1019}', "application/json");
    await expect(fetchIbritRange("t", "q", "20260101", "20260101")).rejects.toBeInstanceOf(IbkrTransientError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  describe("rate limited (1018)", () => {
    const rateLimited = () =>
      new Response('{"msg":"Too many requests have been made from this token.","rc":1018}', {
        headers: { "content-type": "application/json" },
      });
    afterEach(() => vi.useRealTimers());

    it("retries after a pause and returns the data", async () => {
      vi.useFakeTimers();
      const { fetchIbritRange } = await loadClient();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(rateLimited())
        .mockResolvedValueOnce(new Response("H,U1,Activity", { headers: { "content-type": "text/plain" } }));
      vi.stubGlobal("fetch", fetchMock);
      const pending = fetchIbritRange("t", "q", "20260101", "20260101");
      await vi.advanceTimersByTimeAsync(4_999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(await pending).toEqual(["H,U1,Activity"]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("gives up with IbkrTransientError after three attempts", async () => {
      vi.useFakeTimers();
      const { fetchIbritRange } = await loadClient();
      const { IbkrTransientError } = await import("../lib/ibkr/flex-client");
      const fetchMock = vi.fn().mockImplementation(async () => rateLimited());
      vi.stubGlobal("fetch", fetchMock);
      const outcome = fetchIbritRange("t", "q", "20260101", "20260101").catch((e) => e);
      await vi.advanceTimersByTimeAsync(5_000 + 15_000);
      expect(await outcome).toBeInstanceOf(IbkrTransientError);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  it("throws a plain error for other codes, e.g. a range over 365 days (1059)", async () => {
    const { fetchIbritRange, IbritCredentialsError } = await loadClient();
    mockFetchOnce('{"msg":"Date range cannot exceed 365 days.","rc":1059,"errors":{}}', "application/json");
    const err = await fetchIbritRange("t", "q", "20250101", "20261005").catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(IbritCredentialsError);
    expect(err.message).toBe("IBRIT (1059): Date range cannot exceed 365 days.");
  });

  it("throws on a non-200 HTTP status", async () => {
    const { fetchIbritRange } = await loadClient();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 503 })));
    await expect(fetchIbritRange("t", "q", "20260101", "20260101")).rejects.toThrow(/HTTP error 503/);
  });

  describe("throttle (per token + query ID: starts 3s apart, 10 per minute)", () => {
    async function setup() {
      vi.useFakeTimers();
      const client = await loadClient();
      const fetchMock = vi.fn().mockImplementation(
        async () => new Response('{"msg":"none","rc":1010}', { headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const fire = (n: number, token = "t", queryId = "q") =>
        Array.from({ length: n }, (_, i) => client.fetchIbritRange(token, queryId, "20260101", `2026010${(i % 9) + 1}`));
      const tokensSent = () => fetchMock.mock.calls.map(([url]) => new URL(url).searchParams.get("t"));
      return { fetchMock, fire, tokensSent };
    }
    afterEach(() => vi.useRealTimers());

    it("doesn't hold one client's requests behind another's", async () => {
      const { fetchMock, fire, tokensSent } = await setup();
      const pending = [...fire(11, "tokA"), ...fire(1, "tokB"), ...fire(1, "tokC")];
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(tokensSent()).toEqual(["tokA", "tokB", "tokC"]);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(fetchMock).toHaveBeenCalledTimes(13);
      await Promise.all(pending);
    });

    it("keys the limit on the query ID too", async () => {
      const { fetchMock, fire } = await setup();
      const pending = [...fire(1, "tok", "q1"), ...fire(1, "tok", "q2")];
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await Promise.all(pending);
    });

    it("starts concurrent requests 3 seconds apart", async () => {
      const { fetchMock, fire } = await setup();
      const pending = fire(3);
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(2_999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(3_000);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      await Promise.all(pending);
    });

    it("holds the 11th request until a minute after the first", async () => {
      const { fetchMock, fire } = await setup();
      const pending = fire(11);
      await vi.advanceTimersByTimeAsync(9 * 3_000);
      expect(fetchMock).toHaveBeenCalledTimes(10);
      await vi.advanceTimersByTimeAsync(60_000 - 9 * 3_000 - 1);
      expect(fetchMock).toHaveBeenCalledTimes(10);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetchMock).toHaveBeenCalledTimes(11);
      await Promise.all(pending);
    });
  });
});

describe("report date helpers", () => {
  it("formats the US/Eastern calendar day, not the UTC one", async () => {
    const { easternReportDate } = await loadClient();
    // 02:30 UTC on Oct 6 is still Oct 5 in New York (EDT, UTC-4).
    expect(easternReportDate(new Date("2026-10-06T02:30:00Z"))).toBe("20261005");
    expect(easternReportDate(new Date("2026-10-06T05:00:00Z"))).toBe("20261006");
  });

  it("adds and subtracts days across month and year boundaries", async () => {
    const { addDaysToReportDate } = await loadClient();
    expect(addDaysToReportDate("20260301", -1)).toBe("20260228");
    expect(addDaysToReportDate("20260101", -1)).toBe("20251231");
    expect(addDaysToReportDate("20251001", -364)).toBe("20241002");
    expect(addDaysToReportDate("20261231", 1)).toBe("20270101");
  });
});
