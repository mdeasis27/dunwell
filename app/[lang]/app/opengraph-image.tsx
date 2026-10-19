import { ImageResponse } from "next/og";
import { dict } from "@/i18n/dictionary";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/locales";

export const alt = "Dunwell";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = dict[isLocale(lang) ? lang : DEFAULT_LOCALE];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "72px",
        background: "#faf6ef",
        color: "#1f1b16",
        fontFamily: "Georgia, serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
        <div style={{ fontSize: 132, fontWeight: 700, display: "flex" }}>
          dun<span style={{ color: "#8a3b12" }}>w</span>ell
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 28, height: 28, background: "#8a3b12" }} />
          <div style={{ width: 28, height: 52, background: "#8a3b12" }} />
          <div style={{ width: 28, height: 76, background: "#8a3b12" }} />
        </div>
      </div>
      <div style={{ fontSize: 44, marginTop: 24, maxWidth: 980, display: "flex" }}>
        {d.hero.oneLine}
      </div>
    </div>,
    size,
  );
}
