# GAN harness spec: Dunwell

Stands in for `gan-planner` output (`/gan-build --skip-planner`). The full design is in `docs/SPEC.md`, the build order in
`docs/PLAN.md` and the requirements in `REQUIREMENTS.md`. On conflict, REQUIREMENTS.md wins, then SPEC.md.

## One-line brief
A bilingual Next.js story page whose working product decides, for a simulated day, which dunning reminder each
freelancer invoice gets (rules 1 to 7, with the deciding rule shown), drafts the email, and attaches a payment link.
Everything works with no environment variables.

## Features (evaluate the current slice, plus regressions in earlier ones)
1. Decision engine: exact rules 1 to 7; CLI `decide` / `eval` print JSON only; `eval` scores 100 on fixtures.
2. Dashboard: day picker (+ prev/next, `?today=`), a row per invoice with the action badge and the localized reason.
3. Drafts: tone escalates by stage; label "Template, not model output" in demo, "Written by a language model" in live.
4. Send: on-screen outbox in demo; a send records `last_reminder` so later days honor rules 5 to 7.
5. Pay: mock checkout marks the invoice paid in the session; the dashboard flips to rule 1 / none.
6. Story page: hero → analogy + glossary → Try it → Compare (computed) → Where it fits → What it proves → `<details>` For engineers.
7. Routing and i18n: `/` → `/en`, `/{lang}` → `/{lang}/app`, the query is kept, an unknown locale gives 404, EN/ES switch, typed dictionary.
8. Identity: own palette, fonts and wordmark; AA contrast; 375 px; keyboard access with visible focus; one h1.

## Hard constraints (any violation caps the score at 4)
- No `any`, no `@ts-ignore`; `typecheck`, `lint`, `test` and `build` pass.
- Money in integer cents; no floats in domain code.
- No secrets client-side; live services only when their env var is set; Stripe key only if `sk_test_`.
- No em dashes and no brand or company names in UI copy; first person.
- Template output is never presented as model output.
