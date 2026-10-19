import { describe, expect, test } from "bun:test";
import { formatDay, parseDay } from "../src/domain/dates";
import { decideInvoice } from "../src/domain/decide";
import type { Action, Invoice, LastReminder } from "../src/domain/invoice";

const WED = "2026-10-14";
const base: Invoice = {
  id: "x",
  client: "C",
  amount_cents: 100000,
  due: WED,
  paid_cents: 0,
  last_reminder: null,
  hold: false,
};

function run(overrides: Partial<Invoice>, today: string = WED) {
  return decideInvoice({ ...base, ...overrides }, parseDay(today));
}
function dueOffset(daysOverdue: number): string {
  return formatDay(parseDay(WED) - daysOverdue);
}

describe("rule 4 bands", () => {
  const table: Array<[number, Action]> = [
    [-4, "none"],
    [-3, "heads_up"],
    [-1, "heads_up"],
    [0, "none"],
    [1, "friendly"],
    [6, "friendly"],
    [7, "firm"],
    [20, "firm"],
    [21, "final"],
    [44, "final"],
    [45, "escalate"],
    [200, "escalate"],
  ];
  for (const [days, action] of table) {
    test(`${days} days overdue -> ${action}`, () => {
      const d = run({ due: dueOffset(days) });
      expect(d.action).toBe(action);
      expect(d.rule).toBe(action === "none" ? 4 : "stage");
    });
  }
});

describe("rule 1 paid", () => {
  test("exactly 1% remaining is none", () => {
    expect(run({ due: dueOffset(10), paid_cents: 99000 })).toMatchObject({
      action: "none",
      rule: 1,
    });
  });
  test("just over 1% remaining proceeds", () => {
    expect(run({ due: dueOffset(10), paid_cents: 98999 })).toMatchObject({ action: "firm" });
  });
  test("overpaid and zero amount are none", () => {
    expect(run({ paid_cents: 150000 }).rule).toBe(1);
    expect(run({ amount_cents: 0 }).rule).toBe(1);
  });
  test("beats hold", () => {
    expect(run({ paid_cents: 100000, hold: true }).rule).toBe(1);
  });
});

describe("rules 2 and 3", () => {
  test("hold decides before weekend", () => {
    expect(run({ hold: true }, "2026-10-17")).toMatchObject({ action: "hold", rule: 2 });
  });
  test("weekend suppresses before band", () => {
    expect(run({ due: "2026-10-01" }, "2026-10-17")).toMatchObject({ action: "none", rule: 3 });
    expect(run({ due: "2026-10-01" }, "2026-10-18")).toMatchObject({ action: "none", rule: 3 });
  });
});

describe("rules 5 to 7", () => {
  const prior = (stage: LastReminder["stage"], date: string): LastReminder => ({ stage, date });
  test("heads_up only with no prior reminder", () => {
    const due = dueOffset(-2);
    expect(run({ due }).action).toBe("heads_up");
    expect(run({ due, last_reminder: prior("heads_up", "2020-01-01") })).toMatchObject({
      action: "none",
      rule: 5,
    });
    expect(run({ due, last_reminder: prior("friendly", "2020-01-01") })).toMatchObject({
      action: "none",
      rule: 5,
    });
  });
  test("never goes back a stage, even inside 7 days", () => {
    expect(run({ due: dueOffset(10), last_reminder: prior("final", "2026-10-13") })).toMatchObject({
      action: "none",
      rule: 6,
    });
  });
  test("same stage repeats only after 7 days", () => {
    const due = dueOffset(10);
    expect(run({ due, last_reminder: prior("firm", "2026-10-08") })).toMatchObject({
      action: "none",
      rule: 7,
    });
    expect(run({ due, last_reminder: prior("firm", "2026-10-07") })).toMatchObject({
      action: "firm",
      rule: "stage",
    });
    expect(run({ due, last_reminder: prior("firm", "2026-10-06") })).toMatchObject({
      action: "firm",
    });
  });
  test("a future reminder date suppresses a same-stage repeat", () => {
    expect(run({ due: dueOffset(10), last_reminder: prior("firm", "2026-10-20") }).rule).toBe(7);
  });
  test("a higher stage always sends", () => {
    expect(run({ due: dueOffset(10), last_reminder: prior("friendly", "2026-10-13") }).action).toBe(
      "firm",
    );
  });
});

describe("invariants", () => {
  test("rule is 'stage' iff action is a stage", () => {
    const stages = new Set(["heads_up", "friendly", "firm", "final", "escalate"]);
    for (let d = -10; d <= 60; d += 1) {
      for (const hold of [false, true]) {
        for (const today of ["2026-10-14", "2026-10-17"]) {
          const dec = run({ due: dueOffset(d), hold }, today);
          expect(dec.rule === "stage").toBe(stages.has(dec.action));
        }
      }
    }
  });
});
