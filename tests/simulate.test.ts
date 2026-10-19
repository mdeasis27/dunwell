import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parseDay } from "../src/domain/dates";
import { type Invoice, InvoiceListSchema } from "../src/domain/invoice";
import { formatCents } from "../src/domain/money";
import { compareStrategies } from "../src/domain/simulate";

const base: Invoice = {
  id: "a",
  client: "C",
  amount_cents: 100000,
  due: "2026-10-01",
  paid_cents: 0,
  last_reminder: null,
  hold: false,
};

describe("compareStrategies", () => {
  test("rules never send more than once per 7 days per invoice at the same stage", () => {
    const result = compareStrategies([base], parseDay("2026-10-16"), 30);
    expect(result.rules.perInvoiceWeek).toBeLessThanOrEqual(2);
    expect(result.naive.total).toBeGreaterThan(result.rules.total);
  });

  test("a held invoice gets nothing from the rules but daily mail from the naive habit", () => {
    const result = compareStrategies([{ ...base, hold: true }], parseDay("2026-10-16"), 14);
    expect(result.rules.total).toBe(0);
    expect(result.naive.held).toBe(result.naive.total);
    expect(result.naive.total).toBeGreaterThan(0);
  });

  test("nothing is sent on weekends", () => {
    // 2026-10-17 and 2026-10-18 are Saturday and Sunday.
    const result = compareStrategies([base], parseDay("2026-10-17"), 2);
    expect(result.rules.total).toBe(0);
    expect(result.naive.total).toBe(0);
  });

  test("fixture comparison is deterministic and favors the rules", () => {
    const invoices = InvoiceListSchema.parse(
      JSON.parse(readFileSync("fixtures/invoices.json", "utf8")),
    );
    const a = compareStrategies(invoices, parseDay("2026-10-16"), 30);
    const b = compareStrategies(invoices, parseDay("2026-10-16"), 30);
    expect(a).toEqual(b);
    expect(a.rules.held).toBe(0);
    expect(a.rules.paidUp).toBe(0);
    expect(a.rules.total).toBeLessThan(a.naive.total);
  });
});

describe("formatCents", () => {
  test("formats whole cents without floats", () => {
    expect(formatCents(180000, "en")).toBe("$1,800.00");
    expect(formatCents(5, "en")).toBe("$0.05");
    expect(formatCents(129900, "es")).toMatch(/^\$1.299,00$/);
  });
});
