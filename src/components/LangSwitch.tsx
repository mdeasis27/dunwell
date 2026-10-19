"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { dict } from "../i18n/dictionary";
import { fill, LOCALES, type Locale } from "../i18n/locales";

function Links({ lang }: { readonly lang: Locale }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const d = dict[lang].nav;
  const rest = pathname.split("/").slice(2).join("/");
  return (
    <nav className="lang-switch" aria-label={d.language}>
      {LOCALES.map((code) => {
        const name = code === "en" ? d.english : d.spanish;
        const href = `/${code}/${rest}${search ? `?${search}` : ""}`;
        const current = code === lang;
        return (
          <a
            key={code}
            href={href}
            lang={code}
            hrefLang={code}
            aria-current={current ? "true" : undefined}
            aria-label={current ? name : fill(d.switchTo, { name })}
          >
            {code.toUpperCase()}
          </a>
        );
      })}
    </nav>
  );
}

export function LangSwitch({ lang }: { readonly lang: Locale }) {
  return (
    <Suspense fallback={null}>
      <Links lang={lang} />
    </Suspense>
  );
}
