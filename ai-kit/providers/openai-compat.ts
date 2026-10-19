// ai-kit/providers/openai-compat.ts
// Generic client for OpenAI-compatible endpoints: Groq, OpenRouter, OpenAI BYOK.

import type { LLMProvider } from "./base";
import type { ChatOptions, ChatResponse } from "../types";
import { ProviderError } from "../errors";

type OpenAICompatConfig = {
  name: string;
  priority: number;
  baseURL: string;
  apiKey: string | undefined;
  defaultModel: string;
  extraHeaders?: Record<string, string>;
};

type OpenAIMessage = { role: string; content: string };

type OpenAIResponse = {
  choices: Array<{ message: { content: string }; finish_reason: string }>;
  model: string;
};

export function createOpenAICompatProvider(config: OpenAICompatConfig): LLMProvider {
  return {
    name: config.name,
    priority: config.priority,

    isAvailable() {
      return !!config.apiKey;
    },

    async chat(opts: ChatOptions): Promise<ChatResponse> {
      if (!config.apiKey) {
        throw new ProviderError(config.name, undefined);
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...config.extraHeaders,
      };

      const start = Date.now();

      const res = await fetch(`${config.baseURL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.defaultModel,
          messages: opts.messages as OpenAIMessage[],
          max_tokens: opts.maxTokens ?? 1024,
          temperature: opts.temperature ?? 0.7,
        }),
        signal: opts.signal,
      });

      if (!res.ok) {
        throw new ProviderError(config.name, res.status);
      }

      const data = (await res.json()) as OpenAIResponse;
      const text = data.choices[0]?.message?.content ?? "";

      return {
        text,
        provider: config.name,
        model: data.model ?? config.defaultModel,
        latency_ms: Date.now() - start,
      };
    },
  };
}
