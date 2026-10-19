import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { dict } from "@/i18n/dictionary";
import { isLocale, LOCALES } from "@/i18n/locales";
import "../../styles/tokens.css";
import "../../styles/app.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : `http://localhost:${process.env.PORT ?? 3000}`;

export const dynamicParams = false;

export function generateStaticParams(): Array<{ lang: string }> {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const meta = dict[lang].meta;
  return { metadataBase: new URL(SITE_URL), title: meta.title, description: meta.description };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang} className={`${fraunces.variable} ${atkinson.variable}`}>
      <body>{children}</body>
    </html>
  );
}
