import { z } from "zod";
import { tryParseDay } from "./dates";

export const STAGES = ["heads_up", "friendly", "firm", "final", "escalate"] as const;
export type Stage = (typeof STAGES)[number];
export type Action = Stage | "none" | "hold";
export type RuleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | "stage";

export const STAGE_ORDER: Readonly<Record<Stage, number>> = {
  heads_up: 0,
  friendly: 1,
  firm: 2,
  final: 3,
  escalate: 4,
};

const DaySchema = z
  .string()
  .refine((s) => tryParseDay(s) !== null, "Expected a real YYYY-MM-DD date");
// Refunds can make paid_cents negative; the rules still work on the signed integer.
const MAX_CENTS = Number.MAX_SAFE_INTEGER / 100;
const CentsSchema = z.number().int().min(-MAX_CENTS).max(MAX_CENTS);
const StageSchema = z.enum(STAGES);
const ActionSchema = z.enum([...STAGES, "none", "hold"]);

export const LastReminderSchema = z.object({ stage: StageSchema, date: DaySchema });
export type LastReminder = z.infer<typeof LastReminderSchema>;

export const InvoiceSchema = z.looseObject({
  id: z.string().min(1),
  client: z.string(),
  amount_cents: CentsSchema,
  due: DaySchema,
  paid_cents: CentsSchema,
  last_reminder: LastReminderSchema.nullable(),
  hold: z.boolean(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const CaseSchema = z.object({
  today: DaySchema,
  invoices: z.array(InvoiceSchema),
  expected: z.record(z.string(), ActionSchema),
});
export type Case = z.infer<typeof CaseSchema>;

export const InvoiceListSchema = z.array(InvoiceSchema);
export const CaseListSchema = z.array(CaseSchema);
export { DaySchema };
