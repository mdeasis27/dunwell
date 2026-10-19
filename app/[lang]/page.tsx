import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/locales";

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryString(params: SearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) for (const v of value) query.append(key, v);
    else if (value !== undefined) query.append(key, value);
  }
  const text = query.toString();
  return text === "" ? "" : `?${text}`;
}

export default async function LangIndex({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(`/${lang}/app${toQueryString(await searchParams)}`);
}
