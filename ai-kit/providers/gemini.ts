// ai-kit/providers/gemini.ts
// Gemini provider using @google/genai SDK (lazy import — no package required in consumers).

import type { LLMProvider } from "./base";
import type { ChatOptions, ChatResponse } from "../types";
import { ProviderError } from "../errors";

const DEFAULT_MODEL = "gemini-2.0-flash";
type GeminiResponse = { text?: string };
type GeminiClient = { models: { generateContent(input: { model: string; contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>; config: { maxOutputTokens: number; temperature: number; systemInstruction?: string } }): Promise<GeminiResponse> } };
type GeminiConstructor = new (options: { apiKey: string }) => GeminiClient;

export function createGeminiProvider(apiKey: string | undefined): LLMProvider {
  return {
    name: "gemini",
    priority: 1,

    isAvailable() {
      return !!apiKey;
    },

    async chat(opts: ChatOptions): Promise<ChatResponse> {
      if (!apiKey) {
        throw new ProviderError("gemini", undefined);
      }

      const start = Date.now();

      try {
        // A variable module name keeps this optional SDK out of consumer dependency graphs.
        const moduleName = "@google/genai";
        const { GoogleGenAI: imported } = await import(/* webpackIgnore: true */ moduleName);
        const GoogleGenAI = imported as unknown as GeminiConstructor;
        const genai = new GoogleGenAI({ apiKey });

        const systemMsg = opts.messages.find((m) => m.role === "system");
        const userMessages = opts.messages.filter((m) => m.role !== "system");

        const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = userMessages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const response = await genai.models.generateContent({
          model: DEFAULT_MODEL,
          contents,
          config: {
            maxOutputTokens: opts.maxTokens ?? 1024,
            temperature: opts.temperature ?? 0.7,
            ...(systemMsg ? { systemInstruction: systemMsg.content } : {}),
          },
        });

        const text: string = response.text ?? "";

        return {
          text,
          provider: "gemini",
          model: DEFAULT_MODEL,
          latency_ms: Date.now() - start,
        };
      } catch (err: unknown) {
        const status =
          err instanceof Error && "status" in err ? (err as { status: number }).status : undefined;
        throw new ProviderError("gemini", status, err);
      }
    },
  };
}
