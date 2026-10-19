# Dunwell: implementation plan (orch-build-mvp slice plan)

Inputs: `REQUIREMENTS.md` (spec), `.claude/prds/dunwell.prd.md` (PRD), `docs/SPEC.md` (design).
Pipeline: `orch-build-mvp` → `orch-pipeline` engine, **size tier: large** (spec doc, new external deps, public CLI contract).
Phases: 0 Intake ✔ → 1 Research ✔ → 2 Plan ✔ (this file) → 3 Scaffold → 4 TDD per slice → 5 Review → 6 Commit.

## Gate log (autonomous run: every approval granted)
| Gate | When | Status |
|---|---|---|
| GATE 1: slice plan approval | after this file | **APPROVED** 2026-10-16 (no human available; recommended options taken) |
| GATE 2: pre-commit, per slice | after review of each slice | Pre-approved: commit when DoD-per-slice is green and no CRITICAL/HIGH findings remain |

## Phase 1: research and reuse (summary)
- Versions checked on the registry, 2026-10-16: `next 16.4.2`, `react 19.3.1`, `@biomejs/biome 2.5.15`, `stripe 23.0.0`
  (not adopted), `resend 6.34.1` (not adopted). Local `bun 1.3.14`.
- Reuse: `ai-kit/` (vendored) for LLM routing, rate limiting and demo-case helpers. `create-next-app` output is the scaffold
  baseline, then trimmed. Stripe and Resend are called via REST `fetch` (2 endpoints total), so no SDK weight.
- To verify at scaffold time against current Next 16 docs: `proxy.ts` naming and matcher config, async `params`
  (`params: Promise<{ lang: string }>`), the `opengraph-image` signature, and that `next build` no longer runs lint.

## Decision log (questions answered with the recommended option)
| # | Question | Decision | Rationale |
|---|---|---|---|
| D1 | `rule` value when the rule-4 band yields `none` (day 0, or < −3) | `4` | Rule 4 is the one that decides; `"stage"` only when a stage is sent |
| D2 | `decide` without `--today` | Error, exit 1 | Deterministic output; brief always passes it |
| D3 | What counts as an "unknown locale" (→ 404) vs "no locale" (→ redirect) | A first segment shaped like a locale tag (`xx` / `xx-yy`) that is not `en`/`es` → 404; anything else gets the `/en` prefix | Satisfies both rules without guessing at every path |
| D4 | Lint tool | Biome; `ai-kit/` excluded as vendored | Fast, single dep, `next lint` removed |
| D5 | Where session state lives | `sessionStorage` (client) + overrides sent to route handlers and re-validated server-side | "Paid in the session", no DB |
| D6 | Rounding of `accuracy`/`score` | None | Brief defines score = accuracy × 100 exactly |
| D7 | Payment provider | Stripe test mode via REST, key must start with `sk_test_` | Test mode only; live charges impossible |
| D8 | Mail provider and recipient | Resend REST (`RESEND_API_KEY`, `MAIL_FROM`); the visitor types a recipient, since fixtures have no emails | Real send only with a key |
| D9 | Default simulated day | `2026-10-16` (Friday); `?today=` overrides | Fixture reference date; shows a mix of actions |
| D10 | E2E framework | None in MVP; a `bun test` route smoke against `next start` (`test:smoke`) + manual keyboard and 375 px pass | Brief fixes `bun test`; avoids a Playwright browser download |
| D11 | LLM entry point | `ai-kit/router` `chat()` server-side; never import the `ai-kit/client` barrel on the server | The barrel re-exports `"use client"` components |
| D12 | `eval` with ids in `expected` but missing from invoices | Count as wrong | Conservative accuracy |
| D13 | Unknown fields in input invoices | Allowed and ignored | Hidden cases may carry extras |
| D14 | Compare baseline | "Email every unpaid overdue invoice every weekday", simulated 30 days | Simple, honest, computed |
| D15 | Directory layout | `app/` at root, logic in `src/`, path alias `@/*` → `./src/*`, `@/ai-kit/*` → `./ai-kit/*` | Matches ai-kit README imports |

## Slices (thin and vertical; each ends green and gets its own `feat:` commit)

Per-slice DoD: `bun run typecheck`, `bun run lint` and `bun test` pass. New behaviour has tests written first (RED → GREEN →
REFACTOR). `code-reviewer` + `typescript-reviewer` run with no CRITICAL/HIGH findings open. `security-reviewer` runs when marked 🔒.

### S0: Scaffold (phase 3): the walking skeleton
Goal: one request flows end to end. `/` → `/en` → `/en/app` renders "Dunwell" from the typed dictionary in both locales.
- Bun + Next 16 + React 19 + TS strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` off), path aliases (D15).
- Scripts: `dev`, `build`, `start`, `test`, `test:smoke`, `typecheck` (`tsc --noEmit`), `lint` (`biome check .`), `decide`, `eval`.
- `biome.json` (ignore `ai-kit/`, `.next/`, `fixtures/`), `tsconfig.json` (includes `ai-kit/`; confirm it compiles strict).
- `src/i18n/locales.ts`, `dictionary.ts` (seed keys), `src/routing/locale-redirect.ts` + `proxy.ts`, `app/[lang]/layout.tsx`
  (`notFound` for unknown locale), `app/[lang]/page.tsx` redirect, `app/[lang]/app/page.tsx` placeholder with the h1 and the top bar.
- Tests: locale-redirect table, dictionary parity.
- Commit: `feat: scaffold next app with locale routing and typed dictionary`.

### S1: Decision engine + CLI (graded core) — milestone 1
- `src/domain/dates.ts`, `money.ts`, `invoice.ts` (zod), `decide.ts`, `evaluate.ts`.
- `src/cli/io.ts`, `decide.ts`, `eval.ts`. stdout is JSON only, errors go to stderr, exit codes.
- Tests first: the full table from SPEC §9, all 8 visible cases at 100, the rule-label property test, CLI spawn tests, and bad-input tests.
- Verify: `bun run decide fixtures/invoices.json --today 2026-10-16` and `bun run eval` print valid JSON, score 100.
- Commit: `feat: add decision engine with decide and eval cli`.

### S2: Dashboard with day picker and reasons — milestone 2
- `TryIt` client component, `InvoiceTable` (table ≥ 640 px, cards below), `ActionBadge`, `DayPicker` (prev/next, `?today=`),
  reason strings per rule in both locales, `sessionStorage` state reducer (schema-validated load) and Reset.
- Tests: reducer (immutable updates, bad storage → default), reason key coverage for every RuleId, a render test of the
  table via `react-dom/server` `renderToString` for both locales.
- Commit: `feat: add invoice dashboard with simulated day and rule reasons`.

### S3: Email drafts (templates + LLM live mode) 🔒 (external API, user input)
- `services/mode.ts`, `drafts/templates.ts` (en/es × 5 stages), `drafts/llm.ts` (ai-kit router, zod-parsed JSON, fallback),
  `drafts/index.ts`, `services/invoices.ts` (fixture + overrides), `app/api/draft/route.ts` (zod, rate limit, refuses none/hold).
- `DraftPanel` with a source label ("Template, not model output" / "Written by a language model") and a fallback notice.
- Tests: every template renders with placeholders filled and no `{`, no `—`; demo path with env cleared; live path with
  `chat` mocked; malformed model output → template; handler validation (400), rate limit (429), none/hold refused (409).
- Commit: `feat: draft reminder emails from templates or language model`.

### S4: Send and outbox 🔒
- `services/mail.ts` (Resend REST when `RESEND_API_KEY` + `MAIL_FROM`, else outbox), `app/api/send/route.ts`,
  `Outbox` component, recipient input (live only), recording `last_reminder` in overrides after a send.
- Tests: demo returns outbox; live posts the correct payload to the stubbed `fetch`; provider error → generic 502;
  email validation; after a send, the next day's decision shows rule 7 (integration through the reducer + `decideAll`).
- Commit: `feat: send reminders by email or to a demo outbox`.

### S5: Payment links + mock checkout 🔒 — completes milestone 3
- `services/payments.ts` (Stripe Checkout Session via REST, form-encoded, `sk_test_` guard; else mock path),
  `app/api/pay-link/route.ts`, `app/[lang]/checkout/[id]/page.tsx` (client island marks paid in session, returns to app).
  The link is included in drafts.
- Tests: the mock URL shape, the `sk_live_` refusal, amount clamping, the live payload with stubbed `fetch`, and that paying flips
  the decision to rule 1 `none`.
- Commit: `feat: add payment links with test-mode provider or mock checkout`.

### S6: Story page, Compare, OG images — milestone 4 (part)
- Sections in order (SPEC §6), `src/domain/simulate.ts` for Compare (tests first: deterministic counts, no reminder on
  weekends, naive baseline ≥ rules), live eval score in Compare and For engineers, `<details>` For engineers,
  `opengraph-image.tsx` per locale, LangSwitch keeping path + query, portfolio link top-left.
- Tests: simulate unit tests, dictionary copy checks (no `—`, vendor denylist), a render test asserting section order and a single `h1`.
- Commit: `feat: add story page with computed comparison and og images`.

### S7: Identity, accessibility, responsive
- `styles/tokens.css` (palette, type scale, spacing, focus ring), fonts via `next/font/google`, Wordmark component.
- `DESIGN.md`: tokens, typography, wordmark, and a contrast table for every text/background pair, computed by a small
  `bun test` (`tests/design-contrast.test.ts`) that asserts ≥ 4.5 (or ≥ 3 for large/UI) from the tokens file. That way
  the numbers in DESIGN.md are verified, not hand-typed.
- Manual pass: 375 px width, keyboard-only flow (pick day → draft → send → pay → back), visible focus, labelled controls.
- Commit: `feat: add visual identity, design tokens and design doc`.

### S8: Docs + definition of done
- `README.md` / `README.es.md`: the graded number first (output of `bun run eval`), how to run, architecture in under 10 lines,
  2 to 3 tradeoffs, what didn't work. Env var table (all optional).
- Full DoD run on a clean install: `bun install && bun run build && bun test && bun run typecheck && bun run lint`,
  both CLI scripts on the committed fixtures, then `bun run dev` with an empty env serving `/en/app` and `/es/app`, plus `test:smoke`.
- Final `orch-review` pass (quality + TypeScript + security) and fixes. Commit: `docs: add readmes` (+ `fix:` commits as needed).

## GAN harness use (orch-build-mvp step 2)
`gan-harness/spec.md` and `gan-harness/eval-rubric.md` are committed with this plan. For UI slices S2–S7, drive
`/gan-build "<slice brief>" --skip-planner --eval-mode code-only` (no Playwright browser in this environment; D10),
`--max-iterations 6`, `--pass-threshold 7.0`. For S0, S1 and S8, plain TDD is enough (deterministic, test-graded).

## Risks carried into the build
See the PRD Risks table. Highest: day-arithmetic off-by-one (mitigated by the S1 boundary tables) and Next 16 convention
drift (verified in S0 before anything depends on it).
