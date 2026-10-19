// ai-kit/errors.ts

export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly statusCode: number | undefined,
    cause?: unknown,
  ) {
    super(`Provider ${provider} failed${statusCode ? ` (HTTP ${statusCode})` : ""}`);
    this.name = "ProviderError";
    if (cause) this.cause = cause;
  }
}

export class AllProvidersFailedError extends Error {
  constructor(public readonly errors: ProviderError[]) {
    super(`All LLM providers failed: ${errors.map((e) => e.provider).join(", ")}`);
    this.name = "AllProvidersFailedError";
  }
}

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds?: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
  }
}

export function isRetryableError(err: unknown): boolean {
  if (err instanceof ProviderError) {
    const s = err.statusCode;
    return s === 429 || s === 503 || s === 502 || s === 504 || s === undefined;
  }
  if (err instanceof Error) {
    const name = err.name.toLowerCase();
    return name === "aborterror" || name === "timeouterror" || name.includes("network");
  }
  return false;
}
