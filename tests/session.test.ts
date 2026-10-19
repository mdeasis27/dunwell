import { describe, expect, test } from "bun:test";
import {
  applyOverrides,
  DEFAULT_DAY,
  initialState,
  type OutboxItem,
  parseStored,
  serialize,
  sessionReducer,
} from "../src/components/session";
import { parseDay } from "../src/domain/dates";
import { decideInvoice } from "../src/domain/decide";
import type { Invoice } from "../src/domain/invoice";

const invoice: Invoice = {
  id: "a",
  client: "Client",
  amount_cents: 100000,
  due: "2026-10-05",
  paid_cents: 0,
  last_reminder: null,
  hold: false,
};

const item: OutboxItem = {
  invoiceId: "a",
  client: "Client",
  day: "2026-10-16",
  stage: "firm",
  subject: "s",
  body: "b",
  delivered: false,
};

describe("session reducer", () => {
  test("setDay returns a new state and leaves the old one alone", () => {
    const before = initialState();
    const after = sessionReducer(before, { type: "setDay", day: "2026-10-19" });
    expect(after.today).toBe("2026-10-19");
    expect(before.today).toBe(DEFAULT_DAY);
  });

  test("paying marks the invoice settled (rule 1)", () => {
    const state = sessionReducer(initialState(), {
      type: "paid",
      invoiceId: "a",
      amountCents: 100000,
    });
    const [paid] = applyOverrides([invoice], state.overrides);
    expect(paid).toBeDefined();
    if (!paid) return;
    expect(decideInvoice(paid, parseDay("2026-10-16"))).toMatchObject({ action: "none", rule: 1 });
  });

  test("sending records last_reminder so the next day honors rule 7", () => {
    const state = sessionReducer(initialState(), { type: "sent", item });
    expect(state.outbox).toHaveLength(1);
    const [sent] = applyOverrides([invoice], state.overrides);
    if (!sent) throw new Error("missing invoice");
    expect(sent.last_reminder).toEqual({ stage: "firm", date: "2026-10-16" });
    expect(decideInvoice(sent, parseDay("2026-10-19"))).toMatchObject({ action: "none", rule: 7 });
    expect(decideInvoice(sent, parseDay("2026-10-23"))).toMatchObject({ action: "firm" });
  });

  test("reset and load", () => {
    const dirty = sessionReducer(initialState(), { type: "sent", item });
    expect(sessionReducer(dirty, { type: "reset", day: "2026-10-20" })).toEqual(
      initialState("2026-10-20"),
    );
    expect(sessionReducer(initialState(), { type: "load", state: dirty })).toBe(dirty);
  });
});

describe("stored state", () => {
  test("round trips", () => {
    const state = sessionReducer(initialState(), { type: "sent", item });
    expect(parseStored(serialize(state), DEFAULT_DAY)).toEqual(state);
  });
  test("invalid or missing storage falls back to a fresh state", () => {
    expect(parseStored(null, "2026-10-20")).toEqual(initialState("2026-10-20"));
    expect(parseStored("not json", "2026-10-20")).toEqual(initialState("2026-10-20"));
    expect(parseStored('{"today":"nope"}', "2026-10-20")).toEqual(initialState("2026-10-20"));
  });
});
