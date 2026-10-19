# GAN eval rubric: Dunwell

Score each axis 0 to 10. The overall score is the weighted mean. Pass threshold **7.0**. Any hard-constraint violation in
`gan-harness/spec.md` caps the overall score at 4.

| Axis | Weight | 10 looks like | ≤ 4 looks like |
|---|---|---|---|
| Decision correctness | 0.30 | `bun run eval` gives score 100; boundary tests for all band edges, weekends and the 7-day repeat exist and pass; CLI stdout parses as JSON | Any visible case wrong, or non-JSON on stdout |
| Demo-mode completeness | 0.15 | With an empty env: draft (labelled template), outbox, mock checkout and paid state all work | Any feature needs a key or crashes without one |
| Spec fidelity (page and routes) | 0.15 | Section order exact; redirects and 404 behave; portfolio link and language switch; Compare numbers computed | Sections missing or out of order; hard-coded numbers |
| Code quality | 0.15 | `domain/` is pure; functions < 50 lines; files < 800; immutable updates; zod at boundaries; explicit errors | `any`, mutation of shared state, swallowed errors |
| Accessibility and identity | 0.10 | AA contrast documented and tested; keyboard flow; visible focus; labelled controls; 375 px clean; one h1 | Color-only status, unlabelled inputs, broken mobile |
| i18n and copy | 0.10 | Every string comes from the typed dictionary; es complete; no em dashes or vendor names; first person | Hard-coded strings, missing es |
| Tests and coverage | 0.05 | ≥ 80% lines on src/domain, cli, services, routing | < 60% or tests that only snapshot |

## Evaluator procedure (code-only mode)
1. `bun install && bun run typecheck && bun run lint && bun test --coverage && bun run build`.
2. `bun run --silent decide fixtures/invoices.json --today 2026-10-16 | bun -e "JSON.parse(await Bun.stdin.text())"`; the same for `eval`.
3. Read `app/[lang]/app/page.tsx` for section order. Grep `src/i18n/dictionary.ts` for `—` and vendor names.
4. `bun run test:smoke` for the routes, once a build exists.
5. Write `gan-harness/feedback/feedback-NNN.md` with axis scores, evidence (file:line) and the top 3 fixes.
