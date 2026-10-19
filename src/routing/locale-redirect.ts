import { DEFAULT_LOCALE, isLocale } from "../i18n/locales";

const LOCALE_SHAPE = /^[a-z]{2}(-[a-z]{2})?$/i;

/**
 * Returns the path to redirect to, or null when the request should pass through.
 * - first segment is a known locale: pass through
 * - first segment looks like a locale tag but is unknown: pass through, the layout answers 404
 * - anything else (including "/"): prefix the default locale, keeping the query string
 */
export function localeRedirect(pathname: string, search: string): string | null {
  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) return null;
  if (LOCALE_SHAPE.test(first)) return null;
  const path = pathname === "/" ? "" : pathname;
  return `/${DEFAULT_LOCALE}${path}${search}`;
}
