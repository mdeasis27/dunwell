import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  ActionableBodySchema,
  clientAddress,
  fail,
  ok,
  originOf,
  readBody,
  resolveActionable,
} from "../src/services/api";
import { getDraft } from "../src/services/drafts";
import { templateDraft } from "../src/services/drafts/templates";
import { applyOverrides, findInvoice, loadFixtureInvoices } from "../src/services/invoices";
import { sendEmail } from "../src/services/mail";
import { isLlmLive, isMailLive, isPaymentsLive, serviceModes } from "../src/services/mode";
import { createPaymentLink, mockCheckoutPath } from "../src/services/payments";
import { signDraft, verifyDraft } from "../src/services/signing";

const KEYS = [
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
  "OPENROUTER_API_KEY",
  "STRIPE_SECRET_KEY",
  "RESEND_API_KEY",
  "MAIL_FROM",
] as const;

const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  globalThis.fetch = realFetch;
});

function stubFetch(response: Response): ReturnType<typeof mock> {
  const stub = mock(async () => response);
  globalThis.fetch = stub as unknown as typeof fetch;
  return stub;
}

const request = {
  invoiceId: "INV-1001",
  client: "Marta",
  remainingCents: 180000,
  lang: "en",
  today: "2026-10-16",
  origin: "http://localhost:3000",
};

describe("service modes", () => {
  test("everything is demo with an empty environment", () => {
    expect(serviceModes()).toEqual({ llm: false, mail: false, payments: false });
  });
  test("each key switches only its own service", () => {
    process.env.GROQ_API_KEY = "x";
    expect(isLlmLive()).toBe(true);
    process.env.RESEND_API_KEY = "x";
    expect(isMailLive()).toBe(false);
    process.env.MAIL_FROM = "me@example.com";
    expect(isMailLive()).toBe(true);
  });
  test("a live payment key is refused", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(isPaymentsLive()).toBe(false);
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    expect(isPaymentsLive()).toBe(true);
  });
});

describe("drafts", () => {
  const facts = {
    invoiceId: "INV-1001",
    client: "Marta",
    remainingCents: 180000,
    due: "2026-10-10",
    daysOverdue: 6,
    stage: "friendly" as const,
    lang: "en" as const,
    link: "http://x/pay",
  };

  test("templates fill every placeholder for every stage and locale", () => {
    for (const lang of ["en", "es"] as const) {
      for (const stage of ["heads_up", "friendly", "firm", "final", "escalate"] as const) {
        const draft = templateDraft({ ...facts, lang, stage });
        expect(draft.source).toBe("template");
        expect(`${draft.subject}${draft.body}`).not.toMatch(/\{\w+\}/);
        expect(draft.body).toContain("http://x/pay");
      }
    }
  });

  test("demo mode returns a labelled template without touching the network", async () => {
    const stub = stubFetch(new Response("{}"));
    const result = await getDraft(facts);
    expect(result.draft.source).toBe("template");
    expect(result.fellBack).toBe(false);
    expect(stub).not.toHaveBeenCalled();
  });

  test("live mode with a failing provider falls back to a template", async () => {
    process.env.GROQ_API_KEY = "x";
    stubFetch(new Response("nope", { status: 500 }));
    const result = await getDraft(facts);
    expect(result.draft.source).toBe("template");
    expect(result.fellBack).toBe(true);
  });

  test("live mode uses model output when it parses", async () => {
    process.env.GROQ_API_KEY = "x";
    const content = JSON.stringify({ subject: "Hi", body: "Please pay http://x/pay" });
    stubFetch(Response.json({ choices: [{ message: { content } }] }));
    const result = await getDraft(facts);
    expect(result.draft).toEqual({
      subject: "Hi",
      body: "Please pay http://x/pay",
      source: "model",
    });
  });

  test("live mode with malformed model output falls back", async () => {
    process.env.GROQ_API_KEY = "x";
    stubFetch(Response.json({ choices: [{ message: { content: "not json" } }] }));
    const result = await getDraft(facts);
    expect(result.fellBack).toBe(true);
  });
});

describe("payments", () => {
  test("demo mode gives a same-origin mock checkout link", async () => {
    const link = await createPaymentLink(request);
    expect(link).toEqual({
      url: "http://localhost:3000/en/checkout/INV-1001?today=2026-10-16",
      mode: "demo",
    });
    expect(mockCheckoutPath(request)).toBe("/en/checkout/INV-1001?today=2026-10-16");
  });

  test("a live key never reaches the provider", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    const stub = stubFetch(Response.json({ url: "https://pay.example/x" }));
    const link = await createPaymentLink(request);
    expect(link.mode).toBe("demo");
    expect(stub).not.toHaveBeenCalled();
  });

  test("a test key creates a provider session for the remaining cents", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    const stub = stubFetch(Response.json({ url: "https://pay.example/session" }));
    const link = await createPaymentLink(request);
    expect(link).toEqual({ url: "https://pay.example/session", mode: "live" });
    const call = stub.mock.calls[0] as unknown as [string, { body: URLSearchParams }];
    expect(call[1].body.get("line_items[0][price_data][unit_amount]")).toBe("180000");
  });

  test("provider failure falls back to the mock checkout", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    stubFetch(new Response("no", { status: 500 }));
    expect((await createPaymentLink(request)).mode).toBe("demo");
  });
});

describe("mail", () => {
  test("demo mode does not deliver", async () => {
    const stub = stubFetch(new Response("{}"));
    expect(await sendEmail({ to: "a@b.co", subject: "s", body: "b" })).toEqual({
      delivered: false,
    });
    expect(stub).not.toHaveBeenCalled();
  });

  test("live mode posts the message", async () => {
    process.env.RESEND_API_KEY = "k";
    process.env.MAIL_FROM = "me@example.com";
    const stub = stubFetch(Response.json({ id: "1" }));
    expect(await sendEmail({ to: "a@b.co", subject: "s", body: "b" })).toEqual({
      delivered: true,
      to: "a@b.co",
    });
    const call = stub.mock.calls[0] as unknown as [string, { body: string }];
    expect(JSON.parse(call[1].body)).toEqual({
      from: "me@example.com",
      to: ["a@b.co"],
      subject: "s",
      text: "b",
    });
  });

  test("live mode needs a recipient and reports provider errors", async () => {
    process.env.RESEND_API_KEY = "k";
    process.env.MAIL_FROM = "me@example.com";
    await expect(sendEmail({ to: undefined, subject: "s", body: "b" })).rejects.toThrow();
    stubFetch(new Response("no", { status: 500 }));
    await expect(sendEmail({ to: "a@b.co", subject: "s", body: "b" })).rejects.toThrow();
  });
});

describe("invoices and api helpers", () => {
  test("overrides apply without mutating the fixture", () => {
    const [first] = loadFixtureInvoices();
    if (!first) throw new Error("no fixtures");
    const next = applyOverrides(loadFixtureInvoices(), {
      [first.id]: { paid_cents: first.amount_cents },
    });
    expect(next[0]?.paid_cents).toBe(first.amount_cents);
    expect(loadFixtureInvoices()[0]?.paid_cents).toBe(first.paid_cents);
    expect(findInvoice("nope", {})).toBeNull();
  });

  test("resolveActionable only accepts days with a reminder due", () => {
    const base = { id: "INV-1001", overrides: {} };
    expect(resolveActionable({ ...base, today: "2026-10-16" }).ok).toBe(true);
    const weekend = resolveActionable({ ...base, today: "2026-10-17" });
    expect(weekend.ok).toBe(false);
    if (!weekend.ok) expect(weekend.response.status).toBe(409);
    const unknown = resolveActionable({ id: "zzz", today: "2026-10-16", overrides: {} });
    if (!unknown.ok) expect(unknown.response.status).toBe(404);
  });

  test("readBody rejects bad json, bad shape and oversized bodies", async () => {
    const post = (body: string) => new Request("http://x/api", { method: "POST", body });
    const bad = await readBody(post("{"), ActionableBodySchema);
    expect(bad.ok === false && bad.response.status).toBe(400);
    const shape = await readBody(post('{"id":""}'), ActionableBodySchema);
    expect(shape.ok === false && shape.response.status).toBe(400);
    const big = await readBody(post("x".repeat(30_000)), ActionableBodySchema);
    expect(big.ok === false && big.response.status).toBe(413);
    const good = await readBody(
      post('{"id":"a","today":"2026-10-16","lang":"es"}'),
      ActionableBodySchema,
    );
    expect(good.ok).toBe(true);
  });

  test("envelopes", async () => {
    expect(await ok({ a: 1 }).json()).toEqual({ ok: true, data: { a: 1 } });
    const res = fail(409, "no");
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "no" });
  });
});

describe("hardening", () => {
  const fields = { id: "INV-1001", today: "2026-10-16", subject: "s", message: "m" };

  test("a signed draft verifies and any change is rejected", () => {
    const signature = signDraft(fields);
    expect(verifyDraft(fields, signature)).toBe(true);
    expect(verifyDraft({ ...fields, message: "m2" }, signature)).toBe(false);
    expect(verifyDraft({ ...fields, id: "INV-1002" }, signature)).toBe(false);
    expect(verifyDraft(fields, "zz")).toBe(false);
  });

  test("the signing key follows the mail key", () => {
    const demo = signDraft(fields);
    process.env.RESEND_API_KEY = "another-key";
    expect(verifyDraft(fields, demo)).toBe(false);
  });

  test("client address ignores the spoofable first forwarded entry", () => {
    const req = (headers: Record<string, string>) => new Request("http://x", { headers });
    expect(clientAddress(req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("2.2.2.2");
    expect(clientAddress(req({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }))).toBe(
      "9.9.9.9",
    );
    expect(clientAddress(req({}))).toBe("local");
  });

  test("origin comes from SITE_URL when configured", () => {
    const request = new Request("http://evil.example/api");
    expect(originOf(request)).toBe("http://evil.example");
    process.env.SITE_URL = "https://app.example.com/path";
    expect(originOf(request)).toBe("https://app.example.com");
    delete process.env.SITE_URL;
  });
});
