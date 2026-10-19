// ai-kit/models.ts
// Model registry for MDEA portfolio — multi-provider.

export type ModelId = string;

// ─── Legacy: OpenRouter-only allowlist (kept for compatibility) ───────────────
export const FREE_MODELS_PRIORITY: readonly ModelId[] = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "deepseek/deepseek-chat-v3:free",
] as const;

export type ModelSelection = {
  model: ModelId;
  discoveredAt: number;
  fallbackIndex: number;
};

// ─── v2: multi-provider registry ─────────────────────────────────────────────
export const MODELS = {
  gemini: [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ] as const,
  groq: [
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768",
  ] as const,
  openrouter: [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemini-2.0-flash-exp:free",
    "deepseek/deepseek-chat-v3:free",
  ] as const,
} as const;
