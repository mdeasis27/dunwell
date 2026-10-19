import { type Day, isWeekend, parseDay } from "./dates";
import { type Action, type Invoice, type RuleId, STAGE_ORDER, type Stage } from "./invoice";

export interface Decision {
  readonly id: string;
  readonly action: Action;
  readonly rule: RuleId;
  readonly daysOverdue: number;
  readonly remainingCents: number;
  readonly stage: Stage | null;
}

const REPEAT_GAP_DAYS = 7;
const PERCENT_SCALE = 100;

const STAGE_BANDS: ReadonlyArray<{ readonly from: number; readonly stage: Stage }> = [
  { from: 45, stage: "escalate" },
  { from: 21, stage: "final" },
  { from: 7, stage: "firm" },
  { from: 1, stage: "friendly" },
  { from: -3, stage: "heads_up" },
];

/** Stage for the overdue band, or null for day 0 and anything earlier than 3 days before due. */
export function stageForDaysOverdue(daysOverdue: number): Stage | null {
  if (daysOverdue === 0) return null;
  const band = STAGE_BANDS.find((b) => daysOverdue >= b.from);
  return band ? band.stage : null;
}

export function decideInvoice(invoice: Invoice, today: Day): Decision {
  const remainingCents = invoice.amount_cents - invoice.paid_cents;
  const daysOverdue = today - parseDay(invoice.due);
  const base = { id: invoice.id, daysOverdue, remainingCents };
  const stop = (action: Action, rule: RuleId, stage: Stage | null = null): Decision => ({
    ...base,
    action,
    rule,
    stage,
  });

  if (remainingCents * PERCENT_SCALE <= invoice.amount_cents) return stop("none", 1);
  if (invoice.hold) return stop("hold", 2);
  if (isWeekend(today)) return stop("none", 3);

  const stage = stageForDaysOverdue(daysOverdue);
  if (stage === null) return stop("none", 4);

  const last = invoice.last_reminder;
  if (last === null) return stop(stage, "stage", stage);
  if (stage === "heads_up") return stop("none", 5, stage);
  if (STAGE_ORDER[stage] < STAGE_ORDER[last.stage]) return stop("none", 6, stage);
  if (stage === last.stage && today - parseDay(last.date) < REPEAT_GAP_DAYS) {
    return stop("none", 7, stage);
  }
  return stop(stage, "stage", stage);
}

export function decideAll(invoices: readonly Invoice[], today: Day): Decision[] {
  return invoices.map((invoice) => decideInvoice(invoice, today));
}
