"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Eski URL — yeni düzenleyici /vadmin/verify-page */
export default function VadminVerifyDeclarationRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/vadmin/verify-page");
  }, [router]);
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
      Yönlendiriliyor…
    </div>
  );
}
