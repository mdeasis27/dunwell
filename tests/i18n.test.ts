import { describe, expect, test } from "bun:test";
import { type Dictionary, dict } from "../src/i18n/dictionary";
import { fill, isLocale, LOCALES, projectsUrl } from "../src/i18n/locales";

const VENDOR_NAMES = [
  "stripe",
  "resend",
  "gemini",
  "groq",
  "openrouter",
  "openai",
  "anthropic",
  "claude",
  "google",
  "vercel",
  "paypal",
];

function leaves(value: unknown, path = ""): Array<[string, string]> {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [];
}

describe("dictionary", () => {
  test("es has exactly the same key paths as en, all non-empty", () => {
    const en = leaves(dict.en).map(([p]) => p);
    const es = leaves(dict.es);
    expect(es.map(([p]) => p)).toEqual(en);
    for (const [path, text] of es) expect(text.trim().length, path).toBeGreaterThan(0);
  });

  test("placeholders match between locales", () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    const es = new Map(leaves(dict.es));
    for (const [path, text] of leaves(dict.en)) {
      expect(placeholders(es.get(path) ?? ""), path).toEqual(placeholders(text));
    }
  });

  test("copy has no em dashes and no vendor names", () => {
    for (const locale of LOCALES) {
      for (const [path, text] of leaves(dict[locale])) {
        expect(text.includes("—"), `${locale}.${path} em dash`).toBe(false);
        for (const name of VENDOR_NAMES) {
          expect(text.toLowerCase().includes(name), `${locale}.${path} mentions ${name}`).toBe(
            false,
          );
        }
      }
    }
  });

  test("glossary has 3 to 5 terms", () => {
    for (const locale of LOCALES) {
      const d: Dictionary = dict[locale];
      expect(d.analogy.terms.length).toBeGreaterThanOrEqual(3);
      expect(d.analogy.terms.length).toBeLessThanOrEqual(5);
    }
  });

  test("a template exists for every stage and locale", () => {
    for (const locale of LOCALES) {
      for (const stage of ["heads_up", "friendly", "firm", "final", "escalate"] as const) {
        const t = dict[locale].drafts.templates[stage];
        expect(t.body).toContain("{link}");
        expect(t.subject).toContain("{invoice}");
      }
    }
  });
});

describe("locales", () => {
  test("isLocale and projectsUrl", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(projectsUrl("es")).toBe("https://portafolio-mdea.vercel.app/es/projects");
  });
  test("fill leaves unknown placeholders alone", () => {
    expect(fill("a {x} {y}", { x: 1 })).toBe("a 1 {y}");
  });
});
