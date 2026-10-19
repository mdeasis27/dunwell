import { z } from "zod";
import {
  ActionableBodySchema,
  fail,
  limitOrNull,
  ok,
  readBody,
  resolveActionable,
} from "@/services/api";
import { MailError, sendEmail } from "@/services/mail";
import { verifyDraft } from "@/services/signing";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

const SendBodySchema = ActionableBodySchema.extend({
  to: z.string().max(MAX_EMAIL_LENGTH).regex(EMAIL_PATTERN).optional(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(4000),
  signature: z.string().regex(/^[0-9a-f]{64}$/),
});

export async function POST(request: Request): Promise<Response> {
  const limited = limitOrNull(request, "send");
  if (limited) return limited;
  const body = await readBody(request, SendBodySchema);
  if (!body.ok) return body.response;
  const resolved = resolveActionable(body.data);
  if (!resolved.ok) return resolved.response;
  const signed = {
    id: body.data.id,
    today: body.data.today,
    subject: body.data.subject,
    message: body.data.message,
  };
  if (!verifyDraft(signed, body.data.signature)) return fail(400, "draft_not_signed");
  try {
    const result = await sendEmail({
      to: body.data.to,
      subject: body.data.subject,
      body: body.data.message,
    });
    return ok({ delivered: result.delivered, stage: resolved.value.stage });
  } catch (error: unknown) {
    if (error instanceof MailError) return fail(502, "send_failed");
    console.error("send route failed", error instanceof Error ? error.message : error);
    return fail(500, "send_failed");
  }
}
