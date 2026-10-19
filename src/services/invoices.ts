import "server-only";
import fixtureData from "../../fixtures/invoices.json";
import { type Invoice, InvoiceListSchema } from "../domain/invoice";
import type { Overrides } from "../domain/overrides";

const FIXTURE_INVOICES: readonly Invoice[] = InvoiceListSchema.parse(fixtureData);

export function loadFixtureInvoices(): readonly Invoice[] {
  return FIXTURE_INVOICES;
}

export function applyOverrides(invoices: readonly Invoice[], overrides: Overrides): Invoice[] {
  return invoices.map((invoice) => {
    const o = overrides[invoice.id];
    if (!o) return invoice;
    return {
      ...invoice,
      paid_cents: o.paid_cents ?? invoice.paid_cents,
      last_reminder: o.last_reminder === undefined ? invoice.last_reminder : o.last_reminder,
    };
  });
}

export function findInvoice(id: string, overrides: Overrides): Invoice | null {
  return applyOverrides(FIXTURE_INVOICES, overrides).find((i) => i.id === id) ?? null;
}
