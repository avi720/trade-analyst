import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "@/lib/ibkr/encrypt";
import { IbkrTransientError } from "@/lib/ibkr/flex-client";
import {
  addDaysToReportDate,
  easternReportDate,
  fetchIbritRange,
  IBRIT_MAX_RANGE_DAYS,
} from "@/lib/ibkr/ibrit-client";
import { parseIbritActivityCsv, type IbritCorrection } from "@/lib/ibkr/parse-ibrit-csv";
import { processExecutions } from "@/lib/ibkr/process-executions";
import { redactUserId } from "@/lib/log/redact";
import type { Database } from "@/lib/db/types";
import type { NormalizedExecution } from "@/types/trade";
import type { ConnectionResult, ConnectionRow } from "@/lib/ibkr/sync-pipeline";

type Admin = SupabaseClient<Database>;

const EVENT_SOURCE = "IBKR_IBRIT";
const EVENT_TYPE = "IBRIT_FETCH";

// Re-read a week before the last processed sync: covers weekends, a file that
// wasn't ready yet, and retried failures. Duplicates are skipped by brokerExecId.
const INCREMENTAL_OVERLAP_DAYS = 7;

// First sync loads up to this many years of history. Measured on the live
// service: ~17s per year with data, ~2s for an empty one. Ten full years plus
// processing fits the 300s maxDuration of the routes that can run a first
// sync. Older history isn't loaded; the fetch event records the cutoff.
const MAX_BACKFILL_CHUNKS = 10;

interface FetchedFiles {
  files: string[];
  from: string;
  to: string;
  // First sync hit MAX_BACKFILL_CHUNKS while the oldest window still had data.
  truncated: boolean;
}

// The cursor is the last fully processed IBRIT fetch. lastSyncAt can't serve:
// it also advances on failed syncs, which would skip the failed window.
async function lastProcessedFetchAt(admin: Admin, userId: string): Promise<Date | null> {
  const { data, error } = await admin
    .from("BrokerEvent")
    .select("receivedAt")
    .eq("userId", userId)
    .eq("source", EVENT_SOURCE)
    .eq("processingStatus", "PROCESSED")
    .order("receivedAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to read last IBRIT fetch: ${error.message}`);
  return data ? new Date(data.receivedAt) : null;
}

export async function fetchIbritFiles(token: string, queryId: string, since: Date | null): Promise<FetchedFiles> {
  const to = addDaysToReportDate(easternReportDate(new Date()), -1);

  if (since) {
    const overlapStart = addDaysToReportDate(easternReportDate(since), -INCREMENTAL_OVERLAP_DAYS);
    const from = overlapStart < to ? overlapStart : to;
    return { files: await fetchIbritRange(token, queryId, from, to), from, to, truncated: false };
  }

  // Year-long windows, newest first, one at a time: concurrent requests got
  // rc 1410 from the live service. History stops at the first empty window.
  const chunks: string[][] = [];
  let windowTo = to;
  let from = to;
  let truncated = false;
  for (let i = 0; i < MAX_BACKFILL_CHUNKS; i++) {
    const windowFrom = addDaysToReportDate(windowTo, -(IBRIT_MAX_RANGE_DAYS - 1));
    const files = await fetchIbritRange(token, queryId, windowFrom, windowTo);
    if (files.length === 0) break;
    chunks.unshift(files);
    from = windowFrom;
    windowTo = addDaysToReportDate(windowFrom, -1);
    truncated = i === MAX_BACKFILL_CHUNKS - 1;
  }
  // Each window's files are already oldest first.
  return { files: chunks.flat(), from, to, truncated };
}

function describeCorrections(corrections: IbritCorrection[]): string {
  const first = corrections[0];
  return (
    `IBKR reported ${corrections.length} cancelled/corrected execution(s) that were not applied ` +
    `(first: ${first.transactionType} ${first.ticker ?? "?"} execId=${first.executionId ?? "?"}); ` +
    `affected trades need manual review`
  );
}

export async function syncIbritConnection(admin: Admin, conn: ConnectionRow): Promise<ConnectionResult> {
  let executionCount = 0;
  let failedExecutions = 0;

  try {
    const token = decryptToken(conn.flexTokenEncrypted);
    const since = await lastProcessedFetchAt(admin, conn.userId);
    const { files, from, to, truncated } = await fetchIbritFiles(token, conn.flexQueryIdActivity, since);
    console.log(
      `[ibrit-sync] user=${redactUserId(conn.userId)} ${since ? "incremental" : "backfill"} ${from}..${to}: ${files.length} file(s)`,
    );
    if (truncated) {
      console.warn(`[ibrit-sync] user=${redactUserId(conn.userId)} history before ${from} not loaded (backfill cap)`);
    }

    const { data: event } = await admin
      .from("BrokerEvent")
      .insert({
        userId: conn.userId,
        source: EVENT_SOURCE,
        eventType: EVENT_TYPE,
        rawPayload: { from, to, truncated, fileCount: files.length, csv: files.join("\n").slice(0, 10000) },
        processingStatus: "PENDING",
      })
      .select("id")
      .single();

    const executions: NormalizedExecution[] = [];
    const corrections: IbritCorrection[] = [];
    for (const file of files) {
      const parsed = parseIbritActivityCsv(file);
      executions.push(...parsed.executions);
      corrections.push(...parsed.corrections);
    }
    // FIFO needs chronological order; Array.prototype.sort is stable, so
    // same-second fills keep their file order.
    executions.sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime());
    executionCount = executions.length;

    const results = await processExecutions(executions, conn.userId);
    const failed = results.filter((r) => r.status === "FAILED");
    failedExecutions = failed.length;

    const problems: string[] = [];
    if (failed.length > 0) problems.push(`${failed.length} execution(s) failed. First: ${failed[0].error}`);
    if (corrections.length > 0) problems.push(describeCorrections(corrections));
    const syncError = problems.length > 0 ? problems.join(" | ") : null;
    const syncStatus = syncError ? "ERROR" : "SUCCESS";

    if (event) {
      await admin
        .from("BrokerEvent")
        .update({
          processingStatus: syncStatus === "ERROR" ? "ERROR" : "PROCESSED",
          processedAt: new Date().toISOString(),
          processingError: syncError,
        })
        .eq("id", event.id);
    }

    const accountId = executions[0]?.brokerClientAccountId ?? null;
    await admin
      .from("BrokerConnection")
      .update({
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: syncStatus,
        lastSyncError: syncError,
        ...(accountId ? { accountId } : {}),
      })
      .eq("id", conn.id);

    return {
      connectionId: conn.id,
      userId: conn.userId,
      status: syncStatus,
      error: syncError,
      executions: executionCount,
      failedExecutions,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ibrit-sync] user=${redactUserId(conn.userId)} error:`, errMsg);

    // Same contract as Flex: a transient error leaves lastSyncAt untouched so
    // the next cron run retries.
    const isTransient = err instanceof IbkrTransientError;
    await admin
      .from("BrokerConnection")
      .update({
        ...(isTransient ? {} : { lastSyncAt: new Date().toISOString() }),
        lastSyncStatus: "ERROR",
        lastSyncError: errMsg,
      })
      .eq("id", conn.id);

    return {
      connectionId: conn.id,
      userId: conn.userId,
      status: isTransient ? "TRANSIENT_ERROR" : "ERROR",
      error: errMsg,
      executions: executionCount,
      failedExecutions,
    };
  }
}
