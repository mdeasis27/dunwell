import type { Stage } from "../domain/invoice";
import { dict } from "../i18n/dictionary";
import { fill, type Locale } from "../i18n/locales";
import { type DraftInfo, type LinkInfo, safeHttpUrl } from "./api-client";

export type PanelState =
  | { readonly kind: "none" }
  | { readonly kind: "loading"; readonly client: string }
  | {
      readonly kind: "draft";
      readonly invoiceId: string;
      readonly client: string;
      readonly stage: Stage;
      readonly draft: DraftInfo;
      readonly fellBack: boolean;
      readonly link: LinkInfo;
      readonly signature: string;
      readonly sending: boolean;
    }
  | { readonly kind: "link"; readonly client: string; readonly link: LinkInfo };

interface DraftPanelProps {
  readonly lang: Locale;
  readonly panel: PanelState;
  readonly mailLive: boolean;
  readonly recipient: string;
  readonly onRecipient: (value: string) => void;
  readonly onSend: () => void;
  readonly onClose: () => void;
}

function PaymentLink({ lang, link }: { readonly lang: Locale; readonly link: LinkInfo }) {
  const t = dict[lang].tryIt;
  const href = safeHttpUrl(link.url);
  const isLive = link.mode === "live";
  return (
    <p className="pay-link">
      <strong>{t.paymentLink}:</strong>{" "}
      {href ? (
        <a href={href} {...(isLive ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {link.url}
        </a>
      ) : null}
      <span className="muted"> ({isLive ? t.paymentModeLive : t.paymentModeDemo})</span>
    </p>
  );
}

export function DraftPanel({
  lang,
  panel,
  mailLive,
  recipient,
  onRecipient,
  onSend,
  onClose,
}: DraftPanelProps) {
  const t = dict[lang].tryIt;
  if (panel.kind === "none") return null;

  if (panel.kind === "loading") {
    return (
      <section className="panel" aria-live="polite" aria-busy="true">
        <p>{t.draftLoading}</p>
      </section>
    );
  }

  if (panel.kind === "link") {
    return (
      <section className="panel" aria-labelledby="panel-title">
        <h3 id="panel-title">{fill(t.draftTitle, { client: panel.client })}</h3>
        <PaymentLink lang={lang} link={panel.link} />
        <p className="muted">{t.mockCheckoutNote}</p>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t.closeDraft}
        </button>
      </section>
    );
  }

  const isModel = panel.draft.source === "model";
  return (
    <section className="panel" aria-labelledby="panel-title">
      <h3 id="panel-title">{fill(t.draftTitle, { client: panel.client })}</h3>
      <p className={`source source-${panel.draft.source}`}>
        <strong>{isModel ? t.sourceModel : t.sourceTemplate}</strong>
      </p>
      {panel.fellBack ? <p className="notice">{t.fallbackNotice}</p> : null}
      <dl className="draft">
        <dt>{t.subject}</dt>
        <dd>{panel.draft.subject}</dd>
        <dt>{t.body}</dt>
        <dd className="draft-body">{panel.draft.body}</dd>
      </dl>
      <PaymentLink lang={lang} link={panel.link} />
      {mailLive ? (
        <div className="field">
          <label htmlFor="recipient">{t.recipientLabel}</label>
          <input
            id="recipient"
            type="email"
            autoComplete="email"
            value={recipient}
            aria-describedby="recipient-help"
            onChange={(event) => onRecipient(event.target.value)}
          />
          <span id="recipient-help" className="muted">
            {t.recipientHelp}
          </span>
        </div>
      ) : null}
      <div className="panel-actions">
        <button type="button" className="btn" disabled={panel.sending} onClick={onSend}>
          {panel.sending ? t.sending : t.sendButton}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t.closeDraft}
        </button>
      </div>
    </section>
  );
}
