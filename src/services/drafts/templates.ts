import type { Stage } from "../../domain/invoice";
import { formatCents } from "../../domain/money";
import { dict } from "../../i18n/dictionary";
import { fill, type Locale } from "../../i18n/locales";

export interface DraftFacts {
  readonly invoiceId: string;
  readonly client: string;
  readonly remainingCents: number;
  readonly due: string;
  readonly daysOverdue: number;
  readonly stage: Stage;
  readonly lang: Locale;
  readonly link: string;
}

export interface Draft {
  readonly subject: string;
  readonly body: string;
  readonly source: "model" | "template";
}

export function templateDraft(facts: DraftFacts): Draft {
  const template = dict[facts.lang].drafts.templates[facts.stage];
  const values = {
    invoice: facts.invoiceId,
    client: facts.client,
    amount: formatCents(facts.remainingCents, facts.lang),
    due: facts.due,
    days: Math.max(facts.daysOverdue, 0),
    link: facts.link,
  };
  return {
    subject: fill(template.subject, values),
    body: fill(template.body, values),
    source: "template",
  };
}
