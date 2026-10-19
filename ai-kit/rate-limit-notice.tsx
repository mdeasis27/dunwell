"use client";

// ai-kit/rate-limit-notice.tsx
// UI helper: show a recoverable message when the live mode hits rate limit
// and invite the user to fall back to demo mode.

import type { HTMLAttributes } from "react";

type RateLimitNoticeProps = HTMLAttributes<HTMLDivElement> & {
  onSwitchToDemo?: () => void;
  retryAfterSeconds?: number;
};

export function RateLimitNotice({
  className,
  onSwitchToDemo,
  retryAfterSeconds,
  ...props
}: RateLimitNoticeProps) {
  return (
    <div
      data-slot="rate-limit-notice"
      className={[
        "my-4 rounded border border-red-300 bg-red-50 p-4 text-sm",
        className,
      ].filter(Boolean).join(" ")}
      role="alert"
      {...props}
    >
      <p className="font-medium">Live mode temporarily unavailable.</p>
      <p className="mt-1 text-foreground/70">
        LLM API rate limit reached for this IP
        {retryAfterSeconds ? ` — retry in ~${retryAfterSeconds}s` : ""}.
        {" "}
        Switch to demo mode to keep exploring with pre-computed cases.
      </p>
      {onSwitchToDemo ? (
        <button
          type="button"
          onClick={onSwitchToDemo}
          className="mt-3 inline-flex h-8 items-center rounded-[var(--radius)] border border-border bg-background px-3 text-[0.8rem] font-medium text-foreground hover:bg-muted/40"
        >
          Switch to demo
        </button>
      ) : null}
    </div>
  );
}
