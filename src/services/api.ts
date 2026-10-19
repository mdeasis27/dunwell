import "server-only";
import { z } from "zod";
import { rateLimit } from "@/ai-kit/rate-limit";
import { tryParseDay } from "../domain/dates";
import { type Decision, decideInvoice } from "../domain/decide";
import { DaySchema, type Invoice, type Stage } from "../domain/invoice";
import { type Overrides, OverridesSchema } from "../domain/overrides";
import { LOCALES } from "../i18n/locales";
import { findInvoice } from "./invoices";

export type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string };

const MAX_REQUESTS_PER_HOUR = 120;
const MAX_GLOBAL_REQUESTS_PER_HOUR = 600;
const MAX_BODY_BYTES = 20_000;

export const ActionableBodySchema = z.object({
  id: z.string().min(1).max(100),
  today: DaySchema,
  lang: z.enum(LOCALES),
  overrides: OverridesSchema.default({}),
});
export type ActionableBody = z.infer<typeof ActionableBodySchema>;

export function ok<T>(data: T): Response {
  return Response.json({ ok: true, data } satisfies ApiEnvelope<T>);
}

export function fail(status: number, error: string, headers?: HeadersInit): Response {
  return Response.json({ ok: false, error } satisfies ApiEnvelope<never>, { status, headers });
}

/** Trusted client address: the platform's real-ip header, else the last (proxy-appended) forwarded entry. */
export function clientAddress(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",");
  return forwarded?.at(-1)?.trim() || "local";
}

export function clientKey(request: Request, route: string): string {
  return `${route}:${clientAddress(request)}`;
}

/** Returns a 429 response when the caller is over the limit, otherwise null. */
export function limitOrNull(request: Request, route: string): Response | null {
  const result = rateLimit(clientKey(request, route), { maxRequests: MAX_REQUESTS_PER_HOUR });
  // A global cap bounds cost and mail volume even if per-client keys are rotated.
  const global = rateLimit(`global:${route}`, { maxRequests: MAX_GLOBAL_REQUESTS_PER_HOUR });
  if (result.allowed && global.allowed) return null;
  return fail(429, "rate_limited", { "Retry-After": String(result.retryAfterSeconds ?? 60) });
}

export async function readBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return { ok: false, response: fail(413, "too_large") };
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, response: fail(400, "invalid_json") };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { ok: false, response: fail(400, "invalid_request") };
  return { ok: true, data: parsed.data };
}

export interface Actionable {
  readonly invoice: Invoice;
  readonly decision: Decision;
  readonly stage: Stage;
}

/** Looks up the invoice, recomputes today's decision server-side and requires that a reminder is due. */
export function resolveActionable(body: {
  id: string;
  today: string;
  overrides: Overrides;
}): { ok: true; value: Actionable } | { ok: false; response: Response } {
  const day = tryParseDay(body.today);
  const invoice = findInvoice(body.id, body.overrides);
  if (day === null || invoice === null)
    return { ok: false, response: fail(404, "unknown_invoice") };
  const decision = decideInvoice(invoice, day);
  if (decision.rule !== "stage" || decision.stage === null) {
    return { ok: false, response: fail(409, "no_reminder_today") };
  }
  return { ok: true, value: { invoice, decision, stage: decision.stage } };
}

/** Configured site URL when present, so a forged Host header cannot point payment or email links elsewhere. */
export function originOf(request: Request): string {
  const configured = process.env.SITE_URL;
  if (configured) return new URL(configured).origin;
  return new URL(request.url).origin;
}
