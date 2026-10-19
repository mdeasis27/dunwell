"use client";

// ai-kit/provider-badge.tsx
// Telemetry badge — shows provider, model, and latency after each AI response.

type Props = {
  provider: string;
  model: string;
  latency_ms: number;
};

const PROVIDER_COLORS: Record<string, string> = {
  gemini: "bg-blue-50 text-blue-700 border-blue-200",
  groq: "bg-orange-50 text-orange-700 border-orange-200",
  openrouter: "bg-violet-50 text-violet-700 border-violet-200",
  anthropic: "bg-amber-50 text-amber-700 border-amber-200",
  "openai-byok": "bg-green-50 text-green-700 border-green-200",
};

export function ProviderBadge({ provider, latency_ms }: Props) {
  const colorClass =
    PROVIDER_COLORS[provider.toLowerCase()] ??
    "bg-zinc-50 text-zinc-600 border-zinc-200";

  return (
    <div className={`inline-flex items-center gap-2 rounded border px-2.5 py-1 text-xs font-medium ${colorClass}`}>
      <span>LLM</span>
      <span className="opacity-60">·</span>
      <span>{latency_ms.toLocaleString()}ms</span>
    </div>
  );
}
