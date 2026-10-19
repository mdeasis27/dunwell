# AI Kit Changelog

## 2.0.0 — 2026-04-17
- Multi-provider router: Provider C (priority 1) → LLM API (2) → LLM API (3) with automatic fallback.
- BYOK support: Provider A, Provider B, Provider C keys via `<ApiKeyInput>` — key stays in browser.
- Telemetry: `ChatResponse` includes `provider`, `model`, `latency_ms`; rendered via `<ProviderBadge>`.
- `rateLimit()` server-side helper extracted from agente-cobranzas inline logic.
- New files: `types.ts`, `errors.ts`, `router.ts`, `rate-limit.ts`, `byok-input.tsx`, `provider-badge.tsx`, `providers/`.
- `rate-limit.tsx` renamed to `rate-limit-notice.tsx` to avoid collision with new server helper.
- Legacy `client.ts` API preserved via `client.legacy.ts` re-exports.

## 1.0.0 — 2026-04-16
- Initial kit extracted from agente-riesgo dynamic-model pattern.
- Allowlist: llama-3.3-70b, gemini-2.0-flash-exp, deepseek-chat-v3.
- Conventions: demo mode obligatorio, env vars standardized.
