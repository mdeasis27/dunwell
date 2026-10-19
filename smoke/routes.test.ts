import { afterAll, beforeAll, describe, expect, test } from "bun:test";

// Requires a production build (`bun run build`). Boots `next start` with an empty service environment.
const PORT = Number(process.env.SMOKE_PORT ?? 3187);
const BASE = `http://localhost:${PORT}`;
const SERVICE_KEYS = [
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
  "OPENROUTER_API_KEY",
  "STRIPE_SECRET_KEY",
  "RESEND_API_KEY",
  "MAIL_FROM",
];

let server: ReturnType<typeof Bun.spawn> | undefined;

function cleanEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !SERVICE_KEYS.includes(key)) env[key] = value;
  }
  return { ...env, PORT: String(PORT) };
}

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await fetch(`${BASE}/en/app`, { redirect: "manual" });
      return;
    } catch {
      await Bun.sleep(500);
    }
  }
  throw new Error("server did not start");
}

async function get(path: string): Promise<Response> {
  return fetch(`${BASE}${path}`, { redirect: "manual" });
}

function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function assertPortFree(): Promise<void> {
  try {
    await fetch(BASE, { redirect: "manual" });
  } catch {
    return;
  }
  throw new Error(`port ${PORT} is already in use; stop that server or set SMOKE_PORT`);
}

beforeAll(async () => {
  await assertPortFree();
  // Run next directly (not through `bun run`) so killing the process stops the server itself.
  server = Bun.spawn(
    [process.execPath, "node_modules/next/dist/bin/next", "start", "-p", String(PORT)],
    {
      env: cleanEnv(),
      stdout: "ignore",
      stderr: "ignore",
    },
  );
  await waitForServer();
}, 60_000);

afterAll(() => {
  server?.kill();
});

describe("routes", () => {
  test("/ redirects to /en keeping the query", async () => {
    const res = await get("/?today=2026-10-19");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/en?today=2026-10-19");
  });

  test("a path without a locale gets the default locale", async () => {
    const res = await get("/app?x=1");
    expect(res.headers.get("location")).toContain("/en/app?x=1");
  });

  test("/{lang} redirects to /{lang}/app", async () => {
    for (const lang of ["en", "es"]) {
      const res = await get(`/${lang}?today=2026-10-19`);
      expect([307, 308]).toContain(res.status);
      expect(res.headers.get("location")).toContain(`/${lang}/app?today=2026-10-19`);
    }
  });

  test("/en/app and /es/app render one h1 and the right language", async () => {
    for (const lang of ["en", "es"]) {
      const res = await get(`/${lang}/app`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain(`<html lang="${lang}"`);
      expect(html.match(/<h1[ >]/g)?.length).toBe(1);
      expect(html).toContain(`https://portafolio-mdea.vercel.app/${lang}/projects`);
      expect(html).toContain("<details");
    }
  });

  test("unknown locale is 404", async () => {
    expect((await get("/xx/app")).status).toBe(404);
    expect((await get("/fr")).status).toBe(404);
  });

  test("opengraph image is served per locale", async () => {
    for (const lang of ["en", "es"]) {
      const res = await get(`/${lang}/app/opengraph-image`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("image/png");
    }
  });

  test("draft api works in demo mode and labels templates", async () => {
    const res = await postJson("/api/draft", {
      id: "INV-1001",
      today: "2026-10-16",
      lang: "en",
      overrides: {},
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      data: { draft: { source: string }; link: { mode: string } };
    };
    expect(json.data.draft.source).toBe("template");
    expect(json.data.link.mode).toBe("demo");
  });

  test("draft api refuses a day with no reminder", async () => {
    const res = await postJson("/api/draft", {
      id: "INV-1001",
      today: "2026-10-17",
      lang: "en",
      overrides: {},
    });
    expect(res.status).toBe(409);
  });

  test("send api accepts only a signed draft and uses the demo outbox without a mail key", async () => {
    const base = { id: "INV-1001", today: "2026-10-16", lang: "en", overrides: {} };
    const drafted = (await (await postJson("/api/draft", base)).json()) as {
      data: { draft: { subject: string; body: string }; signature: string };
    };
    const { draft, signature } = drafted.data;
    const sent = await postJson("/api/send", {
      ...base,
      subject: draft.subject,
      message: draft.body,
      signature,
    });
    expect(sent.status).toBe(200);
    const json = (await sent.json()) as { ok: boolean; data: { delivered: boolean } };
    expect(json.data.delivered).toBe(false);

    const tampered = await postJson("/api/send", {
      ...base,
      subject: draft.subject,
      message: `${draft.body} extra`,
      signature,
    });
    expect(tampered.status).toBe(400);
  });

  test("mock checkout page renders", async () => {
    const res = await get("/en/checkout/INV-1001?today=2026-10-16");
    expect(res.status).toBe(200);
  });
});
