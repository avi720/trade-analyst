import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendMail = vi.fn().mockResolvedValue({});
const verify = vi.fn().mockResolvedValue(true);
const createTransport = vi.fn(() => ({ sendMail, verify }));
vi.mock("nodemailer", () => ({ default: { createTransport } }));

// The module caches its transporter; a fresh import per test re-reads the env.
async function loadSend() {
  vi.resetModules();
  return import("@/lib/email/send");
}

describe("lib/email/send", () => {
  beforeEach(() => {
    vi.stubEnv("ZOHO_SMTP_USER", "support@tradeanalyst.app");
    vi.stubEnv("ZOHO_SMTP_PASSWORD", "app-password");
    vi.stubEnv("ZOHO_SMTP_HOST", "");
    createTransport.mockClear();
    sendMail.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("connects to Zoho over SSL with the mailbox credentials", async () => {
    const { verifyEmailTransport } = await loadSend();
    await verifyEmailTransport();
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: { user: "support@tradeanalyst.app", pass: "app-password" },
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 20_000,
    });
    expect(verify).toHaveBeenCalled();
  });

  it("uses ZOHO_SMTP_HOST when set", async () => {
    vi.stubEnv("ZOHO_SMTP_HOST", "smtppro.zoho.eu");
    const { verifyEmailTransport } = await loadSend();
    await verifyEmailTransport();
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "smtppro.zoho.eu" }));
  });

  it("sends from the authenticated mailbox", async () => {
    const { sendEmail } = await loadSend();
    await sendEmail({ to: "user@example.com", subject: "s", html: "<p>h</p>", text: "t" });
    expect(sendMail).toHaveBeenCalledWith({
      from: { name: "Trade Analyst", address: "support@tradeanalyst.app" },
      to: "user@example.com",
      subject: "s",
      html: "<p>h</p>",
      text: "t",
    });
  });

  it("throws when the credentials are missing", async () => {
    vi.stubEnv("ZOHO_SMTP_PASSWORD", "");
    const { verifyEmailTransport } = await loadSend();
    await expect(verifyEmailTransport()).rejects.toThrow(/ZOHO_SMTP_USER and ZOHO_SMTP_PASSWORD/);
  });
});
