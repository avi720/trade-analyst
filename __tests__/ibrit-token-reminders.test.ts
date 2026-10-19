import { describe, it, expect } from "vitest";
import { buildReminderEmail, dueReminderDays } from "@/lib/ibkr/ibrit-token-reminders";
import { ibritTokenExpiresAt } from "@/lib/ibkr/ibrit-token";

const DAY = 86_400_000;
const expiresAt = new Date("2027-10-11T09:00:00Z");
const daysBefore = (d: number) => new Date(expiresAt.getTime() - d * DAY);

describe("ibritTokenExpiresAt", () => {
  it("is one calendar year after the token was connected", () => {
    expect(ibritTokenExpiresAt(new Date("2026-10-11T09:00:00Z")).toISOString()).toBe("2027-10-11T09:00:00.000Z");
  });

  it("ends on Feb 28 for a token connected on Feb 29, not a day late on Mar 1", () => {
    expect(ibritTokenExpiresAt(new Date("2028-02-29T09:00:00Z")).toISOString()).toBe("2029-02-28T09:00:00.000Z");
  });
});

describe("dueReminderDays", () => {
  it("sends nothing more than a week before expiry", () => {
    expect(dueReminderDays(expiresAt, daysBefore(7.01), null)).toBeNull();
  });

  it("sends the 7-day reminder once the week before expiry starts", () => {
    expect(dueReminderDays(expiresAt, daysBefore(7), null)).toBe(7);
    expect(dueReminderDays(expiresAt, daysBefore(3), null)).toBe(7);
  });

  it("doesn't repeat the 7-day reminder", () => {
    expect(dueReminderDays(expiresAt, daysBefore(3), 7)).toBeNull();
  });

  it("sends the 1-day reminder after the 7-day one", () => {
    expect(dueReminderDays(expiresAt, daysBefore(1), 7)).toBe(1);
    expect(dueReminderDays(expiresAt, daysBefore(0.2), 7)).toBe(1);
  });

  it("sends only the 1-day reminder when the week was missed", () => {
    expect(dueReminderDays(expiresAt, daysBefore(0.5), null)).toBe(1);
  });

  it("doesn't repeat the 1-day reminder", () => {
    expect(dueReminderDays(expiresAt, daysBefore(0.5), 1)).toBeNull();
  });

  it("sends nothing once the token has expired", () => {
    expect(dueReminderDays(expiresAt, expiresAt, null)).toBeNull();
    expect(dueReminderDays(expiresAt, daysBefore(-2), 7)).toBeNull();
  });
});

describe("buildReminderEmail", () => {
  const base = { expiresAt, brokerTabUrl: "https://tradeanalyst.app/profile?tab=broker" };

  it("says a week, the expiry date and links to the broker tab", () => {
    const email = buildReminderEmail({ ...base, firstName: "דנה", days: 7 });
    expect(email.subject).toBe("ה-Token של IBKR יפוג בעוד שבוע");
    expect(email.text).toContain("שלום דנה,");
    expect(email.text).toContain("11/10/2027");
    expect(email.text).toContain("https://tradeanalyst.app/profile?tab=broker");
    expect(email.html).toContain('href="https://tradeanalyst.app/profile?tab=broker"');
    expect(email.html).toContain('dir="rtl"');
  });

  it("says within a day for the last reminder", () => {
    expect(buildReminderEmail({ ...base, firstName: null, days: 1 }).subject).toBe("ה-Token של IBKR יפוג תוך יום");
  });

  it("greets without a name when there is none", () => {
    expect(buildReminderEmail({ ...base, firstName: null, days: 7 }).text.startsWith("שלום,\n")).toBe(true);
  });

  it("escapes the user's name in the HTML body", () => {
    const { html } = buildReminderEmail({ ...base, firstName: '<img src=x onerror="alert(1)">', days: 7 });
    expect(html).not.toContain("<img");
    expect(html).toContain("&#60;img");
  });
});
