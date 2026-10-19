# Dunwell

Chase unpaid invoices on a schedule: politely first, then firmly. Español: [README.es.md](README.es.md).

## Result

**Decision accuracy: 100 / 100** on the 8 provided cases (49 invoices), from `bun run eval`:

```json
{ "cases": 8, "decisions": 49, "accuracy": 1, "score": 100 }
```

Given invoices and a date, Dunwell decides which reminder each invoice gets (`heads_up`, `friendly`, `firm`,
`final`, `escalate`, `hold` or `none`), says which rule decided, drafts the email and attaches a payment link.
The seven rules are implemented exactly as specified in `REQUIREMENTS.md`, in order, and tested at every edge.

## Run it

```bash
bun install
bun run dev                  # http://localhost:3000/en/app and /es/app, no environment variables needed
bun run build && bun run start

bun run decide fixtures/invoices.json --today 2026-10-16   # JSON on stdout, nothing else
bun run eval                                               # accuracy and score over fixtures/cases.json

bun test                     # unit and CLI tests
bun run build && bun run test:smoke   # route smoke tests against `next start`
bun run typecheck && bun run lint
```

Everything works with no environment variables. Each external service has an optional live mode:

| Variable | Turns on | Without it |
|---|---|---|
| `GEMINI_API_KEY`, `GROQ_API_KEY` or `OPENROUTER_API_KEY` | Emails written by a language model through `ai-kit/` | Committed templates, labelled "Template, not model output" |
| `STRIPE_SECRET_KEY` (must start with `sk_test_`) | Test-mode checkout links | Local mock checkout that marks the invoice paid in the session |
| `RESEND_API_KEY` and `MAIL_FROM` | Real sending (you type the recipient) | On-screen outbox, labelled "Not sent" |

## Architecture

1. `src/domain/`: pure logic with no framework imports. `decide.ts` is the seven rules; `dates.ts` turns `YYYY-MM-DD` into integer day numbers.
2. `src/cli/`: `decide` and `eval`. They print JSON on stdout; errors go to stderr as JSON with exit code 1.
3. The CLI and the page both call the same `decideAll`, so the dashboard can never disagree with the graded output.
4. `src/services/`: server-only adapters (drafts, payments, mail), each with a live path and a demo path. Provider calls are plain `fetch`.
5. `app/api/{draft,send,pay-link}`: validated with zod, rate limited with `ai-kit/rate-limit`, and the server recomputes the decision before acting.
6. `src/components/`: one client component (`TryIt`) holds session state (`sessionStorage`) in a pure, tested reducer.
7. `src/i18n/dictionary.ts`: one `Record<"en" | "es", Dictionary>`, so a missing translation is a type error.
8. `proxy.ts` redirects locale-less paths to `/en`, keeping the query string. An unknown locale is a 404.
9. Design tokens are in `styles/tokens.css` and documented in [DESIGN.md](DESIGN.md), with a tested contrast table.

## Tradeoffs

- **Integer day numbers instead of `Date`.** Dates become days since 1970 with a civil-calendar algorithm, so there are no time zones and no daylight-saving bugs. The cost is a small hand-written date module, covered by tests.
- **No database.** Paid invoices and sent reminders live in the browser session and are sent to the server with each request, which re-validates them. Good for a demo, not for real invoices.
- **No provider SDKs.** Payments and mail are two `fetch` calls each, which keeps dependencies and bundle small, but I handle errors and request shapes myself.

## What didn't work

- The vendored `ai-kit/` does not compile under `noUncheckedIndexedAccess`. I did not edit it. I left it out of the tsconfig `include`, so only the parts the app imports are type-checked, and I excluded it from lint.
- `server-only` throws under `bun test`, so `tests/setup.ts` mocks it.
- The live paths (language model, payment provider, mail provider) were tested only with `fetch` stubbed. I had no keys, so I never ran them against the real services.
- On the first dev start, Next generated an `AGENTS.md`. I removed it and git-ignored it.
