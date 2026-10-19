"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { formatDay, parseDay, tryParseDay, weekday } from "../domain/dates";
import { type Decision, decideAll } from "../domain/decide";
import type { Invoice } from "../domain/invoice";
import { dict } from "../i18n/dictionary";
import { fill, type Locale } from "../i18n/locales";
import {
  type BaseRequest,
  type DraftResponse,
  type LinkInfo,
  type LinkResponse,
  postJson,
  type SendResponse,
} from "./api-client";
import { DraftPanel, type PanelState } from "./DraftPanel";
import { InvoiceTable } from "./InvoiceTable";
import { Outbox } from "./Outbox";
import {
  applyOverrides,
  DEFAULT_DAY,
  initialState,
  parseStored,
  STORAGE_KEY,
  serialize,
  sessionReducer,
} from "./session";

export interface ServiceFlags {
  readonly llm: boolean;
  readonly mail: boolean;
  readonly payments: boolean;
}

interface TryItProps {
  readonly lang: Locale;
  readonly invoices: readonly Invoice[];
  readonly requestedDay: string | undefined;
  readonly services: ServiceFlags;
}

const SERVICE_KEYS = ["llm", "mail", "payments"] as const;

function errorMessage(lang: Locale, status: number): string {
  const t = dict[lang].tryIt;
  if (status === 429) return t.errorRate;
  if (status === 409) return t.errorNoAction;
  return t.errorGeneric;
}

export function TryIt({ lang, invoices, requestedDay, services }: TryItProps) {
  const t = dict[lang].tryIt;
  const [state, dispatch] = useReducer(sessionReducer, initialState(requestedDay ?? DEFAULT_DAY));
  const [loaded, setLoaded] = useState(false);
  const [panel, setPanel] = useState<PanelState>({ kind: "none" });
  const [status, setStatus] = useState("");
  const [recipient, setRecipient] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = parseStored(window.sessionStorage.getItem(STORAGE_KEY), DEFAULT_DAY);
    const day = requestedDay && tryParseDay(requestedDay) !== null ? requestedDay : stored.today;
    dispatch({ type: "load", state: { ...stored, today: day } });
    setLoaded(true);
  }, [requestedDay]);

  useEffect(() => {
    if (!loaded) return;
    window.sessionStorage.setItem(STORAGE_KEY, serialize(state));
    const url = new URL(window.location.href);
    url.searchParams.set("today", state.today);
    window.history.replaceState(null, "", url);
  }, [state, loaded]);

  const todayDay = tryParseDay(state.today) ?? parseDay(DEFAULT_DAY);
  const current = useMemo(
    () => applyOverrides(invoices, state.overrides),
    [invoices, state.overrides],
  );
  const decisions = useMemo(() => decideAll(current, todayDay), [current, todayDay]);
  const sendCount = decisions.filter((d) => d.rule === "stage").length;

  const baseRequest = (id: string): BaseRequest => ({
    id,
    today: state.today,
    lang,
    overrides: state.overrides,
  });

  function moveDay(delta: number): void {
    dispatch({ type: "setDay", day: formatDay(todayDay + delta) });
    setPanel({ kind: "none" });
  }

  async function handleDraft(invoice: Invoice, decision: Decision): Promise<void> {
    setStatus("");
    setPanel({ kind: "loading", client: invoice.client });
    const result = await postJson<DraftResponse>("/api/draft", baseRequest(invoice.id));
    if (!result.ok) {
      setPanel({ kind: "none" });
      setStatus(errorMessage(lang, result.status));
      return;
    }
    setPanel({
      kind: "draft",
      invoiceId: invoice.id,
      client: invoice.client,
      stage: decision.stage ?? result.data.stage,
      draft: result.data.draft,
      fellBack: result.data.fellBack,
      link: result.data.link,
      signature: result.data.signature,
      sending: false,
    });
    panelRef.current?.focus();
  }

  async function handleLink(invoice: Invoice): Promise<void> {
    setStatus("");
    const result = await postJson<LinkResponse>("/api/pay-link", baseRequest(invoice.id));
    if (!result.ok) {
      setStatus(errorMessage(lang, result.status));
      return;
    }
    const link: LinkInfo = result.data.link;
    setPanel({ kind: "link", client: invoice.client, link });
    panelRef.current?.focus();
  }

  async function handleSend(): Promise<void> {
    if (panel.kind !== "draft") return;
    const sending = panel;
    setPanel({ ...sending, sending: true });
    const body = {
      ...baseRequest(sending.invoiceId),
      to: recipient.trim() === "" ? undefined : recipient.trim(),
      subject: sending.draft.subject,
      message: sending.draft.body,
      signature: sending.signature,
    };
    const result = await postJson<SendResponse>("/api/send", body);
    if (!result.ok) {
      setPanel({ ...sending, sending: false });
      setStatus(errorMessage(lang, result.status));
      return;
    }
    dispatch({
      type: "sent",
      item: {
        invoiceId: sending.invoiceId,
        client: sending.client,
        day: state.today,
        stage: sending.stage,
        subject: sending.draft.subject,
        body: sending.draft.body,
        delivered: result.data.delivered,
      },
    });
    setStatus(result.data.delivered ? fill(t.sentLive, { to: recipient.trim() }) : t.sentDemo);
    setPanel({ kind: "none" });
  }

  function handleReset(): void {
    dispatch({ type: "reset", day: DEFAULT_DAY });
    setPanel({ kind: "none" });
    setStatus(t.resetDone);
  }

  const weekdayName = t.weekdayNames[weekday(todayDay)] ?? "";

  return (
    <div className="try">
      <p>{t.intro}</p>

      <div className="day-row">
        <button type="button" className="btn btn-secondary" onClick={() => moveDay(-1)}>
          ← {t.previousDay}
        </button>
        <label className="day-field">
          <span>{t.dayLabel}</span>
          <input
            type="date"
            name="today"
            value={state.today}
            onChange={(event) => {
              if (tryParseDay(event.target.value) !== null) {
                dispatch({ type: "setDay", day: event.target.value });
                setPanel({ kind: "none" });
              }
            }}
          />
        </label>
        <button type="button" className="btn btn-secondary" onClick={() => moveDay(1)}>
          {t.nextDay} →
        </button>
        <span className="weekday" aria-hidden="true">
          {weekdayName}
        </span>
      </div>

      <p role="status" className="summary">
        <strong>{weekdayName}.</strong>{" "}
        {fill(t.summary, { count: sendCount, total: decisions.length })}
      </p>

      <InvoiceTable
        lang={lang}
        invoices={current}
        decisions={decisions}
        onDraft={(invoice, decision) => void handleDraft(invoice, decision)}
        onLink={(invoice) => void handleLink(invoice)}
      />

      <div ref={panelRef} tabIndex={-1} className="panel-anchor">
        <DraftPanel
          lang={lang}
          panel={panel}
          mailLive={services.mail}
          recipient={recipient}
          onRecipient={setRecipient}
          onSend={() => void handleSend()}
          onClose={() => setPanel({ kind: "none" })}
        />
      </div>

      <p role="status" className="notice" hidden={status === ""}>
        {status}
      </p>

      <Outbox lang={lang} items={state.outbox} />

      <div className="try-footer">
        <section aria-labelledby="services-title" className="services">
          <h3 id="services-title">{t.servicesTitle}</h3>
          <ul>
            {SERVICE_KEYS.map((key) => (
              <li key={key}>
                {t.serviceNames[key]}:{" "}
                <strong>{services[key] ? t.serviceLive : t.serviceDemo}</strong>
              </li>
            ))}
          </ul>
        </section>
        <button type="button" className="btn btn-secondary" onClick={handleReset}>
          {t.reset}
        </button>
      </div>
    </div>
  );
}
