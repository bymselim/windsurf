import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-verify-display",
  display: "swap",
});

const body = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-verify-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Verify Your Art | Melike Sevinc",
  description: "Certificate & serial verification · Sertifika ve seri numarası ile eser doğrulama",
};

export default function VerifyYourArtLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen antialiased bg-[#fafafa] text-[#3f3f46]`}
      style={{ fontFamily: "var(--font-verify-body), system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
