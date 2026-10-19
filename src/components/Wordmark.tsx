import { dict } from "../i18n/dictionary";
import type { Locale } from "../i18n/locales";

/** "dunwell" with three rising bars: the reminder stages getting firmer. */
export function Wordmark({ lang }: { readonly lang: Locale }) {
  return (
    <a className="wordmark" href={`/${lang}/app`} aria-label={dict[lang].nav.home}>
      <span>
        dun<span className="w">w</span>ell
      </span>
      <svg viewBox="0 0 22 16" aria-hidden="true" focusable="false">
        <rect x="0" y="10" width="6" height="6" fill="currentColor" />
        <rect x="8" y="5" width="6" height="11" fill="currentColor" />
        <rect x="16" y="0" width="6" height="16" fill="currentColor" />
      </svg>
    </a>
  );
}
