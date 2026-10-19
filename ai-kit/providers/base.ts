// ai-kit/providers/base.ts

import type { ChatOptions, ChatResponse } from "../types";

export interface LLMProvider {
  readonly name: string;
  readonly priority: number;
  isAvailable(): boolean;
  chat(opts: ChatOptions): Promise<ChatResponse>;
}
