import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "../tanidikalan/tanidikalan.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-tk-display",
  display: "swap",
});

const sans = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-tk-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Melike Sevinç — Selected Works",
  description:
    "Curated sculptural works by category. Mixed media, resin and real silver plating.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Melike Sevinç — Selected Works",
    description: "Sculpture · Mixed Media · Real Silver",
    type: "website",
  },
};

export default function NewCatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${display.variable} ${sans.variable} tk-root`}>
      <div className="tk-noise" aria-hidden />
      {children}
    </div>
  );
}
