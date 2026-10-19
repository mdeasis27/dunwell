import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { evaluateCases, evaluateRawCases } from "../src/domain/evaluate";
import { CaseListSchema, type Invoice } from "../src/domain/invoice";

const inv: Invoice = {
  id: "a",
  client: "c",
  amount_cents: 1000,
  due: "2026-10-13",
  paid_cents: 0,
  last_reminder: null,
  hold: false,
};

describe("evaluateCases", () => {
  test("visible fixtures score 100", () => {
    const cases = CaseListSchema.parse(JSON.parse(readFileSync("fixtures/cases.json", "utf8")));
    expect(evaluateCases(cases)).toEqual({ cases: 8, decisions: 49, accuracy: 1, score: 100 });
  });
  test("wrong and missing ids count against accuracy", () => {
    const r = evaluateCases([
      { today: "2026-10-14", invoices: [inv], expected: { a: "firm", ghost: "none" } },
    ]);
    expect(r.accuracy).toBe(0);
    const ok = evaluateCases([
      { today: "2026-10-14", invoices: [inv], expected: { a: "friendly" } },
    ]);
    expect(ok.score).toBe(100);
  });
  test("no cases gives zero", () => {
    expect(evaluateCases([])).toEqual({ cases: 0, decisions: 0, accuracy: 0, score: 0 });
  });
});

describe("evaluateRawCases", () => {
  test("matches evaluateCases on the visible fixtures", () => {
    const raw = JSON.parse(readFileSync("fixtures/cases.json", "utf8"));
    expect(evaluateRawCases(raw)).toEqual({ cases: 8, decisions: 49, accuracy: 1, score: 100 });
  });
  test("a malformed invoice or date costs only its own ids", () => {
    const good = { ...inv, id: "good" };
    const refund = { ...inv, id: "refund", paid_cents: -500 };
    const raw = [
      {
        today: "2026-10-14",
        invoices: [good, { id: "broken" }, refund],
        expected: { good: "friendly", broken: "none", refund: "friendly" },
      },
      { today: "not a date", invoices: [good], expected: { good: "friendly" } },
    ];
    const result = evaluateRawCases(raw);
    expect(result.accuracy).toBe(2 / 4);
    expect(result.decisions).toBe(2);
  });
  test("garbage case fields do not throw", () => {
    expect(evaluateRawCases([{ today: 5, invoices: "x", expected: null }]).score).toBe(0);
  });
});
