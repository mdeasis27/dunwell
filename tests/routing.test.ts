import { describe, expect, test } from "bun:test";
import { localeRedirect } from "../src/routing/locale-redirect";

describe("localeRedirect", () => {
  test("root goes to /en", () => {
    expect(localeRedirect("/", "")).toBe("/en");
  });
  test("keeps the query string", () => {
    expect(localeRedirect("/", "?today=2026-10-19")).toBe("/en?today=2026-10-19");
    expect(localeRedirect("/app", "?x=1")).toBe("/en/app?x=1");
  });
  test("known locales pass through", () => {
    expect(localeRedirect("/en/app", "")).toBeNull();
    expect(localeRedirect("/es", "")).toBeNull();
  });
  test("unknown locale tags pass through so the layout can answer 404", () => {
    expect(localeRedirect("/fr/app", "")).toBeNull();
    expect(localeRedirect("/xx", "")).toBeNull();
  });
  test("other paths get the default locale", () => {
    expect(localeRedirect("/foo/bar", "")).toBe("/en/foo/bar");
  });
});
