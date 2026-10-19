import { z } from "zod";
import { LastReminderSchema } from "./invoice";

const MAX_CENTS = Number.MAX_SAFE_INTEGER / 100;

/** Per-session changes layered on top of the fixture invoices (payments made, reminders sent). */
export const OverridesSchema = z.record(
  z.string(),
  z.object({
    paid_cents: z.number().int().nonnegative().max(MAX_CENTS).optional(),
    last_reminder: LastReminderSchema.nullable().optional(),
  }),
);
export type Overrides = z.infer<typeof OverridesSchema>;
