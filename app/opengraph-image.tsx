import { ImageResponse } from "next/og";
import { DEFAULT_LOCALE, translate } from "@/game/i18n";

export const alt = translate(DEFAULT_LOCALE, "meta.ogAlt");
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STARS = Array.from({ length: 70 }, (_, i) => ({
  left: (i * 137.5) % 1200,
  top: (i * 89.3) % 630,
  size: i % 7 === 0 ? 4 : 2,
  opacity: 0.35 + ((i * 31) % 60) / 100,
}));

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "radial-gradient(ellipse at 30% 20%, #1b1450 0%, #070b1f 45%, #02030a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {STARS.map((star, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              borderRadius: star.size,
              background: "white",
              opacity: star.opacity,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            right: -180,
            bottom: -420,
            width: 900,
            height: 900,
            borderRadius: 900,
            background: "radial-gradient(circle at 35% 30%, #5fb7ff 0%, #1f5fb8 40%, #0b2350 70%, #050b1c 100%)",
            boxShadow: "0 0 120px 30px rgba(77,166,255,0.45)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 220,
            top: 120,
            width: 230,
            height: 230,
            borderRadius: 230,
            border: "14px solid #ffd84d",
            boxShadow: "0 0 60px 10px rgba(255,216,77,0.6)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px", gap: 24 }}>
          <div style={{ fontSize: 30, letterSpacing: 8, color: "#7df9ff", textTransform: "uppercase" }}>
            {translate(DEFAULT_LOCALE, "meta.ogKicker")}
          </div>
          <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.05, maxWidth: 640 }}>
            {translate(DEFAULT_LOCALE, "app.title")}
          </div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.85)", maxWidth: 620 }}>
            {translate(DEFAULT_LOCALE, "meta.ogBody")}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
