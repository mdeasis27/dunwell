import "server-only";
import { isMailLive } from "./mode";

export interface MailRequest {
  readonly to: string | undefined;
  readonly subject: string;
  readonly body: string;
}

export type MailResult =
  | { readonly delivered: true; readonly to: string }
  | { readonly delivered: false };

const MAIL_URL = "https://api.resend.com/emails";

export class MailError extends Error {}

/** Sends through the mail provider when configured, otherwise reports `delivered: false` (demo outbox). */
export async function sendEmail(req: MailRequest): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!isMailLive() || !key || !from) return { delivered: false };
  if (!req.to) throw new MailError("recipient required");
  const response = await fetch(MAIL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [req.to], subject: req.subject, text: req.body }),
  });
  if (!response.ok) {
    console.error("mail: provider answered", response.status);
    throw new MailError("mail provider failed");
  }
  return { delivered: true, to: req.to };
}
