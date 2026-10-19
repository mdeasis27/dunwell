// ai-kit/providers/anthropic.ts
// Anthropic BYOK provider — lazy import, no package required in consumers.

import type { LLMProvider } from "./base";
import type { ChatOptions, ChatResponse } from "../types";
import { ProviderError } from "../errors";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
type AnthropicResponse = { content: Array<{ type: string; text?: string }>; model?: string };
type AnthropicClient = { messages: { create(input: { model: string; max_tokens: number; system?: string; messages: Array<{ role: "user" | "assistant"; content: string }> }): Promise<AnthropicResponse> } };
type AnthropicConstructor = new (options: { apiKey: string }) => AnthropicClient;

export function createAnthropicProvider(apiKey: string): LLMProvider {
  return {
    name: "anthropic",
    priority: 99,

    isAvailable() {
      return !!apiKey;
    },

    async chat(opts: ChatOptions): Promise<ChatResponse> {
      const start = Date.now();

      try {
        // A variable module name keeps this optional SDK out of consumer dependency graphs.
        const moduleName = "@anthropic-ai/sdk";
        const { default: imported } = await import(/* webpackIgnore: true */ moduleName);
        const Anthropic = imported as unknown as AnthropicConstructor;
        const client = new Anthropic({ apiKey });

        const systemMsg = opts.messages.find((m) => m.role === "system")?.content;
        const messages = opts.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

        const response = await client.messages.create({
          model: DEFAULT_MODEL,
          max_tokens: opts.maxTokens ?? 1024,
          system: systemMsg,
          messages,
        });

        const text: string =
          response.content.find((block) => block.type === "text")?.text ?? "";

        return {
          text,
          provider: "anthropic",
          model: response.model ?? DEFAULT_MODEL,
          latency_ms: Date.now() - start,
        };
      } catch (err: unknown) {
        const status =
          err instanceof Error && "status" in err ? (err as { status: number }).status : undefined;
        throw new ProviderError("anthropic", status, err);
      }
    },
  };
}
