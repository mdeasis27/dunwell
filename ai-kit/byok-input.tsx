"use client";

import { useState } from "react";
import type { UserApiKey } from "./types";

type Props = { onKeyChange: (key: UserApiKey | null) => void; locale?: "en" | "es" };

export function detectProvider(key: string): UserApiKey["provider"] | null {
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("AIza") || key.startsWith("AQ.")) return "gemini";
  if (key.startsWith("sk-")) return "openai";
  return null;
}

export function ApiKeyInput({ onKeyChange, locale = "en" }: Props) {
  const [value, setValue] = useState("");
  const [detected, setDetected] = useState<UserApiKey["provider"] | null>(null);
  const es = locale === "es";
  const label: Record<UserApiKey["provider"], string> = { openai: "sk-", anthropic: "sk-ant-", gemini: "AIza / AQ." };

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const key = event.target.value.trim();
    const provider = detectProvider(key);
    setValue(key);
    setDetected(provider);
    onKeyChange(provider ? { provider, key } : null);
  }

  return <div className="rounded border border-zinc-200 bg-zinc-50 p-3 text-sm">
    <p className="mb-2 font-medium text-zinc-700">{es ? "Usa tu propia clave API (opcional)" : "Use your own API key (optional)"}</p>
    <input type="password" value={value} onChange={handleChange} placeholder="sk-... / sk-ant-... / AIza..." aria-label={es ? "Clave API" : "API key"} className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-700" />
    {detected && <p className="mt-1.5 text-xs text-zinc-500">{es ? "Prefijo detectado" : "Detected prefix"}: <span className="font-medium text-zinc-700">{label[detected]}</span></p>}
    {value && !detected && <p className="mt-1.5 text-xs text-red-500">{es ? "Prefijo no reconocido. Usa sk-, sk-ant-, AIza o AQ." : "Unknown prefix. Use sk-, sk-ant-, AIza, or AQ."}</p>}
  </div>;
}
