import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit, Great_Vibes } from "next/font/google";
import "./test-catalog.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-msa-display",
  display: "swap",
});

const sans = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-msa-sans",
  display: "swap",
});

const script = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-msa-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Melike Sevinç Art — Katalog (Test)",
  description: "Yeni katalog arayüzü önizlemesi",
  robots: { index: false, follow: false },
};

export default function TestCatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${display.variable} ${sans.variable} ${script.variable} msa-root`}
    >
      {children}
    </div>
  );
}
