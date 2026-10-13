import type { MetadataRoute } from "next";
import { translate } from "@/game/i18n";
import { DEFAULT_LOCALE } from "@/game/i18n/types";

/** Installable web app: plays fullscreen in landscape, works offline after the first visit (public/sw.js). */
export default function manifest(): MetadataRoute.Manifest {
  const name = translate(DEFAULT_LOCALE, "app.title");
  return {
    name,
    short_name: name,
    description: translate(DEFAULT_LOCALE, "meta.description"),
    start_url: "/",
    scope: "/",
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    orientation: "landscape",
    background_color: "#02030a",
    theme_color: "#02030a",
    categories: ["games", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
