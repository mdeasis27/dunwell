import { ActionableBodySchema, fail, limitOrNull, ok, originOf, readBody } from "@/services/api";
import { findInvoice } from "@/services/invoices";
import { createPaymentLink } from "@/services/payments";

export async function POST(request: Request): Promise<Response> {
  const limited = limitOrNull(request, "pay-link");
  if (limited) return limited;
  const body = await readBody(request, ActionableBodySchema);
  if (!body.ok) return body.response;
  const invoice = findInvoice(body.data.id, body.data.overrides);
  if (!invoice) return fail(404, "unknown_invoice");
  // The price comes from the stored invoice, never from the client.
  const remainingCents = Math.min(
    Math.max(invoice.amount_cents - invoice.paid_cents, 0),
    invoice.amount_cents,
  );
  if (remainingCents < 1) return fail(409, "nothing_to_pay");
  const link = await createPaymentLink({
    invoiceId: invoice.id,
    client: invoice.client,
    remainingCents,
    lang: body.data.lang,
    today: body.data.today,
    origin: originOf(request),
  });
  return ok({ link });
}
