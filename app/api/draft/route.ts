import {
  ActionableBodySchema,
  fail,
  limitOrNull,
  ok,
  originOf,
  readBody,
  resolveActionable,
} from "@/services/api";
import { getDraft } from "@/services/drafts";
import { createPaymentLink } from "@/services/payments";
import { signDraft } from "@/services/signing";

export async function POST(request: Request): Promise<Response> {
  const limited = limitOrNull(request, "draft");
  if (limited) return limited;
  const body = await readBody(request, ActionableBodySchema);
  if (!body.ok) return body.response;
  const resolved = resolveActionable(body.data);
  if (!resolved.ok) return resolved.response;
  const { invoice, decision, stage } = resolved.value;
  try {
    const link = await createPaymentLink({
      invoiceId: invoice.id,
      client: invoice.client,
      remainingCents: decision.remainingCents,
      lang: body.data.lang,
      today: body.data.today,
      origin: originOf(request),
    });
    const { draft, fellBack } = await getDraft({
      invoiceId: invoice.id,
      client: invoice.client,
      remainingCents: decision.remainingCents,
      due: invoice.due,
      daysOverdue: decision.daysOverdue,
      stage,
      lang: body.data.lang,
      link: link.url,
    });
    const signature = signDraft({
      id: invoice.id,
      today: body.data.today,
      subject: draft.subject,
      message: draft.body,
    });
    return ok({ draft, fellBack, link, stage, signature });
  } catch (error: unknown) {
    console.error("draft route failed", error instanceof Error ? error.message : error);
    return fail(500, "draft_failed");
  }
}
