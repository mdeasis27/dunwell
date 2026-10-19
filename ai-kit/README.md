# MDEA AI Kit

Shared AI primitives for MDEA portfolio projects that use LLMs. Parallel to `design-system/`; optional per project.

## What's included

- `models.ts` — prioritized allowlist of free LLM API models.
- `client.ts` — `createMdeaAi()` with dynamic discovery + 10-min cache + fallback.
- `demo-mode.ts` — convention and helpers for pre-computed demo cases.
- `rate-limit.tsx` — UI to recover gracefully when live mode hits a rate limit.

## Convention — demo mode obligatorio

**Every MDEA portfolio project that uses LLMs must ship a demo mode that works without any API key.** Rationale: LLM API free-tier rate limits per IP mean a public demo can break for a visitor if previous visitors exhausted quota. Demo mode guarantees the product always works.

```ts
import { defineDemoCase, pickDemoCase } from "@/ai-kit/demo-mode";

const cases = [
  defineDemoCase({ id: "maria", input: "María Pérez", output: { score: 78 } }),
  defineDemoCase({ id: "carlos", input: "Carlos López", output: { score: 42 } }),
];

const demo = pickDemoCase(cases, userInput); // deterministic choice
```

## Usage — live mode

```ts
import { createMdeaAi, NoModelAvailableError } from "@/ai-kit/client";

const ai = createMdeaAi({ apiKey: process.env.OPENROUTER_API_KEY });
try {
  const { model } = await ai.selectModel();
  // call LLM API with `model`
} catch (err) {
  if (err instanceof NoModelAvailableError) {
    // fall back to demo mode
  }
}
```

## Env vars — conventional names

| Var | Default | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | (unset) | Required for live mode; absent ⇒ live mode disabled. |
| `NEXT_PUBLIC_MDEA_DEMO_DEFAULT` | `true` in prod | Controls initial mode of UI. |
| `MDEA_AI_CACHE_TTL_MS` | `600000` | Model discovery cache TTL. |

## Syncing to a sibling project

```bash
pnpm ai:sync
```

Copies this entire directory into the consumer project. Writes `.ai-sync-manifest.json`.
