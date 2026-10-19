import { parseDay, tryParseDay } from "./dates";
import { decideAll } from "./decide";
import { type Case, InvoiceSchema } from "./invoice";

export interface EvalResult {
  readonly cases: number;
  readonly decisions: number;
  readonly accuracy: number;
  readonly score: number;
}

export function evaluateCases(cases: readonly Case[]): EvalResult {
  let decisions = 0;
  let scored = 0;
  let correct = 0;
  for (const c of cases) {
    const made = decideAll(c.invoices, parseDay(c.today));
    decisions += made.length;
    const byId = new Map(made.map((d) => [d.id, d.action]));
    for (const [id, expected] of Object.entries(c.expected)) {
      scored += 1;
      if (byId.get(id) === expected) correct += 1;
    }
  }
  const accuracy = scored === 0 ? 0 : correct / scored;
  return { cases: cases.length, decisions, accuracy, score: accuracy * 100 };
}

export interface RawCase {
  readonly today: unknown;
  readonly invoices: unknown;
  readonly expected: unknown;
}

/**
 * Scores cases without trusting their shape: a case with a bad date, or an invoice that fails validation,
 * counts its expected ids as wrong instead of aborting the whole run.
 */
export function evaluateRawCases(cases: readonly RawCase[]): EvalResult {
  let decisions = 0;
  let scored = 0;
  let correct = 0;
  for (const c of cases) {
    const day = typeof c.today === "string" ? tryParseDay(c.today) : null;
    const rawInvoices = Array.isArray(c.invoices) ? (c.invoices as unknown[]) : [];
    const valid = rawInvoices.flatMap((raw) => {
      const parsed = InvoiceSchema.safeParse(raw);
      return parsed.success ? [parsed.data] : [];
    });
    const byId = new Map<string, string>();
    if (day !== null) {
      for (const d of decideAll(valid, day)) byId.set(d.id, d.action);
      decisions += valid.length;
    }
    const expected = c.expected && typeof c.expected === "object" ? Object.entries(c.expected) : [];
    for (const [id, action] of expected) {
      scored += 1;
      if (byId.get(id) === action) correct += 1;
    }
  }
  const accuracy = scored === 0 ? 0 : correct / scored;
  return { cases: cases.length, decisions, accuracy, score: accuracy * 100 };
}
