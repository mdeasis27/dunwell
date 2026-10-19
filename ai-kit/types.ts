// ai-kit/types.ts

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type UserApiKey = {
  provider: "openai" | "anthropic" | "gemini";
  key: string;
};

export type ChatOptions = {
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  userApiKey?: UserApiKey;
};

export type ChatResponse = {
  text: string;
  provider: string;
  model: string;
  latency_ms: number;
};
