import { z } from "zod";
import { DaySchema, type Invoice, STAGES, type Stage } from "../domain/invoice";
import { type Overrides, OverridesSchema } from "../domain/overrides";

export const STORAGE_KEY = "dunwell:v1";
export const DEFAULT_DAY = "2026-10-16";

export interface OutboxItem {
  readonly invoiceId: string;
  readonly client: string;
  readonly day: string;
  readonly stage: Stage;
  readonly subject: string;
  readonly body: string;
  readonly delivered: boolean;
}

export interface SessionState {
  readonly today: string;
  readonly overrides: Overrides;
  readonly outbox: readonly OutboxItem[];
}

export type SessionAction =
  | { readonly type: "setDay"; readonly day: string }
  | { readonly type: "paid"; readonly invoiceId: string; readonly amountCents: number }
  | { readonly type: "sent"; readonly item: OutboxItem }
  | { readonly type: "reset"; readonly day: string }
  | { readonly type: "load"; readonly state: SessionState };

const OutboxItemSchema = z.object({
  invoiceId: z.string(),
  client: z.string(),
  day: DaySchema,
  stage: z.enum(STAGES),
  subject: z.string(),
  body: z.string(),
  delivered: z.boolean(),
});

const StoredSchema = z.object({
  today: DaySchema,
  overrides: OverridesSchema,
  outbox: z.array(OutboxItemSchema),
});

export function initialState(day: string = DEFAULT_DAY): SessionState {
  return { today: day, overrides: {}, outbox: [] };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "setDay":
      return { ...state, today: action.day };
    case "paid":
      return {
        ...state,
        overrides: {
          ...state.overrides,
          [action.invoiceId]: {
            ...state.overrides[action.invoiceId],
            paid_cents: action.amountCents,
          },
        },
      };
    case "sent":
      return {
        ...state,
        overrides: {
          ...state.overrides,
          [action.item.invoiceId]: {
            ...state.overrides[action.item.invoiceId],
            last_reminder: { stage: action.item.stage, date: action.item.day },
          },
        },
        outbox: [action.item, ...state.outbox],
      };
    case "reset":
      return initialState(action.day);
    case "load":
      return action.state;
  }
}

/** Parses stored text. Anything missing or invalid falls back to a fresh state. */
export function parseStored(raw: string | null, fallbackDay: string): SessionState {
  if (raw === null) return initialState(fallbackDay);
  try {
    const parsed = StoredSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : initialState(fallbackDay);
  } catch {
    return initialState(fallbackDay);
  }
}

export function serialize(state: SessionState): string {
  return JSON.stringify(state);
}

export function applyOverrides(invoices: readonly Invoice[], overrides: Overrides): Invoice[] {
  return invoices.map((invoice) => {
    const o = overrides[invoice.id];
    if (!o) return invoice;
    return {
      ...invoice,
      paid_cents: o.paid_cents ?? invoice.paid_cents,
      last_reminder: o.last_reminder === undefined ? invoice.last_reminder : o.last_reminder,
    };
  });
}
