import { type Day, formatDay, isWeekend, parseDay } from "./dates";
import { decideAll } from "./decide";
import type { Invoice, LastReminder } from "./invoice";

export interface SimulationTotals {
  readonly total: number;
  readonly perInvoiceWeek: number;
  readonly held: number;
  readonly paidUp: number;
}

export interface Comparison {
  readonly days: number;
  readonly rules: SimulationTotals;
  readonly naive: SimulationTotals;
}

const WEEK = 7;
const PERCENT_SCALE = 100;

function isPaidUp(invoice: Invoice): boolean {
  return (invoice.amount_cents - invoice.paid_cents) * PERCENT_SCALE <= invoice.amount_cents;
}

function maxInAnyWeek(sentDays: ReadonlyMap<string, readonly Day[]>): number {
  let best = 0;
  for (const days of sentDays.values()) {
    for (const start of days) {
      const inWindow = days.filter((d) => d >= start && d < start + WEEK).length;
      best = Math.max(best, inWindow);
    }
  }
  return best;
}

function totalsFrom(
  invoices: readonly Invoice[],
  sent: ReadonlyMap<string, readonly Day[]>,
): SimulationTotals {
  const byId = new Map(invoices.map((i) => [i.id, i]));
  let total = 0;
  let held = 0;
  let paidUp = 0;
  for (const [id, days] of sent) {
    const invoice = byId.get(id);
    total += days.length;
    if (invoice?.hold) held += days.length;
    if (invoice && isPaidUp(invoice)) paidUp += days.length;
  }
  return { total, perInvoiceWeek: maxInAnyWeek(sent), held, paidUp };
}

function pushDay(map: Map<string, Day[]>, id: string, day: Day): void {
  map.set(id, [...(map.get(id) ?? []), day]);
}

function runRules(invoices: readonly Invoice[], start: Day, days: number): SimulationTotals {
  const sent = new Map<string, Day[]>();
  let state: Invoice[] = invoices.map((i) => ({ ...i }));
  for (let offset = 0; offset < days; offset += 1) {
    const today = start + offset;
    const decisions = decideAll(state, today);
    const sentToday = new Map<string, LastReminder["stage"]>();
    for (const d of decisions) {
      if (d.rule === "stage" && d.stage !== null) {
        pushDay(sent, d.id, today);
        sentToday.set(d.id, d.stage);
      }
    }
    state = state.map((inv) => {
      const stage = sentToday.get(inv.id);
      return stage === undefined
        ? inv
        : { ...inv, last_reminder: { stage, date: formatDay(today) } };
    });
  }
  return totalsFrom(invoices, sent);
}

function runNaive(invoices: readonly Invoice[], start: Day, days: number): SimulationTotals {
  const sent = new Map<string, Day[]>();
  for (let offset = 0; offset < days; offset += 1) {
    const today = start + offset;
    if (isWeekend(today)) continue;
    for (const inv of invoices) {
      const remaining = inv.amount_cents - inv.paid_cents;
      if (remaining > 0 && today > parseDay(inv.due)) pushDay(sent, inv.id, today);
    }
  }
  return totalsFrom(invoices, sent);
}

/** Replays `days` calendar days from `start` under my rules and under "email every overdue invoice every weekday". */
export function compareStrategies(
  invoices: readonly Invoice[],
  start: Day,
  days: number,
): Comparison {
  return {
    days,
    rules: runRules(invoices, start, days),
    naive: runNaive(invoices, start, days),
  };
}
