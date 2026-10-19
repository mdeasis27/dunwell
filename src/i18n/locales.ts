export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export const PORTFOLIO_URL = "https://portafolio-mdea.vercel.app";
export const REPO_URL = "https://github.com/mdeasis27/dunwell";

export function projectsUrl(lang: Locale): string {
  return `${PORTFOLIO_URL}/${lang}/projects`;
}

export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = values[key];
    return value === undefined ? whole : String(value);
  });
}
