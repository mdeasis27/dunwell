"use client";

import { useEffect, useReducer, useState } from "react";
import { tryParseDay } from "../domain/dates";
import { formatCents } from "../domain/money";
import { dict } from "../i18n/dictionary";
import type { Locale } from "../i18n/locales";
import {
  DEFAULT_DAY,
  initialState,
  parseStored,
  STORAGE_KEY,
  serialize,
  sessionReducer,
} from "./session";

interface CheckoutClientProps {
  readonly lang: Locale;
  readonly today: string | undefined;
  readonly invoice: {
    readonly id: string;
    readonly client: string;
    readonly amount_cents: number;
    readonly paid_cents: number;
  };
}

export function CheckoutClient({ lang, today, invoice }: CheckoutClientProps) {
  const t = dict[lang].checkout;
  const [state, dispatch] = useReducer(sessionReducer, initialState());
  const [loaded, setLoaded] = useState(false);
  const [justPaid, setJustPaid] = useState(false);

  useEffect(() => {
    dispatch({
      type: "load",
      state: parseStored(window.sessionStorage.getItem(STORAGE_KEY), DEFAULT_DAY),
    });
    setLoaded(true);
  }, []);

  const paid = state.overrides[invoice.id]?.paid_cents ?? invoice.paid_cents;
  const due = Math.max(invoice.amount_cents - paid, 0);
  const backDay = today && tryParseDay(today) !== null ? today : state.today;

  function handlePay(): void {
    const next = sessionReducer(state, {
      type: "paid",
      invoiceId: invoice.id,
      amountCents: invoice.amount_cents,
    });
    window.sessionStorage.setItem(STORAGE_KEY, serialize(next));
    dispatch({ type: "paid", invoiceId: invoice.id, amountCents: invoice.amount_cents });
    setJustPaid(true);
  }

  return (
    <>
      <p>{t.intro}</p>
      <dl>
        <dt>{t.invoice}</dt>
        <dd>{invoice.id}</dd>
        <dt>{t.client}</dt>
        <dd>{invoice.client}</dd>
        <dt>{t.amountDue}</dt>
        <dd className="amount">{formatCents(due, lang)}</dd>
      </dl>
      <div role="status">
        {justPaid ? <p>{t.paid}</p> : null}
        {loaded && due === 0 && !justPaid ? <p>{t.alreadyPaid}</p> : null}
      </div>
      {due > 0 ? (
        <button type="button" className="btn" disabled={!loaded} onClick={handlePay}>
          {t.payButton}
        </button>
      ) : null}
      <p>
        <a href={`/${lang}/app?today=${backDay}`}>{t.backToApp}</a>
      </p>
    </>
  );
}
