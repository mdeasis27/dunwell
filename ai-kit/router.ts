// ai-kit/router.ts
// Multi-provider LLM router: Gemini → Groq → OpenRouter, with BYOK override.

import type { ChatOptions, ChatResponse } from "./types";
import type { LLMProvider } from "./providers/base";
import { createGeminiProvider } from "./providers/gemini";
import { createOpenAICompatProvider } from "./providers/openai-compat";
import { AllProvidersFailedError, ProviderError, isRetryableError } from "./errors";

function buildDefaultProviders(): LLMProvider[] {
  const providers: LLMProvider[] = [
    createGeminiProvider(process.env.GEMINI_API_KEY),
    createOpenAICompatProvider({
      name: "groq",
      priority: 2,
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
      defaultModel: "llama-3.3-70b-versatile",
    }),
    createOpenAICompatProvider({
      name: "openrouter",
      priority: 3,
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
      extraHeaders: {
        "HTTP-Referer": "https://portafolio-mdea.vercel.app",
        "X-Title": "MDEA Portfolio",
      },
    }),
  ];

  return providers.filter((p) => p.isAvailable()).sort((a, b) => a.priority - b.priority);
}

export async function chat(opts: ChatOptions): Promise<ChatResponse> {
  // BYOK path — direct provider, no fallback
  if (opts.userApiKey) {
    const { provider, key } = opts.userApiKey;

    if (provider === "anthropic") {
      const { createAnthropicProvider: mkAnthropic } = await import("./providers/anthropic");
      return mkAnthropic(key).chat(opts);
    }

    if (provider === "gemini") {
      const { createGeminiProvider: mkGemini } = await import("./providers/gemini");
      return mkGemini(key).chat(opts);
    }

    if (provider === "openai") {
      return createOpenAICompatProvider({
        name: "openai-byok",
        priority: 0,
        baseURL: "https://api.openai.com/v1",
        apiKey: key,
        defaultModel: "gpt-4o-mini",
      }).chat(opts);
    }
  }

  // Default path — iterate providers by priority
  const providers = buildDefaultProviders();
  if (providers.length === 0) {
    throw new AllProvidersFailedError([]);
  }

  const errors: ProviderError[] = [];

  for (const provider of providers) {
    try {
      return await provider.chat(opts);
    } catch (err: unknown) {
      const pe =
        err instanceof ProviderError
          ? err
          : new ProviderError(provider.name, undefined, err);

      errors.push(pe);

      if (!isRetryableError(pe)) {
        // Non-retryable (e.g., 400 bad request) — stop immediately
        break;
      }
    }
  }

  throw new AllProvidersFailedError(errors);
}
