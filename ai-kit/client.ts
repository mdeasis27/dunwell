// ai-kit/client.ts
// Re-exports for backwards compatibility + v2 router surface.

// v2 — main API
export { chat } from "./router";
export type { ChatOptions, ChatResponse, Message, UserApiKey } from "./types";
export { ProviderError, AllProvidersFailedError, RateLimitError, isRetryableError } from "./errors";
export { rateLimit } from "./rate-limit";
export { ApiKeyInput } from "./byok-input";
export { ProviderBadge } from "./provider-badge";
export { defineDemoCase, pickDemoCase } from "./demo-mode";
export type { DemoCase } from "./demo-mode";
export { RateLimitNotice } from "./rate-limit-notice";

// v1 legacy exports (kept for compatibility)
export { FREE_MODELS_PRIORITY, MODELS } from "./models";
export type { ModelId, ModelSelection } from "./models";
export { createMdeaAi, selectModel, NoModelAvailableError } from "./client.legacy";
export type { MdeaAiConfig, MdeaAi } from "./client.legacy";
