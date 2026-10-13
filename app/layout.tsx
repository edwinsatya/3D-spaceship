import type { Metadata, Viewport } from "next";
import { Exo_2, Orbitron } from "next/font/google";
import { DEFAULT_LOCALE, LOCALE_TAGS, translate } from "@/game/i18n";
import "./globals.css";

const exo = Exo_2({
  variable: "--font-exo",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const title = translate(DEFAULT_LOCALE, "app.title");
const shareDescription = translate(DEFAULT_LOCALE, "meta.shareDescription");

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
  ),
  title,
  description: translate(DEFAULT_LOCALE, "meta.description"),
  applicationName: title,
  keywords: [
    "space game",
    "3D game",
    "solar system",
    "educational game",
    "browser game",
  ],
  openGraph: {
    title,
    description: shareDescription,
    type: "website",
    locale: LOCALE_TAGS[DEFAULT_LOCALE].openGraph,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: shareDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#02030a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={LOCALE_TAGS[DEFAULT_LOCALE].bcp47}
      className={`${exo.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-space text-white">
        {children}
      </body>
    </html>
  );
}
