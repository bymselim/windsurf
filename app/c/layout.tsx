import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hızlı Mesajlar",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-snippet": 0,
      "max-image-preview": "none",
    },
  },
};

export default function CLayout({ children }: { children: React.ReactNode }) {
  return children;
}
