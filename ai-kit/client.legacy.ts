// ai-kit/client.legacy.ts
// Legacy OpenRouter-only client — kept for backwards compatibility.
// New code should use chat() from router.ts directly.

import { FREE_MODELS_PRIORITY, type ModelId, type ModelSelection } from "./models";

const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

type Cache = {
  selection: ModelSelection | null;
  fetchedAt: number;
};

let cache: Cache = { selection: null, fetchedAt: 0 };

export type MdeaAiConfig = {
  apiKey: string | undefined;
  cacheTtlMs?: number;
  referer?: string;
  appName?: string;
};

export class NoModelAvailableError extends Error {
  constructor(public readonly tried: ModelId[]) {
    super(`No free OpenRouter model available from allowlist: ${tried.join(", ")}`);
    this.name = "NoModelAvailableError";
  }
}

async function fetchAvailableModels(apiKey: string | undefined): Promise<Set<ModelId>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await fetch(OPENROUTER_MODELS_URL, { headers });
  if (!res.ok) throw new Error(`OpenRouter /models failed: ${res.status}`);
  const json = (await res.json()) as { data: Array<{ id: string }> };
  return new Set(json.data.map((m) => m.id));
}

export async function selectModel(config: MdeaAiConfig): Promise<ModelSelection> {
  const ttl = config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const now = Date.now();
  if (cache.selection && now - cache.fetchedAt < ttl) return cache.selection;

  const available = await fetchAvailableModels(config.apiKey);
  for (let i = 0; i < FREE_MODELS_PRIORITY.length; i += 1) {
    const model = FREE_MODELS_PRIORITY[i];
    if (available.has(model)) {
      const selection: ModelSelection = { model, discoveredAt: now, fallbackIndex: i };
      cache = { selection, fetchedAt: now };
      return selection;
    }
  }
  throw new NoModelAvailableError([...FREE_MODELS_PRIORITY]);
}

export function createMdeaAi(config: MdeaAiConfig) {
  return {
    selectModel: () => selectModel(config),
    resetCache: () => {
      cache = { selection: null, fetchedAt: 0 };
    },
  };
}

export type MdeaAi = ReturnType<typeof createMdeaAi>;
