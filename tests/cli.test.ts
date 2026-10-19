import { describe, expect, test } from "bun:test";

function run(args: string[]) {
  const p = Bun.spawnSync(["bun", ...args], { cwd: process.cwd() });
  return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString() };
}

describe("decide cli", () => {
  test("prints only JSON in input order", () => {
    const r = run(["src/cli/decide.ts", "fixtures/invoices.json", "--today", "2026-10-16"]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out);
    expect(j.today).toBe("2026-10-16");
    expect(j.decisions[0]).toEqual({ id: "INV-1001", action: "friendly", rule: "stage" });
    expect(Object.keys(j.decisions[0])).toEqual(["id", "action", "rule"]);
  });
  test("works through bun run with --today=", () => {
    const r = run(["run", "decide", "fixtures/invoices.json", "--today=2026-10-17"]);
    expect(r.code).toBe(0);
    const rules = JSON.parse(r.out).decisions.map((d: { rule: unknown }) => d.rule);
    expect(rules.every((x: unknown) => x === 1 || x === 2 || x === 3)).toBe(true);
  });
  test("missing --today fails with empty stdout", () => {
    const r = run(["src/cli/decide.ts", "fixtures/invoices.json"]);
    expect(r.code).toBe(1);
    expect(r.out).toBe("");
    expect(JSON.parse(r.err).error).toContain("today");
  });
  test("bad date, missing file and wrong shape fail", () => {
    expect(run(["src/cli/decide.ts", "fixtures/invoices.json", "--today", "2026-02-30"]).code).toBe(
      1,
    );
    expect(run(["src/cli/decide.ts", "nope.json", "--today", "2026-10-16"]).out).toBe("");
    expect(run(["src/cli/decide.ts", "fixtures/cases.json", "--today", "2026-10-16"]).code).toBe(1);
  });
});

describe("eval cli", () => {
  test("prints score JSON", () => {
    const r = run(["run", "eval"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual({ cases: 8, decisions: 49, accuracy: 1, score: 100 });
  });
  test("bad file fails", () => {
    const r = run(["src/cli/eval.ts", "fixtures/invoices.json"]);
    expect(r.code).toBe(1);
    expect(r.out).toBe("");
  });
});
