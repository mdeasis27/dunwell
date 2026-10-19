import { dict } from "../i18n/dictionary";
import { fill, type Locale } from "../i18n/locales";
import type { OutboxItem } from "./session";

interface OutboxProps {
  readonly lang: Locale;
  readonly items: readonly OutboxItem[];
}

export function Outbox({ lang, items }: OutboxProps) {
  const d = dict[lang];
  const t = d.tryIt;
  return (
    <section className="outbox" aria-labelledby="outbox-title">
      <h3 id="outbox-title">{t.outboxTitle}</h3>
      {items.length === 0 ? (
        <p className="muted">{t.outboxEmpty}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={`${item.invoiceId}-${item.day}-${item.stage}-${item.subject}`}>
              <p>
                <strong>
                  {fill(t.outboxItem, {
                    client: item.client,
                    day: item.day,
                    stage: d.stages[item.stage],
                  })}
                </strong>{" "}
                <span className={item.delivered ? "tag tag-live" : "tag"}>
                  {item.delivered ? t.outboxSent : t.outboxBadge}
                </span>
              </p>
              <p className="outbox-subject">{item.subject}</p>
              <p className="draft-body">{item.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
