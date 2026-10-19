import type { Decision } from "../domain/decide";
import type { Action, Invoice, RuleId } from "../domain/invoice";
import { formatCents } from "../domain/money";
import { type Dictionary, dict } from "../i18n/dictionary";
import { fill, type Locale } from "../i18n/locales";

interface InvoiceTableProps {
  readonly lang: Locale;
  readonly invoices: readonly Invoice[];
  readonly decisions: readonly Decision[];
  readonly onDraft: (invoice: Invoice, decision: Decision) => void;
  readonly onLink: (invoice: Invoice) => void;
}

export function reasonText(d: Dictionary, rule: RuleId, stage: Decision["stage"]): string {
  if (rule === "stage") return fill(d.reasons.stage, { stage: stage ? d.stages[stage] : "" });
  return d.reasons[`r${rule}` as const];
}

function overdueText(d: Dictionary, days: number): string {
  if (days > 0) return fill(d.tryIt.daysOverdueValue, { days });
  if (days === 0) return d.tryIt.dueToday;
  return fill(d.tryIt.notYetDue, { days: -days });
}

function ActionBadge({ action, label }: { readonly action: Action; readonly label: string }) {
  return <span className={`badge badge-${action}`}>{label}</span>;
}

export function InvoiceTable({ lang, invoices, decisions, onDraft, onLink }: InvoiceTableProps) {
  const d = dict[lang];
  const t = d.tryIt;
  const byId = new Map(decisions.map((x) => [x.id, x]));
  return (
    <table className="invoice-table">
      <caption>{t.tableCaption}</caption>
      <thead>
        <tr>
          <th scope="col">{t.columns.client}</th>
          <th scope="col">{t.columns.amount}</th>
          <th scope="col">{t.columns.remaining}</th>
          <th scope="col">{t.columns.due}</th>
          <th scope="col">{t.columns.overdue}</th>
          <th scope="col">{t.columns.action}</th>
          <th scope="col">{t.columns.why}</th>
          <th scope="col">{t.columns.tools}</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice) => {
          const decision = byId.get(invoice.id);
          if (!decision) return null;
          const canDraft = decision.rule === "stage";
          const canPay = decision.remainingCents > 0 && decision.rule !== 1;
          return (
            <tr key={invoice.id} className={`row-${decision.action}`}>
              <th scope="row" data-label={t.columns.client}>
                {invoice.client}
                <span className="invoice-id">{invoice.id}</span>
              </th>
              <td data-label={t.columns.amount}>{formatCents(invoice.amount_cents, lang)}</td>
              <td data-label={t.columns.remaining}>{formatCents(decision.remainingCents, lang)}</td>
              <td data-label={t.columns.due}>{invoice.due}</td>
              <td data-label={t.columns.overdue}>{overdueText(d, decision.daysOverdue)}</td>
              <td data-label={t.columns.action}>
                <ActionBadge action={decision.action} label={d.actions[decision.action]} />
              </td>
              <td data-label={t.columns.why} className="reason">
                {reasonText(d, decision.rule, decision.stage)}
              </td>
              <td data-label={t.columns.tools} className="tools">
                {canDraft ? (
                  <button
                    type="button"
                    className="btn"
                    aria-label={fill(t.draftButtonFor, { client: invoice.client })}
                    onClick={() => onDraft(invoice, decision)}
                  >
                    {t.draftButton}
                  </button>
                ) : null}
                {canPay ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    aria-label={fill(t.payLinkButtonFor, { client: invoice.client })}
                    onClick={() => onLink(invoice)}
                  >
                    {t.payLinkButton}
                  </button>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
