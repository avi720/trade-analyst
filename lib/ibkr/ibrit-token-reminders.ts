import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { IBRIT_BROKER_NAME } from "@/lib/ibkr/broker-names";
import { IBRIT_TOKEN_INVALID_STATUS, ibritTokenExpiresAt } from "@/lib/ibkr/ibrit-token";
import { sendEmail, verifyEmailTransport, type EmailMessage } from "@/lib/email/send";
import { redactUserId } from "@/lib/log/redact";
import { getBaseUrl } from "@/lib/utils";

type Admin = SupabaseClient<Database>;

const DAY_MS = 86_400_000;

// Days before expiry at which the user is emailed, largest first.
export const REMINDER_DAYS_BEFORE_EXPIRY = [7, 1] as const;

// The reminder to send now, if any. sentDays is the smallest reminder already
// sent for this token (BrokerConnection.tokenExpiryReminderDays). A run that
// misses the 7-day window entirely sends only the 1-day reminder.
export function dueReminderDays(expiresAt: Date, now: Date, sentDays: number | null): number | null {
  const msLeft = expiresAt.getTime() - now.getTime();
  // Past expiry the sync reports the rejected token instead.
  if (msLeft <= 0) return null;
  const due = REMINDER_DAYS_BEFORE_EXPIRY.filter((days) => msLeft <= days * DAY_MS).at(-1);
  if (due === undefined) return null;
  if (sentDays !== null && sentDays <= due) return null;
  return due;
}

const PORTAL_PATH = "Reporting → Third-Party Reports → Third-Party Data Feeds → Trade Analyst (ws)";

const EXPIRY_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jerusalem",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function buildReminderEmail(opts: {
  firstName: string | null;
  days: number;
  expiresAt: Date;
  brokerTabUrl: string;
}): Omit<EmailMessage, "to"> {
  const when = opts.days === 1 ? "תוך יום" : `בעוד ${opts.days === 7 ? "שבוע" : `${opts.days} ימים`}`;
  const date = EXPIRY_DATE.format(opts.expiresAt);
  const greeting = opts.firstName ? `שלום ${opts.firstName},` : "שלום,";
  const subject = `ה-Token של IBKR יפוג ${when}`;

  const intro = `ה-Token שמחבר את חשבון ה-IBKR שלכם ל-Trade Analyst יפוג ${when}, ב-${date}. אחרי זה טריידים חדשים לא יסונכרנו.`;
  const steps = [
    "היכנסו לחשבון ה-IBKR שלכם.",
    `בתפריט: ${PORTAL_PATH}, וחדשו שם את ה-Token.`,
    "אם קיבלתם Token חדש, הדביקו אותו בעמוד הברוקר באתר:",
  ];

  const text = [
    greeting,
    "",
    intro,
    "",
    "כדי לחדש:",
    ...steps.map((step, i) => `${i + 1}. ${step}`),
    opts.brokerTabUrl,
    "",
    "צוות Trade Analyst",
  ].join("\n");

  const html = `<!doctype html>
<html dir="rtl" lang="he">
<body style="margin:0;padding:24px;background:#ffffff;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;direction:rtl;text-align:right">
  <p>${escapeHtml(greeting)}</p>
  <p>${escapeHtml(intro)}</p>
  <p style="margin-bottom:4px">כדי לחדש:</p>
  <ol style="margin-top:0;padding-right:20px;padding-left:0">
    <li>${escapeHtml(steps[0])}</li>
    <li>בתפריט: <span dir="ltr" style="font-family:monospace">${escapeHtml(PORTAL_PATH)}</span>, וחדשו שם את ה-Token.</li>
    <li>${escapeHtml(steps[2])}<br><a href="${escapeHtml(opts.brokerTabUrl)}">${escapeHtml(opts.brokerTabUrl)}</a></li>
  </ol>
  <p>צוות Trade Analyst</p>
</body>
</html>`;

  return { subject, html, text };
}

export interface ReminderRunResult {
  sent: number;
  failed: number;
  errors: string[];
}

// Emails users whose IBRIT token expires within a week, then again within a
// day. Runs with every IBKR sync cron (twice a day); a reminder is claimed in
// the DB before it is sent, so overlapping runs can't email twice.
export async function sendIbritTokenExpiryReminders(admin: Admin, now = new Date()): Promise<ReminderRunResult> {
  // Every run checks the mailbox login, so wrong or missing SMTP credentials
  // fail the cron now instead of on the first due reminder a year later.
  await verifyEmailTransport();

  // Coarse window around "connected about a year ago"; dueReminderDays decides.
  const { data: rows, error } = await admin
    .from("BrokerConnection")
    .select("id, userId, tokenConnectedAt, tokenExpiryReminderDays")
    .eq("brokerName", IBRIT_BROKER_NAME)
    .eq("isActive", true)
    .not("tokenConnectedAt", "is", null)
    .gt("tokenConnectedAt", new Date(now.getTime() - 368 * DAY_MS).toISOString())
    .lte("tokenConnectedAt", new Date(now.getTime() - 356 * DAY_MS).toISOString())
    // A rejected token already shows its own message in the broker tab.
    .or(`lastSyncStatus.is.null,lastSyncStatus.neq.${IBRIT_TOKEN_INVALID_STATUS}`);
  if (error) throw new Error(`Failed to load IBRIT connections for reminders: ${error.message}`);

  const due = (rows ?? []).flatMap((row) => {
    const expiresAt = ibritTokenExpiresAt(new Date(row.tokenConnectedAt!));
    const days = dueReminderDays(expiresAt, now, row.tokenExpiryReminderDays);
    return days === null ? [] : [{ ...row, tokenConnectedAt: row.tokenConnectedAt!, expiresAt, days }];
  });
  const result: ReminderRunResult = { sent: 0, failed: 0, errors: [] };
  if (due.length === 0) return result;

  const { data: users, error: usersError } = await admin
    .from("User")
    .select("id, firstName")
    .in("id", due.map((row) => row.userId));
  if (usersError) throw new Error(`Failed to load users for reminders: ${usersError.message}`);
  const firstNameById = new Map((users ?? []).map((u) => [u.id, u.firstName]));
  const brokerTabUrl = `${getBaseUrl()}/profile?tab=broker`;

  for (const row of due) {
    // The verified sign-in address, not User.email: a user can insert their
    // own User row with any address, which would point our mailbox at a stranger.
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(row.userId);
    if (authError) throw new Error(`Failed to load auth user for reminders: ${authError.message}`);
    const to = authData.user.email_confirmed_at ? authData.user.email : undefined;
    if (!to) continue;

    // The claim only matches the row as read: a newer reminder or a newly
    // connected token in between makes it a no-op.
    let claim = admin
      .from("BrokerConnection")
      .update({ tokenExpiryReminderDays: row.days })
      .eq("id", row.id)
      .eq("tokenConnectedAt", row.tokenConnectedAt);
    claim =
      row.tokenExpiryReminderDays === null
        ? claim.is("tokenExpiryReminderDays", null)
        : claim.eq("tokenExpiryReminderDays", row.tokenExpiryReminderDays);
    const { data: claimed, error: claimError } = await claim.select("id");
    if (claimError) throw new Error(`Failed to claim token reminder: ${claimError.message}`);
    if (!claimed || claimed.length === 0) continue;

    try {
      await sendEmail({
        to,
        ...buildReminderEmail({
          firstName: firstNameById.get(row.userId) ?? null,
          days: row.days,
          expiresAt: row.expiresAt,
          brokerTabUrl,
        }),
      });
      result.sent++;
      console.log(`[ibrit-token-reminders] user=${redactUserId(row.userId)} sent ${row.days}-day reminder`);
    } catch (err) {
      // Release the claim so the next run retries.
      const { error: releaseError } = await admin
        .from("BrokerConnection")
        .update({ tokenExpiryReminderDays: row.tokenExpiryReminderDays })
        .eq("id", row.id)
        .eq("tokenExpiryReminderDays", row.days);
      if (releaseError) {
        console.error(`[ibrit-token-reminders] conn=${row.id} claim not released, reminder lost:`, releaseError.message);
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ibrit-token-reminders] user=${redactUserId(row.userId)} send failed:`, msg);
      result.failed++;
      result.errors.push(`conn=${row.id}: ${msg}`);
    }
  }
  return result;
}
