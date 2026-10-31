import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/ibkr/encrypt";
import { IbkrTransientError } from "@/lib/ibkr/errors";
import {
  addDaysToReportDate,
  easternReportDate,
  fetchIbritRange,
  IbritCredentialsError,
} from "@/lib/ibkr/ibrit-client";
import { IBRIT_BROKER_NAME } from "@/lib/ibkr/broker-names";
import { IBRIT_TOKEN_INVALID_STATUS } from "@/lib/ibkr/ibrit-token";
import { syncOneConnection } from "@/lib/ibkr/sync-pipeline";
import { getUserTier, isProTier, proRequiredResponse } from "@/lib/billing/tier";
import { checkRateLimit, rateLimitedResponse } from "@/lib/auth/rate-limit";
import { logAuditEvent } from "@/lib/audit/log";

export const maxDuration = 300;

// Each connect costs several IBKR requests (check + history backfill) against
// IBKR's 10/minute limit for the token, so repeated attempts are capped.
const CONNECT_LIMIT_PER_HOUR = 5;

const schema = z.object({
  token: z.string().trim().min(1),
  queryId: z.string().trim().min(1),
});

// POST /api/ibkr/ibrit/connect — saves the IBRIT Web Service token + query ID
// the user copied from IBKR Portal > Third-Party Data Feeds, after checking
// them against IBKR, then runs the first sync (full history) in the background.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tier } = await getUserTier(user.id);
  if (!isProTier(tier)) return proRequiredResponse("ibkr_sync");

  const body = await req.json().catch(() => null);
  if (body === null) return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "יש למלא גם Token וגם Query ID", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { token, queryId } = parsed.data;

  const rl = await checkRateLimit(`user:${user.id}:ibrit_connect`, CONNECT_LIMIT_PER_HOUR, 3600);
  if (!rl.ok) {
    await logAuditEvent({
      userId: user.id,
      eventType: "rate_limit_hit",
      status: "failure",
      metadata: { action: "ibrit_connect" },
      request: req,
    });
    return rateLimitedResponse(rl, "יותר מדי ניסיונות חיבור. נסו שוב בעוד שעה");
  }

  // Check the pair before saving, so a mistyped value fails here, in front of
  // the user, instead of as a silent sync error the next morning.
  const yesterday = addDaysToReportDate(easternReportDate(new Date()), -1);
  try {
    await fetchIbritRange(token, queryId, yesterday, yesterday);
  } catch (err) {
    if (err instanceof IbritCredentialsError) {
      return NextResponse.json(
        { error: "ה-Token או ה-Query ID לא תקינים. ודאו שהעתקתם את שניהם במלואם מ-IBKR" },
        { status: 422 },
      );
    }
    if (err instanceof IbkrTransientError) {
      return NextResponse.json({ error: "IBKR עמוסים כרגע. נסו שוב בעוד דקה" }, { status: 503 });
    }
    console.error("[api/ibkr/ibrit/connect] credential check failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "לא הצלחנו להתחבר ל-IBKR. נסו שוב מאוחר יותר" }, { status: 502 });
  }

  // The token's 1-year validity (and its expiry reminders) counts from when it
  // was first connected. Re-saving the same token keeps that date, unless IBKR
  // had rejected it: then it passed the check above because it was renewed.
  const { data: existing, error: existingError } = await supabase
    .from("BrokerConnection")
    .select("brokerName, flexTokenEncrypted, lastSyncStatus, tokenConnectedAt, tokenExpiryReminderDays")
    .eq("userId", user.id)
    .maybeSingle();
  if (existingError) {
    console.error("[api/ibkr/ibrit/connect] DB error:", existingError.message);
    return NextResponse.json({ error: "שמירת החיבור נכשלה" }, { status: 500 });
  }
  const sameValidToken =
    existing?.brokerName === IBRIT_BROKER_NAME &&
    existing.tokenConnectedAt !== null &&
    existing.lastSyncStatus !== IBRIT_TOKEN_INVALID_STATUS &&
    decryptToken(existing.flexTokenEncrypted) === token;

  // One connection per user.
  // Execution IDs are the same in both feeds, so already-synced trades aren't duplicated.
  const { data: conn, error } = await supabase
    .from("BrokerConnection")
    .upsert(
      {
        userId: user.id,
        brokerName: IBRIT_BROKER_NAME,
        flexTokenEncrypted: encryptToken(token),
        flexQueryIdActivity: queryId,
        isActive: true,
        lastSyncAt: null,
        lastSyncStatus: null,
        lastSyncError: null,
        tokenConnectedAt: sameValidToken ? existing.tokenConnectedAt : new Date().toISOString(),
        tokenExpiryReminderDays: sameValidToken ? existing.tokenExpiryReminderDays : null,
      },
      { onConflict: "userId" },
    )
    .select("id, userId, brokerName, flexTokenEncrypted, flexQueryIdActivity")
    .single();

  if (error || !conn) {
    console.error("[api/ibkr/ibrit/connect] DB error:", error?.message);
    return NextResponse.json({ error: "שמירת החיבור נכשלה" }, { status: 500 });
  }

  waitUntil(
    syncOneConnection(createAdminClient(), conn).catch((err) => {
      console.error("[api/ibkr/ibrit/connect] first sync failed:", err instanceof Error ? err.message : err);
    }),
  );

  return NextResponse.json({ ok: true });
}
