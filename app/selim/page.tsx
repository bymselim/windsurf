import type { Metadata } from "next";
import { SelimGate } from "@/components/SelimGate";

export const metadata: Metadata = {
  title: "VIP Giriş",
  robots: { index: false, follow: false },
};

export default function SelimGatePage() {
  return <SelimGate />;
}
