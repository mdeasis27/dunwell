import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutClient } from "@/components/CheckoutClient";
import { Wordmark } from "@/components/Wordmark";
import { dict } from "@/i18n/dictionary";
import { isLocale } from "@/i18n/locales";
import { loadFixtureInvoices } from "@/services/invoices";

export const metadata: Metadata = { robots: { index: false } };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; id: string }>;
  searchParams: Promise<{ today?: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const { today } = await searchParams;
  const invoice = loadFixtureInvoices().find((i) => i.id === id);
  const t = dict[lang].checkout;
  return (
    <div className="page">
      <header className="topbar">
        <Wordmark lang={lang} />
      </header>
      <main className="mock-checkout">
        <h1>{t.title}</h1>
        {invoice ? (
          <CheckoutClient
            lang={lang}
            today={today}
            invoice={{
              id: invoice.id,
              client: invoice.client,
              amount_cents: invoice.amount_cents,
              paid_cents: invoice.paid_cents,
            }}
          />
        ) : (
          <p>{t.notFound}</p>
        )}
      </main>
    </div>
  );
}
