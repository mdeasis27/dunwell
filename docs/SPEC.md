# Dunwell: design and technical spec

Source of truth for *what* to build: `REQUIREMENTS.md`. Product framing: `.claude/prds/dunwell.prd.md`.
This document is the *how*. The build order and decision log are in `docs/PLAN.md`.

## 1. Stack (locked)

| Concern | Choice | Why |
|---|---|---|
| Runtime / PM | Bun 1.3.x | Fixed by brief |
| Framework | Next.js 16 App Router, React 19 | Fixed by brief |
| Language | TypeScript `strict` + `noUncheckedIndexedAccess`, no `any`, no `@ts-ignore` | Fixed by brief |
| Tests | `bun test` (unit + integration + route smoke) | Fixed runner; no extra e2e framework in MVP (D10) |
| Lint / format | Biome 2.x (`biome check .`) | One fast dep; `next lint` is gone in Next 16. `ai-kit/` ignored as vendored |
| Validation | zod 4 at system boundaries (CLI file input, route handler bodies) | Schema plus inferred types |
| Fonts | `next/font/google`: **Fraunces** (display/wordmark) + **Atkinson Hyperlegible** (body/UI) | Distinct identity, legible body |
| External services | Raw `fetch` to Stripe REST (test mode) and Resend REST; LLM via `ai-kit/router` `chat()` | No SDK deps; each has a demo path |

## 2. Module layout

```
src/
  domain/                 # pure, framework-free, fully unit tested
    dates.ts              # parseDay("YYYY-MM-DD") -> day int, weekday(), formatDay(), addDays()
    money.ts              # formatCents(cents, locale) via Intl, integer only
    invoice.ts            # zod schemas + types: Invoice, Stage, Action, LastReminder, Case
    decide.ts             # decideInvoice(inv, today) -> Decision ; decideAll(invoices, today)
    evaluate.ts           # evaluateCases(cases) -> { cases, decisions, accuracy, score }
    simulate.ts           # forward simulation for "Compare" (rules vs naive daily nagging)
    reasons.ts            # rule id -> dictionary key (no strings here)
  cli/
    decide.ts             # bun run decide <file> --today YYYY-MM-DD
    eval.ts               # bun run eval [cases.json]
    io.ts                 # readJsonFile, printJson (stdout only), fail (stderr JSON + exit 1)
  services/               # server-only adapters ("server-only"), each with live + demo path
    mode.ts               # serviceModes(): { llm, payments, mail } live|demo from env
    drafts/templates.ts   # committed templates per locale x stage
    drafts/llm.ts         # ai-kit router call -> Draft { source: "model" }
    drafts/index.ts       # getDraft(): live -> llm (fallback to template on error), demo -> template
    payments.ts           # createPaymentLink(): Stripe test Checkout Session | mock checkout path
    mail.ts               # sendEmail(): Resend | { delivered: false, outbox: true }
    invoices.ts           # loadFixtureInvoices(), applyOverrides(session overrides)
  i18n/
    locales.ts            # LOCALES = ["en","es"] as const, DEFAULT_LOCALE, isLocale()
    dictionary.ts         # Dictionary type from en shape; dict: Record<Locale, Dictionary>
  routing/
    locale-redirect.ts    # pure decision used by proxy.ts (unit tested)
  components/             # TryIt (client), InvoiceTable, ActionBadge, DayPicker, DraftPanel,
                          # Outbox, LangSwitch, Wordmark, Section
app/
  [lang]/layout.tsx       # <html lang>, fonts, tokens; generateStaticParams en/es; notFound() otherwise
  [lang]/page.tsx         # redirect -> /{lang}/app (query kept)
  [lang]/app/page.tsx     # story page (server component, one h1)
  [lang]/app/opengraph-image.tsx
  [lang]/checkout/[id]/page.tsx   # mock checkout (demo payments)
  api/draft/route.ts      # POST {id, today, lang, overrides} -> Draft
  api/send/route.ts       # POST {id, today, to?, draft} -> {delivered|outbox}
  api/pay-link/route.ts   # POST {id, lang, today, overrides} -> {url, mode}
  globals.css             # imports styles/tokens.css
styles/tokens.css         # CSS custom properties (palette, type scale, spacing, focus ring)
proxy.ts                  # Next 16 request proxy (formerly middleware; verify name at scaffold)
ai-kit/                   # vendored, untouched
fixtures/                 # invoices.json, cases.json
tests/                    # mirrors src/; cli.test.ts spawns the scripts
```

Invariant: `src/domain` imports nothing from `app/`, `services/`, `next` or `react`. The CLI and the UI both
call the same `decideAll`, so the dashboard and the graded output can never disagree.

## 3. Decision engine (graded; exact)

### Types
```ts
type Stage  = "heads_up" | "friendly" | "firm" | "final" | "escalate";
type Action = Stage | "none" | "hold";
type RuleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | "stage";
interface Decision {
  readonly id: string; readonly action: Action; readonly rule: RuleId;
  readonly daysOverdue: number; readonly remainingCents: number; readonly stage: Stage | null; // stage from rule 4 band, if reached
}
const STAGE_ORDER: Readonly<Record<Stage, number>> = { heads_up: 0, friendly: 1, firm: 2, final: 3, escalate: 4 };
```

### Dates
- `parseDay` validates `^\d{4}-\d{2}-\d{2}$` and a real calendar date (leap years), then returns the integer
  number of days since 1970-01-01 (days-from-civil algorithm). No `Date` local-time APIs in `src/domain`.
- `weekday(day) = (((day + 4) % 7) + 7) % 7` (0 = Sunday; 1970-01-01 was a Thursday). Weekend = 0 or 6.
  Check: 2026-10-17 is a Saturday and 2026-10-18 is a Sunday (these are fixture weekend cases).

### Algorithm (first match wins, exactly the brief's order)
```
remaining = amount_cents - paid_cents
1. remaining * 100 <= amount_cents             -> none,  rule 1   (also covers overpaid and zero amount)
2. hold                                        -> hold,  rule 2
3. weekday(today) is Sat or Sun                -> none,  rule 3
4. d = today - due
   -3..-1 heads_up | 1..6 friendly | 7..20 firm | 21..44 final | >=45 escalate
   d == 0 or d < -3                            -> none,  rule 4
5. stage == heads_up and last_reminder != null -> none,  rule 5
6. last != null and ORDER[stage] < ORDER[last.stage]                 -> none, rule 6
7. last != null and stage == last.stage and (today - last.date) < 7  -> none, rule 7  (negative gaps count as < 7)
otherwise                                      -> stage, rule "stage"
```
Integer math only. The schema requires safe non-negative integers for cents, so `remaining * 100` is exact for any
realistic amount (< 9e13 cents).

### Input contract
`InvoiceSchema = { id: string, client: string, amount_cents: int >= 0, due: Day, paid_cents: int >= 0,
last_reminder: { stage: Stage, date: Day } | null, hold: boolean }`. Unknown keys are allowed (`z.looseObject`),
to stay lenient toward extras in hidden cases. `CaseSchema = { today: Day, invoices: Invoice[], expected: Record<string, Action> }`.
Invalid input means the CLI exits with code 1, writes a JSON error to **stderr**, and leaves stdout empty.

### CLI output (stdout, JSON only: `JSON.stringify(x, null, 2)` + newline)
- `decide <file> --today YYYY-MM-DD` (`--today=YYYY-MM-DD` accepted too; `--today` required, D2):
  `{ "today": "YYYY-MM-DD", "decisions": [{ "id", "action", "rule" }] }` in input order.
- `eval [file]` (default `fixtures/cases.json`):
  `{ "cases": <number of cases>, "decisions": <invoices decided>, "accuracy": correct / scored, "score": accuracy * 100 }`.
  `scored` = ids present in `expected`. An expected id with no matching invoice counts as wrong. If `scored` is 0, accuracy is 0.
  No rounding (D6).
- `package.json`: `"decide": "bun src/cli/decide.ts"`, `"eval": "bun src/cli/eval.ts"`. Tests assert that the whole stdout
  parses as JSON, both via `bun src/cli/...` and via `bun run decide ...`.

## 4. Product surface

### Try it (client component; session state in `sessionStorage["dunwell:v1"]`)
State: `{ today, overrides: Record<id, { paid_cents?, last_reminder? }>, outbox: OutboxItem[] }`. Persisted with
an immutable reducer; invalid stored JSON is discarded through schema parse.
- **Day picker**: labelled native `<input type="date">`, default `2026-10-16` (the fixture's reference day, a Friday), with
  "Previous day" / "Next day" buttons and a `?today=` query param, so links are shareable. Each change recomputes
  `decideAll` client-side (pure domain code, no network).
- **Table** (stacked cards below 640 px): client, amount, remaining, due, days overdue, action badge (color plus text,
  never color alone), reason = localized sentence per rule id, e.g. "Paid in full, or 1% or less left", "On hold",
  "Weekend: reminders go out on weekdays", "Not in a reminder window today", "Heads up only before any reminder",
  "Already at a firmer stage", "Same stage sent less than 7 days ago", "Sending: {stage}".
- **Draft**: a "Draft email" button on actionable rows calls `POST /api/draft`. The panel shows the subject, the body and a source
  label: "Written by a language model" (live) or "Template, not model output" (demo, or after a fallback with a notice).
- **Payment link**: `POST /api/pay-link`. Live means a Stripe test-mode Checkout Session URL. Demo means
  `/{lang}/checkout/{id}?today=…`. The mock checkout shows the amount due and a "Pay (test)" button. Paying writes
  `paid_cents = amount_cents` into session overrides, then returns to `/{lang}/app?today=…`, where the row now shows rule 1 / `none`.
- **Send**: `POST /api/send`. Live (Resend) sends to an address the visitor types, since fixtures have no emails (D8).
  Demo appends to the on-screen **Outbox**, labelled "Not sent: demo outbox". Either way, sending records
  `last_reminder = { stage, date: today }` in the overrides, so rules 5 to 7 visibly take effect on the next days.
- **Reset** clears session state. A status line shows which services are live or demo (from `serviceModes()`
  passed by the server page; booleans only, never keys).

### Draft generation
- Templates: `templates[locale][stage] = { subject, body }` with `{client}`, `{amount}`, `{due}`, `{days}`, `{link}`.
  Tone ramps up: heads_up (friendly notice before due) → friendly → firm (asks for a date) → final (states a deadline)
  → escalate (work paused, next step). First person, plain words, no em dashes. Tested for every locale x stage.
- LLM: `chat()` imported from `ai-kit/router` (**not** the `ai-kit/client` barrel, which re-exports `"use client"`
  components). The system prompt fixes the stage, tone, language, max 120 words and the facts, and asks for JSON `{subject, body}`.
  `maxTokens: 400`, `temperature: 0.4`. The output is parsed with zod. If parsing fails or the router throws, the
  template is used, labelled as one. If `{link}`/the URL is missing, it is appended.
- `llm` is live when any of `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` is set (matches the router).

### Route handlers (server-only; zod-validated; envelope `{ ok: true, data } | { ok: false, error }`)
Each handler loads the fixture invoice by `id`, applies validated session overrides, and recomputes the decision
server-side. It refuses to draft or send if the action is `none` or `hold`. Payment amount = fixture `amount_cents` −
validated `paid_cents`, clamped to `[1, amount_cents]`, so the client never sets the price.

## 5. Routing and i18n
- `routing/locale-redirect.ts` (pure, unit tested), used by `proxy.ts`. The matcher excludes `_next`, `api`, files with
  an extension, and `opengraph-image`:
  - first segment `en`/`es` → pass through.
  - first segment matches `^[a-z]{2}(-[a-z]{2})?$` (case-insensitive) but is not a known locale → pass through,
    and `app/[lang]/layout.tsx` calls `notFound()` → **404** (D3).
  - otherwise (including `/`) → **307** to `/en{pathname}{search}` (`/` → `/en`).
- `app/[lang]/page.tsx` → `redirect("/{lang}/app" + search)`, keeping the query.
- `dictionary.ts`: `const en = {...} as const satisfies DictShape`. `type Dictionary = typeof`-derived widened shape,
  so `es: Dictionary` must have every key. `export const dict: Record<Locale, Dictionary>`. Every visible string goes
  through it: reasons, badges, ARIA labels, templates' surrounding UI, OG text, and the details section.

## 6. Story page (`/{lang}/app`, exactly one `h1`)
Top bar: `← All projects` / `← Todos los proyectos` link to `https://portafolio-mdea.vercel.app/{lang}/projects`
(top-left), wordmark, and an EN/ES switch that keeps the path and query. Then the sections, in order:
1. **Hero**: name (h1), one-liner, chips ("Rule engine", "EN / ES", "Runs with no keys").
2. **Analogy**: a dentist's reminder routine (postcard, then a call, then a firm letter). Mini glossary of 4 terms:
   *dunning*, *stage*, *hold*, *quiet week* (7-day no-repeat).
3. **Try it**: the product (section 4).
4. **Compare**: numbers computed on the server at render time from fixtures, never typed in. A 30-day simulation from
   2026-10-16, where every sent reminder is recorded as `last_reminder`, of (a) Dunwell rules versus (b) "email every unpaid
   overdue invoice every weekday". Shows the emails sent by each, the max emails to one client in any 7 days, and the
   invoices that reached 45+ days overdue without ever getting a reminder. Plus the `eval` score on `fixtures/cases.json`.
5. **Where it fits**: worth it when / not needed when.
6. **What it proves**: first person.
7. `<details>` (closed) **For engineers** / **Para ingenieros**: rule table with thresholds, the integer-day approach,
   how it's tested (counts computed from the test inventory are out of scope; describe the method), the live eval score,
   `Stack: Bun, Next.js, TypeScript, zod, Biome`, link to `https://github.com/mdeasis27/dunwell`.

Copy rules: first person, plain words, no em dashes, no brand or company names in UI copy (so "payment provider",
"language model", not vendor names). A test greps the dictionary for `—` and for a denylist of vendor names.

## 7. Identity (final values and contrast ratios recorded in DESIGN.md during S7)
Wordmark: "dunwell" in Fraunces 600, lowercase, with a small stepped underline (3 bars of rising weight = the stages).
Initial palette tokens, all to be verified at AA (4.5:1 body, 3:1 large and UI) in `DESIGN.md`:
`--paper #FAF6EF`, `--surface #FFFFFF`, `--ink #1F1B16`, `--muted #5C5348`, `--accent #8A3B12`,
stages: heads_up `#2F5D8A`, friendly `#2E6B3F`, firm `#7A5600`, final `#A13D12`, escalate `#8E1B2C`, hold `#5C5348`.
Focus: 3 px `--accent` outline, 2 px offset, never removed. Min target 44x44 px. Layout works from 375 px up.

## 8. Security
- Secrets read only from `process.env` in `services/` (marked `import "server-only"`). No `NEXT_PUBLIC_` secrets.
- The Stripe key counts as set only if it starts with `sk_test_`, so live charges are impossible (D7).
- All bodies are zod-validated with length caps (body ≤ 4000, subject ≤ 200, email ≤ 254 and email format).
- `/api/draft`, `/api/send` and `/api/pay-link` are rate limited via `ai-kit/rate-limit`, keyed by IP (`x-forwarded-for` first hop).
- Errors return generic messages and never echo provider responses or keys. Details are logged server-side via `console.error`
  inside `services/` only.
- The mock checkout return URL is built server-side as a same-origin relative path (no open redirect).

## 9. Testing strategy
- `domain/dates`: round trips, leap days (2024-02-29 valid, 2026-02-29 invalid), month ends, weekday of known dates.
- `domain/decide`: table tests for every band edge (−4, −3, −1, 0, 1, 6, 7, 20, 21, 44, 45), weekday vs weekend, each of
  rules 1 to 7, and precedence pairs (paid + hold → 1; hold + weekend → 2; weekend + heads_up → 3; heads_up with prior
  heads_up → 5; lower stage within 7 days → 6, not 7; same stage at gap 6/7/8 and negative). Rule-label consistency
  property over generated invoices: `rule === "stage"` iff `action` is a Stage.
- `domain/evaluate`: all 8 visible cases → `accuracy 1`, `score 100`, plus synthetic mismatches for the math.
- `cli/*`: spawn the process; assert exit 0, `JSON.parse(stdout)`, input order, `--today` missing or invalid → exit 1 with empty stdout.
- `services/*`: env cleared → demo paths. Live paths with `globalThis.fetch` stubbed (no network). `sk_live_` is refused.
- `i18n`: every key path in `en` exists in `es` and is non-empty, no `—`, and no vendor names.
- `routing`: `locale-redirect` cases `/`, `/app?x=1`, `/es`, `/fr/app`, `/EN/app`, `/foo/bar`.
- Route smoke (`tests/smoke.test.ts`, run after `build` in `bun run test:smoke`, not part of the default `test`, to
  keep `bun test` fast and build-independent): `/` → 307 `/en`, `/en` → `/en/app`, `/en/app` and `/es/app` 200, `/xx/app` 404.
- Coverage: 80%+ lines on `src/domain`, `src/cli`, `src/services`, `src/routing` (`bun test --coverage`).
