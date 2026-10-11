import nodemailer, { type Transporter } from "nodemailer";

// Outgoing mail goes through the Zoho Mail mailbox in ZOHO_SMTP_USER
// (support@tradeanalyst.app). Zoho rejects a From that isn't that mailbox or
// one of its aliases ("Relaying Disallowed"), so From is always the mailbox.
// Free-plan organization mailboxes use smtp.zoho.com; paid ones smtppro.zoho.com.
const DEFAULT_SMTP_HOST = "smtp.zoho.com";
const SENDER_NAME = "Trade Analyst";
const SMTP_TIMEOUT_MS = 20_000;

let transporter: Transporter | null = null;

function smtpCredentials(): { user: string; pass: string } {
  const user = process.env.ZOHO_SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASSWORD;
  if (!user || !pass) throw new Error("ZOHO_SMTP_USER and ZOHO_SMTP_PASSWORD must be set to send email");
  return { user, pass };
}

function getTransporter(): Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST || DEFAULT_SMTP_HOST,
    port: 465,
    secure: true,
    auth: smtpCredentials(),
    // nodemailer's defaults (2 and 10 minutes) outlast the cron's 300s maxDuration.
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });
  return transporter;
}

// Connects and authenticates without sending anything.
export async function verifyEmailTransport(): Promise<void> {
  await getTransporter().verify();
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await getTransporter().sendMail({
    from: { name: SENDER_NAME, address: smtpCredentials().user },
    ...message,
  });
}
