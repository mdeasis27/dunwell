import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// A draft is signed when /api/draft returns it and verified by /api/send, so a caller cannot make the
// server mail text it did not write. The secret is the mail key when set, otherwise a fixed demo value
// (demo mode never delivers, so there is nothing to protect).
const DEMO_SECRET = "dunwell-demo-signing";

function secret(): string {
  return process.env.RESEND_API_KEY || DEMO_SECRET;
}

export interface SignedDraftFields {
  readonly id: string;
  readonly today: string;
  readonly subject: string;
  readonly message: string;
}

function digest(fields: SignedDraftFields): Buffer {
  const payload = JSON.stringify([fields.id, fields.today, fields.subject, fields.message]);
  return createHmac("sha256", secret()).update(payload).digest();
}

export function signDraft(fields: SignedDraftFields): string {
  return digest(fields).toString("hex");
}

export function verifyDraft(fields: SignedDraftFields, signature: string): boolean {
  const expected = digest(fields);
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
