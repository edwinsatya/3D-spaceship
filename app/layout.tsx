import type { Metadata, Viewport } from "next";
import { Exo_2, Orbitron } from "next/font/google";
import "./globals.css";

const exo = Exo_2({
  variable: "--font-exo",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Jelajah Angkasa 3D",
  description:
    "Terbangkan pesawatmu mengelilingi Bumi, lewati cincin orbit, dan jelajahi angkasa langsung dari browser — tanpa install.",
  applicationName: "Jelajah Angkasa 3D",
  keywords: ["game angkasa", "game 3D", "tata surya", "game edukasi", "browser game"],
  openGraph: {
    title: "Jelajah Angkasa 3D",
    description: "Game 3D eksplorasi luar angkasa di browser. Terbang, temukan, selesaikan misi!",
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jelajah Angkasa 3D",
    description: "Game 3D eksplorasi luar angkasa di browser.",
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
    <html lang="id" className={`${exo.variable} ${orbitron.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-space text-white">{children}</body>
    </html>
  );
}
