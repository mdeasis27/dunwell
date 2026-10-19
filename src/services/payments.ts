import "server-only";
import { z } from "zod";
import { isPaymentsLive } from "./mode";

export interface PaymentLink {
  readonly url: string;
  readonly mode: "live" | "demo";
}

export interface PaymentRequest {
  readonly invoiceId: string;
  readonly client: string;
  readonly remainingCents: number;
  readonly lang: string;
  readonly today: string;
  readonly origin: string;
}

const STRIPE_SESSIONS_URL = "https://api.stripe.com/v1/checkout/sessions";
const SessionSchema = z.object({ url: z.string().url() });

export function mockCheckoutPath(
  req: Pick<PaymentRequest, "lang" | "invoiceId" | "today">,
): string {
  const query = new URLSearchParams({ today: req.today });
  return `/${req.lang}/checkout/${encodeURIComponent(req.invoiceId)}?${query.toString()}`;
}

async function providerLink(req: PaymentRequest, key: string): Promise<string> {
  const back = `${req.origin}/${req.lang}/app?${new URLSearchParams({ today: req.today }).toString()}`;
  const form = new URLSearchParams({
    mode: "payment",
    success_url: back,
    cancel_url: back,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(req.remainingCents),
    "line_items[0][price_data][product_data][name]": `Invoice ${req.invoiceId}`,
  });
  const response = await fetch(STRIPE_SESSIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  if (!response.ok) throw new Error(`payment provider answered ${response.status}`);
  return SessionSchema.parse(await response.json()).url;
}

/** Test-mode checkout when a test key is set, otherwise a same-origin mock checkout. Never throws. */
export async function createPaymentLink(req: PaymentRequest): Promise<PaymentLink> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (isPaymentsLive() && key) {
    try {
      return { url: await providerLink(req, key), mode: "live" };
    } catch (error: unknown) {
      console.error(
        "payments: provider failed, using mock checkout",
        error instanceof Error ? error.message : error,
      );
    }
  }
  return { url: `${req.origin}${mockCheckoutPath(req)}`, mode: "demo" };
}
