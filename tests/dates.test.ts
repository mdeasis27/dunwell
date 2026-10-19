import { describe, expect, test } from "bun:test";
import { formatDay, isWeekend, parseDay, tryParseDay, weekday } from "../src/domain/dates";

describe("dates", () => {
  test("round-trips through formatDay", () => {
    for (const s of ["1970-01-01", "2024-02-29", "2026-10-16", "2100-12-31", "1999-03-01"]) {
      expect(formatDay(parseDay(s))).toBe(s);
    }
  });
  test("epoch is day 0 and a Thursday", () => {
    expect(parseDay("1970-01-01")).toBe(0);
    expect(weekday(0)).toBe(4);
  });
  test("rejects impossible dates", () => {
    for (const s of [
      "2026-02-29",
      "2026-13-01",
      "2026-00-10",
      "2026-04-31",
      "26-01-01",
      "2026-1-1",
      "",
    ]) {
      expect(tryParseDay(s)).toBeNull();
    }
    expect(tryParseDay("2024-02-29")).not.toBeNull();
  });
  test("parseDay throws on invalid input", () => {
    expect(() => parseDay("nope")).toThrow();
  });
  test("known weekdays", () => {
    expect(weekday(parseDay("2026-10-16"))).toBe(5);
    expect(isWeekend(parseDay("2026-10-17"))).toBe(true);
    expect(isWeekend(parseDay("2026-10-18"))).toBe(true);
    expect(isWeekend(parseDay("2026-10-19"))).toBe(false);
  });
  test("consecutive days differ by one across month ends", () => {
    expect(parseDay("2026-03-01") - parseDay("2026-02-28")).toBe(1);
    expect(parseDay("2024-03-01") - parseDay("2024-02-28")).toBe(2);
  });
});
