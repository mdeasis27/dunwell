import type { Stage } from "../domain/invoice";
import type { Overrides } from "../domain/overrides";
import type { Locale } from "../i18n/locales";

export interface LinkInfo {
  readonly url: string;
  readonly mode: "live" | "demo";
}

export interface DraftInfo {
  readonly subject: string;
  readonly body: string;
  readonly source: "model" | "template";
}

export interface DraftResponse {
  readonly draft: DraftInfo;
  readonly fellBack: boolean;
  readonly link: LinkInfo;
  readonly stage: Stage;
  readonly signature: string;
}

export interface SendResponse {
  readonly delivered: boolean;
  readonly stage: Stage;
}

export interface LinkResponse {
  readonly link: LinkInfo;
}

export interface BaseRequest {
  readonly id: string;
  readonly today: string;
  readonly lang: Locale;
  readonly overrides: Overrides;
}

export type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly status: number };

export async function postJson<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return { ok: false, status: response.status };
    const json = (await response.json()) as { ok: boolean; data?: T };
    if (!json.ok || json.data === undefined) return { ok: false, status: response.status };
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** Only http(s) links are ever rendered as hrefs, whatever the server returned. */
export function safeHttpUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url, "http://localhost");
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}
